import { expect, test } from '@playwright/test';
import { REQUIRED_WIDTHS, assertNoHorizontalOverflow } from './helpers';

// The community upgrade must not regress core public marketplace surfaces.
const PUBLIC_ROUTES = ['/', '/marketplace', '/community', '/auth/login'];

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} still renders`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status(), `${route} status`).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });
}

test('marketplace home has no horizontal overflow across widths', async ({ page }) => {
  for (const w of REQUIRED_WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    await assertNoHorizontalOverflow(page, `at ${w}px`);
  }
});
