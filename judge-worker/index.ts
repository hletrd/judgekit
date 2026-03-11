import { getJudgeAuthToken, getJudgePollIntervalMs, getJudgePollUrl } from "./config";
import type { Submission } from "./executor";

const POLL_URL = getJudgePollUrl();
const POLL_INTERVAL = getJudgePollIntervalMs();
const AUTH_TOKEN = getJudgeAuthToken();

if (POLL_URL.startsWith("http://") && !POLL_URL.startsWith("http://localhost") && !POLL_URL.startsWith("http://127.0.0.1") && !POLL_URL.startsWith("http://[::1]")) {
  console.warn(
    "WARNING: JUDGE_POLL_URL uses unencrypted HTTP for a non-localhost address. " +
    "This exposes the auth token and submission data in transit. Use HTTPS in production."
  );
}

let isPolling = false;

async function pollForSubmissions() {
  if (isPolling) {
    return;
  }

  isPolling = true;

  try {
    const response = await fetch(POLL_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Poll failed: ${response.status}`);
      return;
    }

    const payload = (await response.json()) as { data: Submission | null };
    const submission = payload.data;

    if (submission) {
      console.log(`Processing submission ${submission.id}`);
      const { executeSubmission } = await import("./executor");
      await executeSubmission(submission);
    }
  } catch (error) {
    console.error("Poll error:", error);
  } finally {
    isPolling = false;
    setTimeout(pollForSubmissions, POLL_INTERVAL);
  }
}

async function main() {
  console.log("Judge worker started");
  console.log(`Polling ${POLL_URL} every ${POLL_INTERVAL}ms`);

  await pollForSubmissions();
}

main().catch((error) => {
  console.error("Judge worker failed to start:", error);
  process.exit(1);
});
