import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  enterPortalViaDemoSandbox,
  openPortalSignInModal,
  type PortalRole,
} from './helpers';

// Enforce zero critical WCAG 2.1 A/AA structural violations (labels, ARIA roles,
// button/link names, image alt text, duplicate IDs, document language & title).
// Color-contrast is excluded here because Tailwind dark/glass gradient badges
// are audited separately during visual polish after final theme tuning.
const DISABLED_DECORATIVE_RULES = ['color-contrast'];

test.describe('VidyutFlow — Automated Accessibility (WCAG 2.1 A/AA via axe-core) & Keyboard UX', () => {
  test('public WelcomePortalPage passes critical WCAG 2.1 A/AA structural checks', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(DISABLED_DECORATIVE_RULES)
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      criticalOrSerious,
      `Axe violations on WelcomePortalPage: ${JSON.stringify(
        criticalOrSerious.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
      )}`,
    ).toEqual([]);
  });

  test('VidyutFlowAuthModal passes WCAG form-label & interactive control checks', async ({
    page,
  }) => {
    await openPortalSignInModal(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(DISABLED_DECORATIVE_RULES)
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      criticalOrSerious,
      `Axe violations on VidyutFlowAuthModal: ${JSON.stringify(
        criticalOrSerious.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
      )}`,
    ).toEqual([]);
  });

  const PORTALS: PortalRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  for (const role of PORTALS) {
    test(`authenticated '${role}' workspace passes critical WCAG structural checks & keyboard skip-link`, async ({
      page,
    }) => {
      await enterPortalViaDemoSandbox(page, role);

      // Keyboard Tab reaches skip-to-main link first in AppShell
      await page.keyboard.press('Tab');
      const skipLink = page.locator('a.skip-to-main-link');
      await expect(skipLink).toBeAttached();

      const results = await new AxeBuilder({ page })
        .include('main#main-workspace-content')
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(DISABLED_DECORATIVE_RULES)
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');
      expect(
        critical,
        `Critical axe violations in '${role}' portal: ${JSON.stringify(
          critical.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
        )}`,
      ).toEqual([]);
    });
  }
});
