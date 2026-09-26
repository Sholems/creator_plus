import { expect, test } from '@playwright/test';
import { needCreds, login } from './helpers';

test('certificate verification route renders for an unknown code without crashing', async ({ page }) => {
  await page.goto('/community/certificate/does-not-exist');
  await expect(page.locator('body')).toBeVisible();
});

test('member can open the course catalogue', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/courses');
  await expect(page).toHaveURL(/\/community\/courses/);
  const firstCourse = page.locator('a[href^="/community/course/"]').first();
  if ((await firstCourse.count()) > 0) {
    await firstCourse.click();
    await expect(page).toHaveURL(/\/community\/course\//);
  }
});
