import { LANGUAGE_CONFIGS, type LanguageConfig } from "./languages";
import { compareOutput } from "./comparator";

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

export async function executeSubmission(submission: Submission): Promise<void> {
  const config = LANGUAGE_CONFIGS[submission.language];
  if (!config) {
    await reportResult(submission.id, "compile_error", "Unsupported language", []);
    return;
  }

  // TODO: Implement Docker container lifecycle
  // 1. Create ephemeral container with no network, resource limits, seccomp
  // 2. Copy source code into container
  // 3. Compile (if needed)
  // 4. Run per test case with stdin, capture stdout
  // 5. Compare output
  // 6. Cleanup container

  console.log(`TODO: Execute submission ${submission.id} in ${submission.language}`);
}

async function reportResult(
  submissionId: string,
  status: string,
  compileOutput: string,
  results: TestResult[]
) {
  const POLL_URL = process.env.JUDGE_POLL_URL || "http://localhost:3000/api/judge/poll";
  const AUTH_TOKEN = process.env.JUDGE_AUTH_TOKEN || "";

  try {
    await fetch(POLL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId, status, compileOutput, results }),
    });
  } catch (error) {
    console.error("Failed to report result:", error);
  }
}
