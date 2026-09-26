import { expect, test } from '@playwright/test';

test('signed-out visitors can reach the Growth Club invitation', async ({ page }) => {
  await page.goto('/community');
  await expect(page.getByText(/Bold Ideas Growth Club/i).first()).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});

test('authenticated fixture can enter the member community', async ({ page }) => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    'test account not configured',
  );
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.goto('/community');
  await expect(page).toHaveURL(/\/community/);
});
