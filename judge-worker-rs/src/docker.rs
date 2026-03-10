use std::path::Path;
use std::time::Instant;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

const EXECUTION_CPU_LIMIT: &str = "1";
const MIN_MEMORY_LIMIT_MB: u32 = 16;
const CONTAINER_TMPFS: &str = "/tmp:rw,noexec,nosuid,size=64m";
const MIN_TIMEOUT_MS: u64 = 100;

const SECCOMP_INIT_ERROR_SNIPPETS: &[&str] = &[
    "OCI runtime create failed",
    "error during container init",
    "fsmount:fscontext:proc: operation not permitted",
];

pub struct DockerRunOptions {
    pub image: String,
    pub workspace_dir: String,
    pub command: Vec<String>,
    pub phase: Phase,
    pub input: Option<String>,
    pub timeout_ms: u64,
    pub memory_limit_mb: u32,
    pub read_only_workspace: bool,
}

#[derive(PartialEq)]
pub enum Phase {
    Compile,
    Run,
}

pub struct DockerRunResult {
    pub stdout: Vec<u8>,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub timed_out: bool,
    pub oom_killed: bool,
    pub duration_ms: u64,
}

pub struct JudgeEnvironmentError(pub String);

fn get_memory_limit_mb(limit: u32) -> u32 {
    limit.max(MIN_MEMORY_LIMIT_MB)
}

async fn inspect_oom_killed(container_name: &str) -> bool {
    let result = tokio::process::Command::new("docker")
        .args(["inspect", "--format", "{{json .State.OOMKilled}}", container_name])
        .output()
        .await;

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.trim() == "true"
        }
        Err(_) => false,
    }
}

async fn kill_container(container_name: &str) {
    let _ = tokio::process::Command::new("docker")
        .args(["kill", container_name])
        .output()
        .await;
}

async fn remove_container(container_name: &str) {
    let _ = tokio::process::Command::new("docker")
        .args(["rm", "-f", container_name])
        .output()
        .await;
}

fn should_retry_without_seccomp(stderr: &str) -> bool {
    SECCOMP_INIT_ERROR_SNIPPETS.iter().all(|snippet| stderr.contains(snippet))
}

async fn run_docker_once(
    options: &DockerRunOptions,
    seccomp_profile: Option<&Path>,
) -> Result<DockerRunResult, String> {
    let container_name = format!("oj-{}", Uuid::new_v4());
    let mem_limit = get_memory_limit_mb(options.memory_limit_mb);
    let pids_limit = if options.read_only_workspace { "4" } else { "16" };

    let workspace_volume = if options.read_only_workspace {
        format!("{}:/workspace:ro", options.workspace_dir)
    } else {
        format!("{}:/workspace", options.workspace_dir)
    };

    let mut args: Vec<String> = vec![
        "run".into(),
        "--name".into(),
        container_name.clone(),
        "--network".into(),
        "none".into(),
        "--memory".into(),
        format!("{}m", mem_limit),
        "--cpus".into(),
        EXECUTION_CPU_LIMIT.into(),
        "--pids-limit".into(),
        pids_limit.into(),
        "--read-only".into(),
        "--tmpfs".into(),
        CONTAINER_TMPFS.into(),
        "--cap-drop=ALL".into(),
        "--security-opt=no-new-privileges".into(),
        "--ulimit".into(),
        "fsize=52428800:52428800".into(),
        "--ulimit".into(),
        "nofile=64:64".into(),
        "-v".into(),
        workspace_volume,
        "-w".into(),
        "/workspace".into(),
    ];

    if let Some(profile) = seccomp_profile {
        args.push(format!("--security-opt=seccomp={}", profile.display()));
    }

    if options.input.is_some() {
        args.push("-i".into());
    }

    args.push(options.image.clone());
    for part in &options.command {
        args.push(part.clone());
    }

    let mut child = tokio::process::Command::new("docker")
        .args(&args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn docker: {e}"))?;

    if let Some(ref input) = options.input {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(input.as_bytes()).await;
            drop(stdin);
        }
    }

    let timeout_duration =
        std::time::Duration::from_millis(options.timeout_ms.max(MIN_TIMEOUT_MS));
    let start = Instant::now();

    match tokio::time::timeout(timeout_duration, child.wait_with_output()).await {
        Ok(Ok(output)) => {
            let exit_code = output.status.code();
            let duration_ms = start.elapsed().as_millis() as u64;
            let oom_killed = inspect_oom_killed(&container_name).await;
            remove_container(&container_name).await;
            let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
            return Ok(DockerRunResult {
                stdout: output.stdout,
                stderr,
                exit_code,
                timed_out: false,
                oom_killed,
                duration_ms,
            });
        }
        Ok(Err(e)) => {
            kill_container(&container_name).await;
            remove_container(&container_name).await;
            return Err(format!("Docker process error: {e}"));
        }
        Err(_) => {
            // Timeout path — timed_out is always true here
        }
    }

    let duration_ms = start.elapsed().as_millis() as u64;
    kill_container(&container_name).await;
    let oom_killed = inspect_oom_killed(&container_name).await;
    remove_container(&container_name).await;

    Ok(DockerRunResult {
        stdout: Vec::new(),
        stderr: String::new(),
        exit_code: None,
        timed_out: true,
        oom_killed,
        duration_ms,
    })
}

pub async fn run_docker(
    options: &DockerRunOptions,
    seccomp_profile_path: &Path,
    disable_custom_seccomp: bool,
) -> Result<DockerRunResult, JudgeEnvironmentError> {
    let use_custom_seccomp = options.phase == Phase::Run && !disable_custom_seccomp;

    let seccomp_profile = if use_custom_seccomp {
        if !seccomp_profile_path.exists() {
            return Err(JudgeEnvironmentError(format!(
                "Seccomp profile not found: {}",
                seccomp_profile_path.display()
            )));
        }
        Some(seccomp_profile_path)
    } else {
        None
    };

    let result = run_docker_once(options, seccomp_profile)
        .await
        .map_err(|e| JudgeEnvironmentError(e))?;

    if use_custom_seccomp && should_retry_without_seccomp(&result.stderr) {
        return Err(JudgeEnvironmentError(
            "refusing to retry without custom seccomp".into(),
        ));
    }

    Ok(result)
}
