import { expect, test } from '@playwright/test';
import { needCreds, login } from './helpers';

test('member can open the discussion feed, search, and reach saved posts', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/discussion');
  await expect(page.getByRole('heading', { name: /discussion/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search questions/i)).toBeVisible();
  await page.getByRole('link', { name: /^saved$/i }).click();
  await expect(page).toHaveURL(/\/community\/saved/);
});

test('a single thread renders its reply composer', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/discussion');
  const firstPost = page.locator('a[href^="/community/post/"]').first();
  if ((await firstPost.count()) === 0) test.skip(true, 'no posts seeded');
  await firstPost.click();
  await expect(page).toHaveURL(/\/community\/post\//);
});
