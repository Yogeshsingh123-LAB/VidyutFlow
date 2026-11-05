/**
 * Role-Based Access Control Tab & Feature Permissions.
 *
 * Enforces role isolation across Consumer, Employee, Field, Management, and Admin portals.
 */

export const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  consumer: [
    'dashboard',
    'connections',
    'new-connection',
    'bills',
    'payments',
    'complaints',
    'requests',
    'notifications',
    'profile',
    'outage-map',
  ],
  employee: [
    'dashboard',
    'transformers',
    'applications',
    'consumers',
    'complaints',
    'approvals',
    'coordination',
    'reports',
    'incidents',
    'outage-map',
  ],
  field: [
    'dashboard',
    'transformers',
    'workorders',
    'inspections',
    'maintenance',
    'offline',
    'history',
    'outage-map',
  ],
  management: [
    'dashboard',
    'transformers',
    'analytics',
    'sla',
    'feeders',
    'ai-insights',
    'reports',
    'outage-map',
  ],
  admin: [
    'overview',
    'transformers',
    'users',
    'access',
    'audit',
    'integrations',
    'infra',
    'settings',
    'directory',
    'outage-map',
  ],
};

export function isTabAllowedForRole(role: string, tab: string): boolean {
  const allowed = ROLE_ALLOWED_TABS[role] || [];
  return allowed.includes(tab);
}

