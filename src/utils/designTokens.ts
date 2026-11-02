import { UserRole, IncidentSeverity, RecommendationRiskLevel } from '../types';

/**
 * ============================================================================
 * VIDYUTFLOW ENTERPRISE DESIGN TOKENS & ACCESSIBILITY SPECIFICATIONS (Phase 6)
 * ============================================================================
 * Centralizes portal visual identities, non-color-only severity indicators,
 * WCAG AA contrast tokens, and responsive viewport targets (360px - 1920px).
 * ============================================================================
 */

export interface PortalThemeToken {
  role: UserRole;
  portalTitle: string;
  gujaratiSubtitle: string;
  accentHex: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  focusRingClass: string;
}

export const PORTAL_THEME_TOKENS: Record<UserRole, PortalThemeToken> = {
  consumer: {
    role: 'consumer',
    portalTitle: 'Consumer Self-Service Portal',
    gujaratiSubtitle: 'ગ્રાહક સેવા પોર્ટલ',
    accentHex: '#1d4ed8',
    badgeBgClass: 'bg-blue-50 dark:bg-blue-950/60',
    badgeTextClass: 'text-blue-700 dark:text-blue-300',
    badgeBorderClass: 'border-blue-200 dark:border-blue-800',
    focusRingClass: 'focus-visible:ring-blue-600'
  },
  employee: {
    role: 'employee',
    portalTitle: 'Sub-Divisional Employee ERP',
    gujaratiSubtitle: 'સબ-ડિવિઝનલ ઓપરેશન્સ ડેસ્ક',
    accentHex: '#0f766e',
    badgeBgClass: 'bg-teal-50 dark:bg-teal-950/60',
    badgeTextClass: 'text-teal-700 dark:text-teal-300',
    badgeBorderClass: 'border-teal-200 dark:border-teal-800',
    focusRingClass: 'focus-visible:ring-teal-600'
  },
  field: {
    role: 'field',
    portalTitle: 'Field Engineer Operations Console',
    gujaratiSubtitle: 'ફિલ્ડ એન્જિનિયરિંગ અને નિરીક્ષણ',
    accentHex: '#b45309',
    badgeBgClass: 'bg-amber-50 dark:bg-amber-950/60',
    badgeTextClass: 'text-amber-800 dark:text-amber-300',
    badgeBorderClass: 'border-amber-200 dark:border-amber-800',
    focusRingClass: 'focus-visible:ring-amber-600'
  },
  management: {
    role: 'management',
    portalTitle: 'Executive Management Cockpit',
    gujaratiSubtitle: 'મેનેજમેન્ટ અને ગ્રિડ એનાલિટિક્સ',
    accentHex: '#6d28d9',
    badgeBgClass: 'bg-purple-50 dark:bg-purple-950/60',
    badgeTextClass: 'text-purple-700 dark:text-purple-300',
    badgeBorderClass: 'border-purple-200 dark:border-purple-800',
    focusRingClass: 'focus-visible:ring-purple-600'
  },
  admin: {
    role: 'admin',
    portalTitle: 'System Governance & Security Console',
    gujaratiSubtitle: 'સિસ્ટમ એડમિનિસ્ટ્રેશન અને સુરક્ષા',
    accentHex: '#be123c',
    badgeBgClass: 'bg-rose-50 dark:bg-rose-950/60',
    badgeTextClass: 'text-rose-700 dark:text-rose-300',
    badgeBorderClass: 'border-rose-200 dark:border-rose-800',
    focusRingClass: 'focus-visible:ring-rose-600'
  }
};

export interface SeverityA11yToken {
  level: IncidentSeverity | RecommendationRiskLevel;
  /** Non-color-only prefix text for screen readers and color-blind operators */
  textPrefix: string;
  /** Semantic ARIA role for status/alert announcements */
  ariaRole: 'alert' | 'status';
  /** Shape/symbol indicator accompanying text so severity is never conveyed by color alone */
  symbolIndicator: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const SEVERITY_A11Y_TOKENS: Record<IncidentSeverity | RecommendationRiskLevel, SeverityA11yToken> = {
  CRITICAL: {
    level: 'CRITICAL',
    textPrefix: 'CRITICAL SEVERITY',
    ariaRole: 'alert',
    symbolIndicator: '▲',
    bgClass: 'bg-rose-50 dark:bg-rose-950/70',
    textClass: 'text-rose-800 dark:text-rose-200',
    borderClass: 'border-rose-300 dark:border-rose-800'
  },
  HIGH: {
    level: 'HIGH',
    textPrefix: 'HIGH RISK',
    ariaRole: 'alert',
    symbolIndicator: '◆',
    bgClass: 'bg-amber-50 dark:bg-amber-950/70',
    textClass: 'text-amber-900 dark:text-amber-200',
    borderClass: 'border-amber-300 dark:border-amber-800'
  },
  WARNING: {
    level: 'WARNING',
    textPrefix: 'WARNING',
    ariaRole: 'status',
    symbolIndicator: '◆',
    bgClass: 'bg-amber-50 dark:bg-amber-950/70',
    textClass: 'text-amber-900 dark:text-amber-200',
    borderClass: 'border-amber-300 dark:border-amber-800'
  },
  MEDIUM: {
    level: 'MEDIUM',
    textPrefix: 'MEDIUM RISK',
    ariaRole: 'status',
    symbolIndicator: '●',
    bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    textClass: 'text-blue-800 dark:text-blue-200',
    borderClass: 'border-blue-200 dark:border-blue-800'
  },
  LOW: {
    level: 'LOW',
    textPrefix: 'LOW RISK',
    ariaRole: 'status',
    symbolIndicator: '○',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700'
  },
  INFO: {
    level: 'INFO',
    textPrefix: 'INFORMATIONAL',
    ariaRole: 'status',
    symbolIndicator: 'ℹ',
    bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    textClass: 'text-blue-800 dark:text-blue-200',
    borderClass: 'border-blue-200 dark:border-blue-800'
  }
};

export const RESPONSIVE_VIEWPORT_TARGETS = {
  mobileCompact: { widthPx: 360, label: 'Mobile Handset (Field JE / Citizen)' },
  tabletSubstation: { widthPx: 768, label: 'Substation Tablet / iPad' },
  desktopStandard: { widthPx: 1366, label: 'Sub-Division Office ERP Desktop' },
  desktopExecutive: { widthPx: 1920, label: 'Corporate Control Room Widescreen' }
} as const;

export function formatAccessibleSeverityLabel(
  level: IncidentSeverity | RecommendationRiskLevel
): string {
  const token = SEVERITY_A11Y_TOKENS[level] || SEVERITY_A11Y_TOKENS.INFO;
  return `${token.symbolIndicator} ${token.textPrefix}`;
}
