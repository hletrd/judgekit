import { expect, test } from "@playwright/test";

test("health endpoint reports database readiness", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);

  const payload = await response.json();

  expect(payload).toEqual({
    checks: {
      database: "ok",
    },
    status: "ok",
    timestamp: expect.any(String),
  });
});
