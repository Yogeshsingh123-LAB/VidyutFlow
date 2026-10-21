import { DemoSession } from '../data/demoAuthData';
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
 * 
 * Examples:
 * - "Mandalia Utsav" -> "MU"
 * - "Meenaben Patel" -> "MP"
 * - "Smt. Meenaben Patel" -> "MP"
 * - "Rajesh V. Trivedi" -> "RT"
 * - "Rajesh Trivedi" -> "RT"
 * - "Priya Rathod" -> "PR"
 * - "Dr. Harita Joshi" -> "HJ"
 * - "Vikramaditya Solanki" -> "VS"
 * - "K. V. Sharma" -> "KS"
 * - "Utsav" -> "U"
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
  email: string;
  designation: string;
  initials: string;
  isCustomUser: boolean;
}

/**
 * Single source of truth for active user identity across all 5 portals and navigation bars.
 * Prioritizes the active authenticated demoSession user, falling back to role default persona.
 */
export function getActiveUserIdentity(
  demoSession: DemoSession | null | undefined,
  currentRole: UserRole
): ActiveUserIdentity {
  const profile = ROLE_PROFILES[currentRole];
  
  // Authenticated demoSession is the primary source of truth
  const isMatchingRole = demoSession && demoSession.role === currentRole;
  
  const name = isMatchingRole
    ? demoSession.user.name
    : (demoSession?.user.name || profile?.personaName || 'Citizen Consumer');
    
  const email = isMatchingRole
    ? demoSession.user.email
    : (demoSession?.user.email || `${currentRole}@vidyutflow.demo`);
    
  const designation = isMatchingRole
    ? (demoSession.user.designation || profile?.personaDesignation || 'Authorized User')
    : (profile?.personaDesignation || 'Authorized User');
    
  const initials = getInitialsFromName(name, profile?.personaAvatar || 'VF');
  
  return {
    name,
    email,
    designation,
    initials,
    isCustomUser: !!demoSession?.user.isCustomSignup
  };
}
