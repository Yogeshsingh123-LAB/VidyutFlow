import { test, expect } from '@playwright/test';
import {
  attachZeroPageErrorGuard,
  enterPortalViaDemoSandbox,
  type PortalRole,
} from './helpers';

test.describe('VidyutFlow — 5 Portals, Auth Guard & 4-Language Switching', () => {
  test('renders public welcome portal and switches across EN, GU, HI, and MR', async ({
    page,
  }) => {
    const pageErrors = attachZeroPageErrorGuard(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/VidyutFlow/i);
    await expect(page.locator('main')).toBeVisible();

    const langBtn = page.locator('#language-selector-button').first();
    await expect(langBtn).toBeVisible();

    for (const targetLabel of ['ગુજરાતી', 'हिन्दी', 'मराठी', 'English']) {
      await langBtn.click();
      const option = page.getByRole('option', { name: new RegExp(targetLabel, 'i') }).first();
      await expect(option).toBeVisible();
      await option.click();
      await expect(langBtn).toContainText(
        targetLabel === 'English' ? /EN|English/i : new RegExp(targetLabel, 'i'),
      );
    }

    expect(pageErrors).toEqual([]);
  });

  const PORTAL_CASES: Array<{ role: PortalRole; expectedText: RegExp }> = [
    { role: 'consumer', expectedText: /Consumer|Connection|Dashboard|Premise/i },
    { role: 'employee', expectedText: /Application|Subdivision|Officer|ERP|Queue/i },
    { role: 'field', expectedText: /Field|Work Order|Inspection|Feeder|Offline/i },
    { role: 'management', expectedText: /Executive|SLA|Telemetry|Analytics/i },
    { role: 'admin', expectedText: /Admin|Audit|Users|System|Access/i },
  ];

  for (const { role, expectedText } of PORTAL_CASES) {
    test(`authorizes and mounts '${role}' portal workspace without runtime errors`, async ({
      page,
    }) => {
      const pageErrors = attachZeroPageErrorGuard(page);
      await enterPortalViaDemoSandbox(page, role);

      const mainWorkspace = page.locator('main#main-workspace-content');
      await expect(mainWorkspace).toBeVisible();
      await expect(mainWorkspace).toContainText(expectedText);

      // Verify skip-to-main accessibility link is attached in AppShell
      await expect(page.locator('a.skip-to-main-link')).toHaveAttribute(
        'href',
        '#main-workspace-content',
      );

      expect(pageErrors).toEqual([]);
    });
  }
});
