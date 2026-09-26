import { expect, test } from '@playwright/test';
import { REQUIRED_WIDTHS, assertNoHorizontalOverflow, needCreds, login } from './helpers';

test('community landing renders without horizontal overflow at every required width', async ({ page }) => {
  for (const w of REQUIRED_WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/community');
    await assertNoHorizontalOverflow(page, `at ${w}px`);
  }
});

test('the workspace shell exposes keyboard-reachable navigation', async ({ page }) => {
  test.skip(needCreds(), 'test account not configured');
  await login(page);
  await page.goto('/community');
  await expect(page.getByRole('navigation', { name: /growth club/i })).toBeVisible();
  await page.keyboard.press('Tab');
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(['A', 'BUTTON', 'INPUT']).toContain(tag);
});
