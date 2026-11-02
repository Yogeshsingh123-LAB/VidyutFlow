import {
  DemoSession,
  getCanonicalIdentityById,
  resolveCanonicalDemoIdentity,
  getDefaultCanonicalIdentityForRole
} from '../data/demoAuthData';
import { ROLE_PROFILES } from '../data/mockData';
import { UserRole } from '../types';

/**
 * Common honorifics and professional titles to exclude when extracting
 * personal name initials for avatar generation.
 */
const HONORIFICS = new Set([
  'shri',
  'shree',
  'smt',
  'shrimati',
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'er',
  'late'
]);

/**
 * Extracts dynamic avatar initials from a full name.
 * 
 * Rules:
 * 1. Removes honorifics (e.g. Shri, Smt., Mr., Mrs., Dr., etc.).
 * 2. Uses the first letter of the first and last meaningful name parts.
 * 3. For single-word names, returns the first letter.
 * 4. Gracefully handles punctuation, extra spaces, and missing names.
 */
export function getInitialsFromName(name?: string | null, fallback: string = 'VF'): string {
  if (!name || typeof name !== 'string') {
    return fallback;
  }

  // Tokenize by whitespace
  const rawParts = name.trim().split(/\s+/).filter(Boolean);
  if (rawParts.length === 0) {
    return fallback;
  }

  // Filter out honorifics
  const meaningfulParts = rawParts.filter(part => {
    const cleaned = part.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
    return cleaned.length > 0 && !HONORIFICS.has(cleaned);
  });

  const partsToUse = meaningfulParts.length > 0 ? meaningfulParts : rawParts;

  const extractFirstLetter = (token: string): string => {
    const match = token.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : (token[0] || '').toUpperCase();
  };

  if (partsToUse.length === 1) {
    const singleInitial = extractFirstLetter(partsToUse[0]);
    return singleInitial || fallback;
  }

  const firstInitial = extractFirstLetter(partsToUse[0]);
  const lastInitial = extractFirstLetter(partsToUse[partsToUse.length - 1]);

  const result = `${firstInitial}${lastInitial}`.trim();
  return result || fallback;
}

export interface ActiveUserIdentity {
  name: string;
  email?: string;
  designation: string;
  initials?: string;
  isCustomUser?: boolean;
  id?: string;
  subdivision?: string;
  badge?: string;
}

/**
 * Single source of truth for active user identity across all 5 portals and navigation bars.
 * Resolves against the Single Canonical User Directory (CANONICAL_DEMO_IDENTITIES) so that
 * user ID, name, initials, designation, and subdivision are 100% consistent across portals.
 */
export function getActiveUserIdentity(
  demoSession: DemoSession | null | undefined,
  currentRole: UserRole
): ActiveUserIdentity {
  const profile = ROLE_PROFILES[currentRole];
  const isMatchingRole = Boolean(demoSession && demoSession.role === currentRole);

  // 1. Custom registered consumer accounts preserve their custom signup identity
  if (isMatchingRole && demoSession?.user.isCustomSignup) {
    const customName = demoSession.user.name || 'Citizen Consumer';
    return {
      id: demoSession.user.id,
      name: customName,
      email: demoSession.user.email,
      designation: demoSession.user.designation || 'Registered Domestic / Commercial Consumer',
      initials: getInitialsFromName(customName, 'CC'),
      subdivision: demoSession.user.subdivision || 'Mehsana City North',
      badge: profile?.badge,
      isCustomUser: true
    };
  }

  // 2. Canonical directory resolution for matching role session
  if (isMatchingRole && demoSession?.user) {
    const directCanonical = getCanonicalIdentityById(demoSession.user.id);
    if (directCanonical && directCanonical.role === currentRole) {
      return {
        id: directCanonical.id,
        name: directCanonical.name,
        email: directCanonical.email,
        designation: directCanonical.designation,
        initials: getInitialsFromName(directCanonical.name, directCanonical.avatarInitials),
        subdivision: demoSession.user.subdivision || directCanonical.subdivision,
        badge: profile?.badge,
        isCustomUser: false
      };
    }

    const resolvedCanonical = resolveCanonicalDemoIdentity({
      id: demoSession.user.id,
      email: demoSession.user.email,
      name: demoSession.user.name,
      role: currentRole
    });

    if (resolvedCanonical) {
      return {
        id: resolvedCanonical.id,
        name: resolvedCanonical.name,
        email: resolvedCanonical.email,
        designation: resolvedCanonical.designation,
        initials: getInitialsFromName(resolvedCanonical.name, resolvedCanonical.avatarInitials),
        subdivision: demoSession.user.subdivision || resolvedCanonical.subdivision,
        badge: profile?.badge,
        isCustomUser: false
      };
    }

    // Fallback for custom server-authenticated users not in static demo list
    const fallbackName = demoSession.user.name || profile?.personaName || 'Authorized User';
    return {
      id: demoSession.user.id,
      name: fallbackName,
      email: demoSession.user.email,
      designation: demoSession.user.designation || profile?.personaDesignation || 'Authorized User',
      initials: getInitialsFromName(fallbackName, profile?.personaAvatar || 'VF'),
      subdivision: demoSession.user.subdivision,
      badge: profile?.badge,
      isCustomUser: false
    };
  }

  // 3. Default canonical identity for the current role when no matching session is active
  const defaultCanonical = getDefaultCanonicalIdentityForRole(currentRole);
  return {
    id: defaultCanonical.id,
    name: defaultCanonical.name,
    email: defaultCanonical.email,
    designation: defaultCanonical.designation,
    initials: getInitialsFromName(defaultCanonical.name, defaultCanonical.avatarInitials),
    subdivision: defaultCanonical.subdivision,
    badge: profile?.badge,
    isCustomUser: false
  };
}

