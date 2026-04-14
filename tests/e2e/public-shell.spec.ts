import { test, expect } from "@playwright/test";

test.describe("Public shell", () => {
  test("guest can open the public home page", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /JudgeKit|구조/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Practice|연습/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Community|커뮤니티/i })).toBeVisible();
  });

  test("guest is redirected to login when opening workspace", async ({ page }) => {
    await page.goto("/workspace", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("guest can open the public playground route", async ({ page }) => {
    await page.goto("/playground", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /Public playground|공개 플레이그라운드/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Run code|실행/i })).toBeVisible();
  });

  test("guest can open the public practice catalog", async ({ page }) => {
    await page.goto("/practice", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /Public problem catalog|공개 문제 카탈로그/i })).toBeVisible();
  });

  test("guest can open the community board", async ({ page }) => {
    await page.goto("/community", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /Community board|커뮤니티 게시판/i })).toBeVisible();
  });
});
