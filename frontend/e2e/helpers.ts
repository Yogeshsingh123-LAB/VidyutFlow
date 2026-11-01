import { expect, type Page } from '@playwright/test';

export type PortalRole = 'consumer' | 'employee' | 'field' | 'management' | 'admin';

export function attachZeroPageErrorGuard(page: Page): string[] {
  const uncaughtErrors: string[] = [];
  page.on('pageerror', (err) => {
    uncaughtErrors.push(err.message);
  });
  return uncaughtErrors;
}

export async function openPortalSignInModal(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const launchBtn = page
    .locator('button[title*="Access Consumer Services"]')
    .first();
  await expect(launchBtn).toBeVisible();
  await launchBtn.click();
  await expect(page.getByLabel('Select Target Workspace / Portal')).toBeVisible();
}

export async function enterPortalViaDemoSandbox(
  page: Page,
  role: PortalRole,
): Promise<void> {
  await openPortalSignInModal(page);
  await page.getByLabel('Select Target Workspace / Portal').selectOption(role);
  const enterBtn = page.getByTestId('enter-demo-selected-account-btn');
  await expect(enterBtn).toBeVisible();
  await enterBtn.click();
  await expect(page.locator('main#main-workspace-content')).toBeVisible();
}
