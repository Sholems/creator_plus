import { expect, test } from '@playwright/test';
import { needCreds, login } from './helpers';

test('member can open the events list', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community/events');
  await expect(page).toHaveURL(/\/community\/events/);
  const firstEvent = page.locator('a[href^="/community/event/"]').first();
  if ((await firstEvent.count()) > 0) {
    await firstEvent.click();
    await expect(page).toHaveURL(/\/community\/event\//);
  }
});
