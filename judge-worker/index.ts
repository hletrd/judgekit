const POLL_URL = process.env.JUDGE_POLL_URL || "http://localhost:3000/api/judge/poll";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "2000");
const AUTH_TOKEN = process.env.JUDGE_AUTH_TOKEN || "";

async function pollForSubmissions() {
  try {
    const response = await fetch(POLL_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Poll failed: ${response.status}`);
      }
      return;
    }

    const submission = await response.json();
    if (submission) {
      console.log(`Processing submission ${submission.id}`);
      const { executeSubmission } = await import("./executor");
      await executeSubmission(submission);
    }
  } catch (error) {
    console.error("Poll error:", error);
  }
}

async function main() {
  console.log("Judge worker started");
  console.log(`Polling ${POLL_URL} every ${POLL_INTERVAL}ms`);

  setInterval(pollForSubmissions, POLL_INTERVAL);
}

main();
