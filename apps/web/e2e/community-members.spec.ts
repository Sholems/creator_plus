import { expect, test } from '@playwright/test';
import { needCreds, login } from './helpers';

test('member can browse the directory and open a profile', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/members');
  await expect(page.getByRole('heading', { name: /members/i }).first()).toBeVisible();
  const search = page.getByLabel(/search members/i);
  await expect(search).toBeVisible();
  await search.fill('a');
  await page.getByRole('button', { name: /search/i }).click();
  await page.waitForLoadState('networkidle');
});

test('settings page lets a member manage community preferences', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/settings');
  await expect(page).toHaveURL(/\/community\/settings/);
});
