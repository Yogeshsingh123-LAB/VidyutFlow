/**
 * Phase 6 Verification Suite: Enterprise UI/UX Refinement, Accessibility, and Responsiveness
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PORTAL_THEME_TOKENS,
  SEVERITY_A11Y_TOKENS,
  RESPONSIVE_VIEWPORT_TARGETS,
  formatAccessibleSeverityLabel
} from '../src/utils/designTokens';
import { ROLE_PROFILES } from '../src/data/mockData';

console.log('Running Phase 6 UI/UX, Accessibility & Responsiveness Tests...');

// 1. Verify Portal Theme Tokens cover all 5 UGVCL portals with bilingual identity & focus tokens
const expectedRoles = ['consumer', 'employee', 'field', 'management', 'admin'] as const;
for (const role of expectedRoles) {
  const token = PORTAL_THEME_TOKENS[role];
  assert.ok(token, `Missing portal theme token for ${role}`);
  assert.equal(token.role, role);
  assert.ok(token.portalTitle.length > 0, `Missing portalTitle for ${role}`);
  assert.ok(token.gujaratiSubtitle.length > 0, `Missing Gujarati subtitle for ${role}`);
  assert.ok(token.accentHex.startsWith('#'), `Invalid accentHex for ${role}`);
  assert.ok(token.focusRingClass.includes('focus-visible:ring'), `Missing focus-visible ring class for ${role}`);
}

// 2. Verify Non-Color-Only Severity Accessibility Tokens
const severities = ['CRITICAL', 'HIGH', 'WARNING', 'MEDIUM', 'LOW', 'INFO'] as const;
for (const sev of severities) {
  const token = SEVERITY_A11Y_TOKENS[sev];
  assert.ok(token, `Missing severity token for ${sev}`);
  assert.ok(token.symbolIndicator.length > 0, `Missing non-color symbolIndicator for ${sev}`);
  assert.ok(token.textPrefix.length > 0, `Missing textPrefix for ${sev}`);
  const formatted = formatAccessibleSeverityLabel(sev);
  assert.ok(formatted.includes(token.symbolIndicator), `Formatted label must include symbol for ${sev}`);
  assert.ok(formatted.includes(token.textPrefix), `Formatted label must include textPrefix for ${sev}`);
}
assert.equal(SEVERITY_A11Y_TOKENS.CRITICAL.ariaRole, 'alert');
assert.equal(SEVERITY_A11Y_TOKENS.INFO.ariaRole, 'status');

// 3. Verify Responsive Viewport Targets (360px, 768px, 1366px, 1920px)
assert.equal(RESPONSIVE_VIEWPORT_TARGETS.mobileCompact.widthPx, 360);
assert.equal(RESPONSIVE_VIEWPORT_TARGETS.tabletSubstation.widthPx, 768);
assert.equal(RESPONSIVE_VIEWPORT_TARGETS.desktopStandard.widthPx, 1366);
assert.equal(RESPONSIVE_VIEWPORT_TARGETS.desktopExecutive.widthPx, 1920);

// 4. Verify Preservation of Official UGVCL Branding, 5 Portals, and Historical Milestones
assert.equal(Object.keys(ROLE_PROFILES).length, 5, 'All 5 UGVCL portals must be preserved');

const welcomeHubSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/intro/WelcomePortalPage.tsx'),
  'utf8'
);
const journeySource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/welcome/DistributionJourneySection.tsx'),
  'utf8'
);
assert.ok(
  welcomeHubSource.includes('InstitutionalHeader') || welcomeHubSource.includes('/assets/ugvcl-logo.png'),
  'WelcomePortalPage must preserve the official UGVCL header and branding'
);
assert.ok(
  journeySource.includes('1960') || journeySource.includes('2005') || welcomeHubSource.includes('DistributionJourneySection'),
  'Welcome experience must preserve the historical UGVCL milestones timeline'
);

// 5. Verify Global Accessibility Styles & Reduced Motion Support in index.css
const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
assert.ok(
  cssSource.includes('prefers-reduced-motion: reduce'),
  'index.css must implement @media (prefers-reduced-motion: reduce)'
);
assert.ok(
  cssSource.includes(':focus-visible'),
  'index.css must implement visible keyboard focus indicators (:focus-visible)'
);
assert.ok(
  cssSource.includes('.skip-to-main-link'),
  'index.css must style the keyboard skip-to-main-content link'
);

// 6. Verify AppShell Landmarks, Skip Link, and Truthful LIVE Mode Banner
const appShellSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/layout/AppShell.tsx'),
  'utf8'
);
assert.ok(
  appShellSource.includes('href="#main-workspace-content"'),
  'AppShell must include a skip link targeting #main-workspace-content'
);
assert.ok(
  appShellSource.includes('id="main-workspace-content"'),
  'AppShell main landmark must have id="main-workspace-content"'
);
assert.ok(
  appShellSource.includes('aria-live="polite"'),
  'AppShell must include polite live region for mode and backend state announcements'
);
assert.ok(
  appShellSource.includes('LIVE Mode — Backend Unavailable'),
  'AppShell must preserve explicit LIVE mode backend unavailable state without silent demo fallback'
);

// 7. Verify Modal & Drawer Accessibility Semantics (role="dialog"/"alertdialog", aria-modal, Escape key)
const criticalModalSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/common/CriticalIncidentModal.tsx'),
  'utf8'
);
assert.ok(criticalModalSource.includes('role="alertdialog"'), 'CriticalIncidentModal must have role="alertdialog"');
assert.ok(criticalModalSource.includes('aria-modal="true"'), 'CriticalIncidentModal must have aria-modal="true"');
assert.ok(criticalModalSource.includes("e.key === 'Escape'"), 'CriticalIncidentModal must handle Escape key');

const approvalModalSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/common/HumanApprovalModal.tsx'),
  'utf8'
);
assert.ok(approvalModalSource.includes('role="dialog"'), 'HumanApprovalModal must have role="dialog"');
assert.ok(approvalModalSource.includes('aria-modal="true"'), 'HumanApprovalModal must have aria-modal="true"');
assert.ok(
  approvalModalSource.includes('htmlFor="human-approval-remarks"'),
  'HumanApprovalModal remarks field must have an associated label'
);

const notificationDrawerSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/common/NotificationDrawer.tsx'),
  'utf8'
);
assert.ok(notificationDrawerSource.includes('role="dialog"'), 'NotificationDrawer must have role="dialog"');
assert.ok(notificationDrawerSource.includes("e.key === 'Escape'"), 'NotificationDrawer must support Escape key');

const aiDrawerSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/common/AIAssistantDrawer.tsx'),
  'utf8'
);
assert.ok(aiDrawerSource.includes('role="dialog"'), 'AIAssistantDrawer must have role="dialog"');
assert.ok(aiDrawerSource.includes('role="log"'), 'AIAssistantDrawer message history must have role="log"');

console.log('✅ All Phase 6 UI/UX, Accessibility & Responsiveness checks passed!');
