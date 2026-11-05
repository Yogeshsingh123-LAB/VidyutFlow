/**
 * Phase 12 Step 10: Management + Admin Frontend Verification.
 *
 * Verifies:
 * 1. ROLE_ALLOWED_TABS permissions for management & admin in src/utils/authSecurity.ts
 * 2. Sidebar & MobileNav tab registration for 'transformers' in management & admin roles
 * 3. React.lazy code-splitting in ManagementPortal & AdminPortal
 * 4. Component file exports for ManagementTransformerHealthView & AdminTransformerRegistryView
 * 5. Isolation guardrail: mockData.ts unmodified
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ROLE_ALLOWED_TABS, isTabAllowedForRole } from '../src/utils/authSecurity';
import { DEMO_TRANSFORMERS } from '../src/data/transformerDemoData';

async function run() {
  console.log('Running tests/phase12-management-admin.test.ts...');

  // -------------------------------------------------------------------------
  // 1. Role-Based Access Control Permissions
  // -------------------------------------------------------------------------
  assert.ok(ROLE_ALLOWED_TABS.management.includes('transformers'), 'management role must have transformers tab');
  assert.ok(ROLE_ALLOWED_TABS.admin.includes('transformers'), 'admin role must have transformers tab');
  assert.equal(isTabAllowedForRole('management', 'transformers'), true);
  assert.equal(isTabAllowedForRole('admin', 'transformers'), true);
  console.log('✓ Management & Admin RBAC permissions verified');

  // -------------------------------------------------------------------------
  // 2. Navigation & Sidebar Registration
  // -------------------------------------------------------------------------
  const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8');
  assert.ok(sidebarSrc.includes('Transformer Fleet Health'), 'Sidebar.tsx must define management transformers label');
  assert.ok(sidebarSrc.includes('Transformer Asset Registry'), 'Sidebar.tsx must define admin transformers label');

  const mobileNavSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/MobileNav.tsx'), 'utf8');
  assert.ok(mobileNavSrc.includes('Transformer Fleet Health'), 'MobileNav.tsx must define management transformers label');
  assert.ok(mobileNavSrc.includes('Transformer Asset Registry'), 'MobileNav.tsx must define admin transformers label');
  console.log('✓ Management & Admin sidebar & mobile nav registration verified');

  // -------------------------------------------------------------------------
  // 3. Code-Splitting & React.lazy Portal Integration
  // -------------------------------------------------------------------------
  const mgmtPortalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/management/ManagementPortal.tsx'), 'utf8');
  assert.ok(mgmtPortalSrc.includes('ManagementTransformerHealthView'), 'ManagementPortal must reference ManagementTransformerHealthView');
  assert.ok(mgmtPortalSrc.includes("activeTab === 'transformers'"), 'ManagementPortal must switch on activeTab transformers');
  assert.ok(mgmtPortalSrc.includes('React.lazy(') || mgmtPortalSrc.includes('lazy('), 'ManagementPortal must lazy load view');

  const adminPortalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/admin/AdminPortal.tsx'), 'utf8');
  assert.ok(adminPortalSrc.includes('AdminTransformerRegistryView'), 'AdminPortal must reference AdminTransformerRegistryView');
  assert.ok(adminPortalSrc.includes("activeTab === 'transformers'"), 'AdminPortal must switch on activeTab transformers');
  assert.ok(adminPortalSrc.includes('React.lazy(') || adminPortalSrc.includes('lazy('), 'AdminPortal must lazy load view');
  console.log('✓ React.lazy code-splitting in ManagementPortal & AdminPortal verified');

  // -------------------------------------------------------------------------
  // 4. Component File Structure & Feature Capabilities
  // -------------------------------------------------------------------------
  const mgmtViewPath = path.join(process.cwd(), 'src/components/transformers/ManagementTransformerHealthView.tsx');
  assert.ok(fs.existsSync(mgmtViewPath), 'ManagementTransformerHealthView.tsx must exist');
  const mgmtViewSrc = fs.readFileSync(mgmtViewPath, 'utf8');
  assert.ok(mgmtViewSrc.includes('export const ManagementTransformerHealthView'), 'Must export ManagementTransformerHealthView');
  assert.ok(mgmtViewSrc.includes('/api/v1/transformer-analytics/summary'), 'Must wire summary analytics endpoint');
  assert.ok(mgmtViewSrc.includes('FLEET HEALTH INDEX'), 'Must render fleet health index KPI');
  assert.ok(mgmtViewSrc.includes('BarChart'), 'Must use Recharts BarChart');

  const adminViewPath = path.join(process.cwd(), 'src/components/transformers/AdminTransformerRegistryView.tsx');
  assert.ok(fs.existsSync(adminViewPath), 'AdminTransformerRegistryView.tsx must exist');
  const adminViewSrc = fs.readFileSync(adminViewPath, 'utf8');
  assert.ok(adminViewSrc.includes('export const AdminTransformerRegistryView'), 'Must export AdminTransformerRegistryView');
  assert.ok(adminViewSrc.includes('/api/v1/transformers'), 'Must wire transformer asset registry endpoint');
  assert.ok(adminViewSrc.includes('/api/v1/transformer-policies'), 'Must wire policy versions endpoint');
  assert.ok(adminViewSrc.includes('/api/v1/transformers/telemetry/dead-letters'), 'Must wire dead-letter queue endpoint');
  assert.ok(adminViewSrc.includes('Register New DTR Asset'), 'Must provide asset creation modal trigger');
  console.log('✓ Management & Admin component structure & feature capabilities verified');

  // -------------------------------------------------------------------------
  // 5. Guardrail: mockData.ts Untouched & Demo Fixtures Isolated
  // -------------------------------------------------------------------------
  assert.ok(DEMO_TRANSFORMERS.length >= 3, 'Must have at least 3 demo transformers');
  const mockDataSrc = fs.readFileSync(path.join(process.cwd(), 'src/data/mockData.ts'), 'utf8');
  assert.ok(!mockDataSrc.includes('DEMO_TRANSFORMERS'), 'mockData.ts must NOT be modified with Phase 12 fixtures');
  console.log('✓ Guardrail verified: mockData.ts preserved intact');

  console.log('\n✓ ALL PHASE 12 MANAGEMENT + ADMIN FRONTEND TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

