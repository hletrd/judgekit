import { test, expect } from '@playwright/test';

const LOGIN_USERNAME = 'pwadmin_runtime';
const INITIAL_ADMIN_PASSWORD = 'admin123';
const UPDATED_ADMIN_PASSWORD = 'AdminPass234';
const PASSWORD_ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

test('admin can change password, see sample problems, and create a user with generated password', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  async function signIn(password) {
    const csrfResponse = await context.request.get('/api/auth/csrf');
    expect(csrfResponse.ok()).toBeTruthy();

    const { csrfToken } = await csrfResponse.json();
    const callbackUrl = `${BASE_URL}/dashboard`;
    const response = await context.request.post('/api/auth/callback/credentials?json=true', {
      form: {
        csrfToken,
        username: LOGIN_USERNAME,
        password,
        callbackUrl,
        redirectTo: callbackUrl,
        json: 'true',
      },
    });

    expect(response.ok()).toBeTruthy();
  }

  await signIn(INITIAL_ADMIN_PASSWORD);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  let currentUrl = page.url();

  if (currentUrl.includes('/change-password')) {
    await page.fill('#currentPassword', INITIAL_ADMIN_PASSWORD);
    await page.fill('#newPassword', UPDATED_ADMIN_PASSWORD);
    await page.fill('#confirmPassword', UPDATED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  } else {
    expect(currentUrl).toContain('/dashboard');
  }

  await page.goto('/dashboard/problems', { waitUntil: 'networkidle' });
  for (const title of ['A+B', 'A-B', 'A*B', 'Fibonacci', 'Factorial']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }

  await page.goto('/dashboard/admin/users', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add User' }).click();

  const suffix = Date.now().toString().slice(-8);
  const username = `pwtest${suffix}`;
  const className = `Class-${suffix.slice(-2)}`;
  await page.fill('#new-username', username);
  await page.fill('#new-name', `Playwright ${suffix}`);
  await page.fill('#new-className', className);
  await page.fill('#new-email', `${username}@example.com`);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('Copy the generated password')).toBeVisible();
  const generatedPassword = await page.locator('#generated-password').inputValue();
  expect(generatedPassword).toHaveLength(16);
  expect(PASSWORD_ALPHABET.test(generatedPassword)).toBeTruthy();

  const clipboardText = await page.evaluate(async () => navigator.clipboard.readText());
  expect(clipboardText).toBe(generatedPassword);

  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(username, { exact: true })).toBeVisible();
  await expect(page.getByText(className, { exact: true })).toBeVisible();

  await context.close();
});
