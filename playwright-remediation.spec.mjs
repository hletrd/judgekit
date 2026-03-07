import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const LOGIN_USERNAME = 'pwadmin_runtime';
const INITIAL_PASSWORD = 'admin123';
const UPDATED_PASSWORD = 'AdminPass234';

test('problem editor and group creation flows work', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const suffix = Date.now().toString().slice(-6);

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('#username', LOGIN_USERNAME);
  await page.fill('#password', INITIAL_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|change-password)/, { timeout: 15000 });

  if (page.url().includes('/change-password')) {
    await page.fill('#currentPassword', INITIAL_PASSWORD);
    await page.fill('#newPassword', UPDATED_PASSWORD);
    await page.fill('#confirmPassword', UPDATED_PASSWORD);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  } else {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  const problemTitle = `Playwright Problem ${suffix}`;
  await page.goto('/dashboard/problems/create', { waitUntil: 'networkidle' });
  await page.fill('#title', problemTitle);
  await page.fill('#description', 'Verify create and edit flows with managed test cases.');
  await page.locator('#visibility').click();
  await page.getByRole('option', { name: 'Public' }).click();
  await page.getByRole('button', { name: 'Add Test Case' }).click();
  await page.locator('#test-case-input-0').fill('1 2\n');
  await page.locator('#test-case-output-0').fill('3\n');
  await page.getByRole('button', { name: 'Add Test Case' }).click();
  await page.locator('#test-case-input-1').fill('5 8\n');
  await page.locator('#test-case-output-1').fill('13\n');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard\/problems\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByText(problemTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

  const problemId = page.url().split('/').pop();
  if (!problemId) {
    throw new Error('Problem id missing after create redirect');
  }

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForURL(`**/dashboard/problems/${problemId}/edit`, { timeout: 15000 });
  await page.locator('#test-case-output-0').fill('4\n');
  await page.getByRole('button', { name: 'Remove' }).nth(1).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForURL(`**/dashboard/problems/${problemId}`, { timeout: 15000 });
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForURL(`**/dashboard/problems/${problemId}/edit`, { timeout: 15000 });
  await expect(page.locator('#test-case-output-0')).toHaveValue('4\n');
  await expect(page.locator('#test-case-output-1')).toHaveCount(0);

  const guestContext = await browser.newContext({ baseURL: BASE_URL });
  const guestPage = await guestContext.newPage();
  await guestPage.goto('/login', { waitUntil: 'networkidle' });
  const guestProblemRead = await guestPage.evaluate(async (id) => {
    const response = await fetch(`/api/v1/problems/${id}`);
    const body = await response.json();
    return { status: response.status, body };
  }, problemId);
  expect(guestProblemRead.status).toBe(401);
  await guestContext.close();

  await page.goto(`/dashboard/problems/${problemId}`, { waitUntil: 'networkidle' });
  await page.fill('#sourceCode', 'a, b = map(int, input().split())\nprint(a + b)\n');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.waitForURL(/\/dashboard\/submissions\/[^/]+$/, { timeout: 15000 });

  await page.goto(`/dashboard/problems/${problemId}/edit`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Test cases are locked because this problem already has submissions.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Test Case' })).toBeDisabled();

  const lockedPatch = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/problems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testCases: [{ input: '1\n', expectedOutput: '1\n', isVisible: false }],
      }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }, problemId);

  expect(lockedPatch.status).toBe(409);
  expect(lockedPatch.body.error).toBe('testCasesLocked');

  const groupName = `Playwright Group ${suffix}`;
  await page.goto('/dashboard/groups', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create Group' }).click();
  const groupDialog = page.getByRole('dialog', { name: 'Create Group' });
  await groupDialog.getByLabel('Group Name').fill(groupName);
  await groupDialog.getByLabel('Description').fill('Created by automated remediation smoke test.');
  await groupDialog.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL(/\/dashboard\/groups\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: groupName })).toBeVisible();

  await context.close();
});
