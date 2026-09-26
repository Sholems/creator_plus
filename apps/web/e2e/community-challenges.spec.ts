import { expect, test } from '@playwright/test';
import { needCreds, login } from './helpers';

test('member can open the challenges list', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/challenges');
  await expect(page).toHaveURL(/\/community\/challenges/);
  const firstChallenge = page.locator('a[href^="/community/challenge/"]').first();
  if ((await firstChallenge.count()) > 0) {
    await firstChallenge.click();
    await expect(page).toHaveURL(/\/community\/challenge\//);
  }
});
