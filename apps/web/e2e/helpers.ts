import type { Page } from '@playwright/test';

/** Widths the responsive contract must hold at (R4 / AE10). */
export const REQUIRED_WIDTHS = [320, 375, 414, 768, 1280];

export function needCreds(): boolean {
  return !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD;
}

export function needAdmin(): boolean {
  return !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForLoadState('networkidle');
}

export async function login(page: Page) {
  await signIn(page, process.env.E2E_USER_EMAIL!, process.env.E2E_USER_PASSWORD!);
}

export async function loginAdmin(page: Page) {
  await signIn(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
}

/** Assert the document does not scroll horizontally (allowing 1px rounding). */
export async function assertNoHorizontalOverflow(page: Page, label = '') {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) throw new Error(`Horizontal overflow of ${overflow}px ${label}`);
}
