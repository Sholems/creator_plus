import { expect, test } from '@playwright/test';
import { needCreds, needAdmin, login, loginAdmin } from './helpers';

test('a non-admin member cannot operate the management surface', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/manage');
  // Either redirected away, or shown a no-access notice — never the admin tools.
  await expect(page.getByText(/don't have access|not authoriz|sign in/i).first()).toBeVisible();
});

test('an admin can reach the management shell', async ({ page }) => {
  test.skip(needAdmin(), 'admin account not configured');
  await loginAdmin(page);
  await page.goto('/community/manage');
  await expect(page).toHaveURL(/\/community\/manage/);
  await expect(page.getByRole('heading', { name: /manage|classroom|growth club/i }).first()).toBeVisible();
});
