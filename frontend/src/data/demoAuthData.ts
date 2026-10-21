import { UserRole } from '../types';

export interface DemoAccount {
  role: UserRole;
  roleLabel: string;
  email: string;
  password: string; // Fictional demo password
  name: string;
  designation: string;
  department: string;
  division: string;
  isPreconfigured: boolean;
  avatarInitials: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mobileNumber?: string;
  passwordHash: string; // Obfuscated hash for local prototype
  createdAt: string;
  isCustomSignup?: boolean;
}

export interface DemoSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    designation?: string;
    mobileNumber?: string;
    isCustomSignup?: boolean;
  };
  role: UserRole;
  loginTime: string;
  sessionToken: string;
}

/**
 * The 5 Official Demonstration Accounts specified for VidyutFlow.
 * Clearly labeled as fictional prototype accounts.
 */
export const DEFAULT_DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  consumer: {
    role: 'consumer',
    roleLabel: 'Consumer Portal',
    email: 'consumer@vidyutflow.demo',
    password: 'Demo@12345',
    name: 'Smt. Meenaben Patel',
    designation: 'Primary Account Holder & Domestic Consumer',
    department: 'Consumer Services Division',
    division: 'Mehsana Circle · North Subdivision',
    isPreconfigured: true,
    avatarInitials: 'MP'
  },
  employee: {
    role: 'employee',
    roleLabel: 'Office Employee ERP',
    email: 'employee@vidyutflow.demo',
    password: 'Demo@12345',
    name: 'Priya Rathod',
    designation: 'Deputy Executive Engineer (Commercial & Billing)',
    department: 'Revenue & Meter Reading Operations',
    division: 'Mehsana Corporate Circle',
    isPreconfigured: true,
    avatarInitials: 'PR'
  },
  field: {
    role: 'field',
    roleLabel: 'Field Engineer App',
    email: 'field@vidyutflow.demo',
    password: 'Demo@12345',
    name: 'Vikram Zala',
    designation: 'Senior Junior Engineer (Substations & Feeders)',
    department: 'Distribution Line Maintenance & DTC Inspection',
    division: 'Himatnagar Circle · 11kV Radial Feeder Ops',
    isPreconfigured: true,
    avatarInitials: 'VZ'
  },
  management: {
    role: 'management',
    roleLabel: 'Management Cockpit',
    email: 'management@vidyutflow.demo',
    password: 'Demo@12345',
    name: 'Rajesh Solanki',
    designation: 'Chief Engineer (Distribution & Power Flow)',
    department: 'SCADA, APFC & AT&C Loss Minimization Desk',
    division: 'UGVCL Headquarters, Mehsana',
    isPreconfigured: true,
    avatarInitials: 'RS'
  },
  admin: {
    role: 'admin',
    roleLabel: 'System Administrator',
    email: 'admin@vidyutflow.demo',
    password: 'Demo@12345',
    name: 'Anand Patel',
    designation: 'Principal IT Infrastructure & ERP Administrator',
    department: 'Central Cyber Operations & Identity Governance',
    division: 'Data Center & State Load Despatch Center Link',
    isPreconfigured: true,
    avatarInitials: 'AP'
  }
};

/**
 * Fictional Discom Authentication Disclaimers & Regulatory Notices
 */
export const AUTH_DISCLAIMERS = {
  prototypeNotice:
    'VidyutFlow Demonstration Platform: This is an independent educational prototype for UGVCL-inspired utility ERP workflows. This is not an official government authentication portal.',
  storageDisclaimer:
    'Demonstration Notice: Simulated user accounts are stored in your local browser sandbox for prototyping purposes only. No production passwords or sensitive credentials are ever transmitted to external servers.',
  signupNotice:
    'Public registration is available exclusively for Consumer accounts. Internal utility roles (Office Employee, Field Engineer, Management Cockpit, System Administrator) are provisioned through UGVCL IT Administration and cannot be registered publicly.'
};

/**
 * Obfuscation helper (NOT for production; clearly scoped for browser demo)
 */
export function hashDemoPassword(plain: string): string {
  // Simple deterministic client hash for local prototype storage
  let hash = 0;
  for (let i = 0; i < plain.length; i++) {
    const char = plain.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `demo_hash_${Math.abs(hash).toString(36)}_${btoa(plain.slice(0, 3))}`;
}

export function verifyDemoPassword(plain: string, hashed: string): boolean {
  return hashDemoPassword(plain) === hashed;
}

const STORAGE_CUSTOM_USERS_KEY = 'vidyutflow_custom_users';
const STORAGE_SESSION_KEY = 'vidyutflow_demo_session';

export function getCustomDemoUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoUser[];
  } catch {
    return [];
  }
}

export function saveCustomDemoUser(user: DemoUser): void {
  const existing = getCustomDemoUsers();
  const filtered = existing.filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
  filtered.push(user);
  localStorage.setItem(STORAGE_CUSTOM_USERS_KEY, JSON.stringify(filtered));
}

export function getStoredDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function setStoredDemoSession(session: DemoSession | null): void {
  if (!session) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } else {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  }
}
