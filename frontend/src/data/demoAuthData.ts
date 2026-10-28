import { UserRole, FieldEngineerRecord } from '../types';

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
    subdivision?: string;
    mobileNumber?: string;
    isCustomSignup?: boolean;
  };
  role: UserRole;
  loginTime: string;
  sessionToken: string;
}

export interface CanonicalDemoIdentity {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleLabel: string;
  designation: string;
  department: string;
  subdivision: string;
  assignedFeeder?: string;
  phone?: string;
  status: 'Available' | 'On Site' | 'Offline' | 'Active';
  avatarInitials: string;
  isDefaultForRole?: boolean;
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
 * SINGLE CANONICAL USER DIRECTORY FOR VIDYUTFLOW DEMO MODE
 * Reconciles DEFAULT_DEMO_ACCOUNTS, INITIAL_FIELD_ENGINEERS, INITIAL_EMPLOYEES, and ROLE_PROFILES
 * into one authoritative directory with stable user IDs, names, roles, designations, and subdivisions.
 * Preserves Vikram Zala (FLD-UG-212) as a separate selectable Field Engineer account alongside
 * Vikramaditya Solanki (FLD-UG-201), Dharmesh P. Chaudhari (FLD-UG-204), and Hitesh N. Vaghela (FLD-UG-209).
 */
export const CANONICAL_DEMO_IDENTITIES: CanonicalDemoIdentity[] = [
  // 1. CONSUMER ACCOUNTS
  {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    email: 'consumer@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'consumer',
    roleLabel: 'Consumer Portal',
    designation: 'Primary Account Holder & Domestic Consumer',
    department: 'Consumer Services Division',
    subdivision: 'Mehsana City North',
    phone: '+91 98250 44112',
    status: 'Active',
    avatarInitials: 'MP',
    isDefaultForRole: true
  },
  {
    id: 'cns_arvind_02',
    name: 'Shri Arvindbhai Prajapati',
    email: 'arvind.prajapati@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'consumer',
    roleLabel: 'Consumer Portal',
    designation: 'Commercial LT-MD Account Holder (04281-77190)',
    department: 'Consumer Services Division',
    subdivision: 'Gandhinagar Sub-Division 2',
    phone: '+91 98254 11902',
    status: 'Active',
    avatarInitials: 'AP'
  },

  // 2. EMPLOYEE ACCOUNTS
  {
    id: 'EMP-UG-1101',
    name: 'Priya Rathod',
    email: 'employee@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'employee',
    roleLabel: 'Office Employee ERP',
    designation: 'Deputy Executive Engineer (Commercial & Billing)',
    department: 'Revenue & Meter Reading Operations',
    subdivision: 'Mehsana Corporate Circle',
    phone: '+91 94261 77810',
    status: 'Active',
    avatarInitials: 'PR',
    isDefaultForRole: true
  },
  {
    id: 'EMP-UG-1042',
    name: 'Rajesh V. Trivedi',
    email: 'rajesh.trivedi@ugvcl.com',
    password: 'Demo@12345',
    role: 'employee',
    roleLabel: 'Office Employee ERP',
    designation: 'Assistant Engineer (Commerce & Ops)',
    department: 'New Connections & Revenue',
    subdivision: 'Mehsana City North',
    phone: '+91 94260 11201',
    status: 'Active',
    avatarInitials: 'RT'
  },
  {
    id: 'EMP-UG-1088',
    name: 'Pooja Shah',
    email: 'pooja.shah@ugvcl.com',
    password: 'Demo@12345',
    role: 'employee',
    roleLabel: 'Office Employee ERP',
    designation: 'Deputy Executive Engineer',
    department: 'Sub-Division Operations',
    subdivision: 'Gandhinagar Circle',
    phone: '+91 94260 11840',
    status: 'Active',
    avatarInitials: 'PS'
  },
  {
    id: 'EMP-UG-1102',
    name: 'Kamlesh K. Barot',
    email: 'kamlesh.barot@ugvcl.com',
    password: 'Demo@12345',
    role: 'employee',
    roleLabel: 'Office Employee ERP',
    designation: 'Accounts Officer',
    department: 'Tariff & Billing Audit',
    subdivision: 'Mehsana Circle',
    phone: '+91 94260 11920',
    status: 'Active',
    avatarInitials: 'KB'
  },

  // 3. FIELD ENGINEER ACCOUNTS
  {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    email: 'vikramaditya.solanki@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'field',
    roleLabel: 'Field Engineer App',
    designation: 'Junior Engineer (Field & Vigilance)',
    department: 'Distribution Line Maintenance & DTC Inspection',
    subdivision: 'Mehsana City North',
    assignedFeeder: 'FDR-11K-01 (Mehsana GIDC)',
    phone: '+91 99099 22101',
    status: 'On Site',
    avatarInitials: 'VS',
    isDefaultForRole: true
  },
  {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    email: 'dharmesh.chaudhari@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'field',
    roleLabel: 'Field Engineer App',
    designation: 'Line Inspector & Field Feasibility Officer',
    department: 'Distribution Line Maintenance & DTC Inspection',
    subdivision: 'Kadi Division',
    assignedFeeder: 'FDR-11K-02 (Kadi Industrial)',
    phone: '+91 99099 22104',
    status: 'Available',
    avatarInitials: 'DC'
  },
  {
    id: 'FLD-UG-209',
    name: 'Hitesh N. Vaghela',
    email: 'hitesh.vaghela@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'field',
    roleLabel: 'Field Engineer App',
    designation: 'Substation Technician Grade-I',
    department: 'Distribution Line Maintenance & DTC Inspection',
    subdivision: 'Mehsana Industrial GIDC',
    assignedFeeder: 'FDR-11K-01 (Mehsana GIDC)',
    phone: '+91 99099 22109',
    status: 'Available',
    avatarInitials: 'HV'
  },
  {
    id: 'FLD-UG-212',
    name: 'Vikram Zala',
    email: 'field@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'field',
    roleLabel: 'Field Engineer App',
    designation: 'Senior Junior Engineer (Substations & Feeders)',
    department: 'Distribution Line Maintenance & DTC Inspection',
    subdivision: 'Himatnagar Circle · 11kV Radial Feeder Ops',
    assignedFeeder: 'FDR-11K-04 (Himatnagar Radial)',
    phone: '+91 99099 22112',
    status: 'Available',
    avatarInitials: 'VZ'
  },

  // 4. MANAGEMENT ACCOUNTS
  {
    id: 'usr_mgmt_01',
    name: 'Rajesh Solanki',
    email: 'management@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'management',
    roleLabel: 'Management Cockpit',
    designation: 'Chief Engineer (Distribution & Power Flow)',
    department: 'SCADA, APFC & AT&C Loss Minimization Desk',
    subdivision: 'UGVCL Headquarters, Mehsana',
    phone: '+91 98250 10001',
    status: 'Active',
    avatarInitials: 'RS',
    isDefaultForRole: true
  },
  {
    id: 'usr_mgmt_02',
    name: 'Pooja Shah',
    email: 'pooja.shah.mgmt@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'management',
    roleLabel: 'Management Cockpit',
    designation: 'Deputy Executive Engineer (Grid Operations)',
    department: 'SCADA & Sub-Transmission Control',
    subdivision: 'Gandhinagar Circle',
    phone: '+91 98250 10002',
    status: 'Active',
    avatarInitials: 'PS'
  },
  {
    id: 'usr_mgmt_03',
    name: 'Dr. Harita Joshi',
    email: 'harita.joshi@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'management',
    roleLabel: 'Management Cockpit',
    designation: 'Chief General Manager (Distribution & IT)',
    department: 'Executive Operations & Regulatory Compliance',
    subdivision: 'UGVCL Corporate Headquarters, Mehsana',
    phone: '+91 98250 10003',
    status: 'Active',
    avatarInitials: 'HJ'
  },

  // 5. SYSTEM ADMINISTRATOR ACCOUNTS
  {
    id: 'USR-ADM-001',
    name: 'Anand Patel',
    email: 'admin@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'admin',
    roleLabel: 'System Administrator',
    designation: 'Principal IT Infrastructure & ERP Administrator',
    department: 'Central Cyber Operations & Identity Governance',
    subdivision: 'Data Center & State Load Despatch Center Link',
    phone: '+91 98250 99001',
    status: 'Active',
    avatarInitials: 'AP',
    isDefaultForRole: true
  },
  {
    id: 'USR-ADM-002',
    name: 'K. V. Sharma',
    email: 'kv.sharma@vidyutflow.demo',
    password: 'Demo@12345',
    role: 'admin',
    roleLabel: 'System Administrator',
    designation: 'Chief IT Infrastructure & Cyber Architect',
    department: 'Enterprise Security & Cloud Operations',
    subdivision: 'Gujarat State Data Center',
    phone: '+91 98250 99002',
    status: 'Active',
    avatarInitials: 'KS'
  }
];

/**
 * Authoritative list of Field Engineer records derived from the canonical directory.
 * Includes FLD-UG-201, FLD-UG-204, FLD-UG-209, and FLD-UG-212 (Vikram Zala).
 */
export const CANONICAL_FIELD_ENGINEERS: FieldEngineerRecord[] = [
  {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field & Vigilance)',
    assignedFeeder: 'FDR-11K-01 (Mehsana GIDC)',
    subdivision: 'Mehsana City North',
    phone: '+91 99099 22101',
    status: 'On Site',
    activeWorkOrders: 2,
    completedToday: 3
  },
  {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    designation: 'Line Inspector & Field Feasibility Officer',
    assignedFeeder: 'FDR-11K-02 (Kadi Industrial)',
    subdivision: 'Kadi Division',
    phone: '+91 99099 22104',
    status: 'Available',
    activeWorkOrders: 1,
    completedToday: 4
  },
  {
    id: 'FLD-UG-209',
    name: 'Hitesh N. Vaghela',
    designation: 'Substation Technician Grade-I',
    assignedFeeder: 'FDR-11K-01 (Mehsana GIDC)',
    subdivision: 'Mehsana Industrial GIDC',
    phone: '+91 99099 22109',
    status: 'Available',
    activeWorkOrders: 0,
    completedToday: 2
  },
  {
    id: 'FLD-UG-212',
    name: 'Vikram Zala',
    designation: 'Senior Junior Engineer (Substations & Feeders)',
    assignedFeeder: 'FDR-11K-04 (Himatnagar Radial)',
    subdivision: 'Himatnagar Circle · 11kV Radial Feeder Ops',
    phone: '+91 99099 22112',
    status: 'Available',
    activeWorkOrders: 1,
    completedToday: 2
  }
];

export function getCanonicalDemoAccountsByRole(role: UserRole): CanonicalDemoIdentity[] {
  return CANONICAL_DEMO_IDENTITIES.filter(item => item.role === role);
}

export function getDefaultCanonicalIdentityForRole(role: UserRole): CanonicalDemoIdentity {
  return (
    CANONICAL_DEMO_IDENTITIES.find(item => item.role === role && item.isDefaultForRole) ||
    CANONICAL_DEMO_IDENTITIES.find(item => item.role === role) ||
    CANONICAL_DEMO_IDENTITIES[0]
  );
}

export function getCanonicalIdentityById(id: string): CanonicalDemoIdentity | undefined {
  if (!id) return undefined;
  const trimmed = id.trim();
  return CANONICAL_DEMO_IDENTITIES.find(
    item => item.id.toLowerCase() === trimmed.toLowerCase()
  );
}

export function resolveCanonicalDemoIdentity(query: {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
}): CanonicalDemoIdentity | undefined {
  // 1. Match by explicit canonical ID first
  if (query.id) {
    const byId = getCanonicalIdentityById(query.id);
    if (byId && (!query.role || byId.role === query.role)) {
      return byId;
    }
    // Reconcile legacy generic role IDs (e.g. demo_admin, demo_management, demo_employee, demo_field)
    // Note: if query.name or query.email is also provided, check name/email before falling back to role default
    if (query.name) {
      const byName = CANONICAL_DEMO_IDENTITIES.find(
        item =>
          (!query.role || item.role === query.role) &&
          item.name.toLowerCase() === query.name!.trim().toLowerCase()
      );
      if (byName) return byName;
    }
    if (query.email) {
      const byEmail = CANONICAL_DEMO_IDENTITIES.find(
        item =>
          (!query.role || item.role === query.role) &&
          item.email.toLowerCase() === query.email!.trim().toLowerCase()
      );
      if (byEmail) return byEmail;
    }
    if (query.id === 'demo_admin') return getCanonicalIdentityById('USR-ADM-001');
    if (query.id === 'demo_management') return getCanonicalIdentityById('usr_mgmt_01');
    if (query.id === 'demo_employee') return getCanonicalIdentityById('EMP-UG-1101');
    if (query.id === 'demo_field') return getCanonicalIdentityById('FLD-UG-212');
    if (query.id === 'demo_consumer') return getCanonicalIdentityById('demo_consumer');
  }

  // 2. Match by email
  if (query.email) {
    const byEmail = CANONICAL_DEMO_IDENTITIES.find(
      item =>
        (!query.role || item.role === query.role) &&
        item.email.toLowerCase() === query.email!.trim().toLowerCase()
    );
    if (byEmail) return byEmail;
  }

  // 3. Match by exact name
  if (query.name) {
    const byName = CANONICAL_DEMO_IDENTITIES.find(
      item =>
        (!query.role || item.role === query.role) &&
        item.name.toLowerCase() === query.name!.trim().toLowerCase()
    );
    if (byName) return byName;
  }

  return undefined;
}

export function createDemoSessionForIdentity(identity: CanonicalDemoIdentity): DemoSession {
  return {
    user: {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      role: identity.role,
      designation: identity.designation,
      subdivision: identity.subdivision
    },
    role: identity.role,
    loginTime: new Date().toISOString(),
    sessionToken: `vidyutflow_demo_${identity.id}_${Date.now()}`
  };
}

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

