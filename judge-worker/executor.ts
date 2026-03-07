import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { compareOutput } from "./comparator";
import { getJudgeAuthToken, getJudgePollUrl } from "./config";
import { LANGUAGE_CONFIGS } from "./languages";

const EXECUTION_CPU_LIMIT = "1";
const MIN_MEMORY_LIMIT_MB = 16;
const COMPILATION_MEMORY_LIMIT_MB = 512;
const COMPILATION_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 100;
const CONTAINER_TMPFS = "/tmp:rw,noexec,nosuid,size=64m";
const SECCOMP_PROFILE_PATH = path.resolve(process.cwd(), "docker/seccomp-profile.json");

export interface Submission {
  id: string;
  language: string;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
  }>;
}

export interface TestResult {
  testCaseId: string;
  status: string;
  actualOutput: string;
  executionTimeMs: number;
  memoryUsedKb: number;
}

type DockerCommandOptions = {
  image: string;
  workspaceDir: string;
  command: string[];
  input?: string;
  timeoutMs: number;
  memoryLimitMb: number;
};

type DockerCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  oomKilled: boolean;
  durationMs: number;
};

function getMemoryLimitMb(memoryLimitMb: number) {
  return Math.max(MIN_MEMORY_LIMIT_MB, Math.trunc(memoryLimitMb || MIN_MEMORY_LIMIT_MB));
}

function getWorkspaceSourcePath(workspaceDir: string, extension: string) {
  return path.join(workspaceDir, `solution${extension}`);
}

function getMemoryUsageKb(memoryLimitMb: number, oomKilled: boolean) {
  return oomKilled ? getMemoryLimitMb(memoryLimitMb) * 1024 : 0;
}

function getFinalSubmissionStatus(results: TestResult[]) {
  if (results.length === 0) {
    return "accepted";
  }

  const failedResult = results.find((result) => result.status !== "accepted");
  return failedResult?.status ?? "accepted";
}

async function runShellCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

async function inspectContainerOomKilled(containerName: string) {
  try {
    const result = await runShellCommand("docker", [
      "inspect",
      "--format",
      "{{json .State.OOMKilled}}",
      containerName,
    ]);

    return result.stdout.trim() === "true";
  } catch (error) {
    console.error(`Failed to inspect container ${containerName}:`, error);
    return false;
  }
}

async function killContainer(containerName: string) {
  try {
    await runShellCommand("docker", ["kill", containerName]);
  } catch (error) {
    console.error(`Failed to kill container ${containerName}:`, error);
  }
}

async function removeContainer(containerName: string) {
  try {
    await runShellCommand("docker", ["rm", "-f", containerName]);
  } catch (error) {
    console.error(`Failed to remove container ${containerName}:`, error);
  }
}

async function runDockerCommand(options: DockerCommandOptions): Promise<DockerCommandResult> {
  const containerName = `oj-${randomUUID()}`;
  const dockerArgs = [
    "run",
    "--name",
    containerName,
    "--network",
    "none",
    "--memory",
    `${getMemoryLimitMb(options.memoryLimitMb)}m`,
    "--cpus",
    EXECUTION_CPU_LIMIT,
    "--pids-limit",
    "16",
    "--read-only",
    "--tmpfs",
    CONTAINER_TMPFS,
    "-v",
    `${options.workspaceDir}:/workspace`,
    "-w",
    "/workspace",
    "--security-opt",
    `seccomp=${SECCOMP_PROFILE_PATH}`,
  ];

  if (options.input !== undefined) {
    dockerArgs.push("-i");
  }

  dockerArgs.push(options.image, ...options.command);

  const startedAt = Date.now();

  return new Promise<DockerCommandResult>((resolve, reject) => {
    const child = spawn("docker", dockerArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      void killContainer(containerName);
    }, Math.max(MIN_TIMEOUT_MS, options.timeoutMs));

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", async (error) => {
      clearTimeout(timeoutHandle);
      await removeContainer(containerName);
      reject(error);
    });

    child.on("close", async (exitCode) => {
      clearTimeout(timeoutHandle);
      const oomKilled = await inspectContainerOomKilled(containerName);
      await removeContainer(containerName);

      resolve({
        stdout,
        stderr,
        exitCode,
        timedOut,
        oomKilled,
        durationMs: Date.now() - startedAt,
      });
    });

    if (options.input !== undefined) {
      child.stdin.write(options.input);
    }

    child.stdin.end();
  });
}

export async function executeSubmission(submission: Submission): Promise<void> {
  const config = LANGUAGE_CONFIGS[submission.language];
  if (!config) {
    await reportResult(submission.id, "compile_error", "Unsupported language", []);
    return;
  }

  await reportSubmissionStatus(submission.id, "judging");

  const workspaceDir = await mkdtemp(path.join(tmpdir(), "online-judge-"));
  let compileOutput = "";

  try {
    await chmod(workspaceDir, 0o777);
    await writeFile(
      getWorkspaceSourcePath(workspaceDir, config.extension),
      submission.sourceCode,
      "utf8"
    );

    if (config.compileCommand) {
      const compilation = await runDockerCommand({
        image: config.dockerImage,
        workspaceDir,
        command: config.compileCommand,
        timeoutMs: Math.max(COMPILATION_TIMEOUT_MS, submission.timeLimitMs * 5),
        memoryLimitMb: Math.max(COMPILATION_MEMORY_LIMIT_MB, submission.memoryLimitMb),
      });

      compileOutput = [compilation.stdout, compilation.stderr].filter(Boolean).join("\n").trim();

      if (compilation.timedOut) {
        await reportResult(submission.id, "compile_error", "Compilation timed out", []);
        return;
      }

      if (compilation.oomKilled || compilation.exitCode !== 0) {
        await reportResult(
          submission.id,
          "compile_error",
          compileOutput || "Compilation failed",
          []
        );
        return;
      }
    }

    const results: TestResult[] = [];

    for (const testCase of submission.testCases) {
      const execution = await runDockerCommand({
        image: config.dockerImage,
        workspaceDir,
        command: config.runCommand,
        input: testCase.input,
        timeoutMs: Math.max(MIN_TIMEOUT_MS, submission.timeLimitMs),
        memoryLimitMb: submission.memoryLimitMb,
      });

      let status = "accepted";

      if (execution.timedOut) {
        status = "time_limit";
      } else if (execution.oomKilled || execution.exitCode === 137) {
        status = "memory_limit";
      } else if ((execution.exitCode ?? 1) !== 0) {
        status = "runtime_error";
      } else if (!compareOutput(testCase.expectedOutput, execution.stdout)) {
        status = "wrong_answer";
      }

      results.push({
        testCaseId: testCase.id,
        status,
        actualOutput: execution.stdout,
        executionTimeMs: execution.durationMs,
        memoryUsedKb: getMemoryUsageKb(submission.memoryLimitMb, execution.oomKilled),
      });

      if (status !== "accepted") {
        break;
      }
    }

    await reportResult(submission.id, getFinalSubmissionStatus(results), compileOutput, results);
  } catch (error) {
    console.error(`Failed to execute submission ${submission.id}:`, error);
    await reportResult(
      submission.id,
      "runtime_error",
      error instanceof Error ? error.message : "Judge execution failed",
      []
    );
  } finally {
    await rm(workspaceDir, { force: true, recursive: true });
  }
}

async function reportResult(
  submissionId: string,
  status: string,
  compileOutput: string,
  results: TestResult[]
) {
  const pollUrl = getJudgePollUrl();
  const authToken = getJudgeAuthToken();

  try {
    const response = await fetch(pollUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId, status, compileOutput, results }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Failed to report result:", response.status, responseText);
    }
  } catch (error) {
    console.error("Failed to report result:", error);
  }
}

async function reportSubmissionStatus(submissionId: string, status: string) {
  const pollUrl = getJudgePollUrl();
  const authToken = getJudgeAuthToken();

  try {
    const response = await fetch(pollUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId, status }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Failed to report submission status:", response.status, responseText);
    }
  } catch (error) {
    console.error("Failed to report submission status:", error);
  }
}
