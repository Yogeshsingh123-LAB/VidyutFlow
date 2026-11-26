import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, MapPin, RefreshCw, CheckCircle2, ShieldAlert, Eye, EyeOff, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CANONICAL_DEMO_IDENTITIES,
  getCustomDemoUsers,
  verifyStaffActionPassword,
} from '../../data/demoAuthData';
import { useLanguage } from '../../i18n/LanguageContext';
import { hasBackendSession, subscribeBackendSession } from '../../utils/backendSession';
import {
  StaffMemberItem,
  SubdivisionZoneItem,
  createStaffMember,
  fetchStaffMembers,
  fetchSubdivisionZones,
  updateStaffMember,
  upsertSubdivisionZone,
} from '../../utils/liveData';

/**
 * Live Admin Staff Creation & Subdivision Zone Assignment Panel (Items #1 & #30).
 *
 * Replaces the static demo-only toast in AdminPortal with live FastAPI staff onboarding,
 * subdivision zone creation, zone reassignment, duty-status toggling, and automatic
 * claiming of unassigned zone requests.
 */

const TEXT = {
  en: {
    title: 'Live Staff Onboarding & Subdivision Zone Assignment',
    subtitle: 'Create Officers & Field Engineers, manage active UGVCL zones, and auto-route unassigned zone requests.',
    offlineNotice: 'Sign in with an Admin server session (`admin@vidyut.local`) to persist staff & zone changes to FastAPI.',
    onboardTitle: 'Onboard New Officer / Field Engineer',
    zoneCreateTitle: 'Register New Subdivision Zone',
    nameLabel: 'Full Name',
    emailLabel: 'Official Email',
    passwordLabel: 'Initial Password (min 8 chars)',
    roleLabel: 'Operational Role',
    zoneLabel: 'Assigned Zone',
    createStaffBtn: 'Create & Assign Staff',
    adminPasswordLabel: 'Admin Authorization Password',
    adminPasswordPlaceholder: 'Enter your admin password to authorize',
    adminPasswordError: 'Incorrect admin password. Enter your password to authorize creating & assigning staff.',
    zoneCodePlaceholder: 'Zone code (e.g. MehsanaRural)',
    zoneDisplayPlaceholder: 'Subdivision display name',
    addZoneBtn: 'Add Active Zone',
    refreshBtn: 'Refresh Directory',
    workloadLabel: 'Open Queue',
    activeBadge: 'On Duty',
    inactiveBadge: 'Off Duty',
  },
  gu: {
    title: 'લાઇવ સ્ટાફ ઓનબોર્ડિંગ અને સબ-ડિવિઝન ઝોન ફાળવણી',
    subtitle: 'નવા ઓફિસર અને ફિલ્ડ એન્જિનિયર ઉમેરો, UGVCL ઝોન મેનેજ કરો અને પેન્ડિંગ અરજીઓ ઓટો-સોંપો.',
    offlineNotice: 'FastAPI માં ફેરફારો સાચવવા માટે એડમિન સર્વર સેશનથી લોગિન કરો.',
    onboardTitle: 'નવા ઓફિસર / ફિલ્ડ એન્જિનિયર ઉમેરો',
    zoneCreateTitle: 'નવો સબ-ડિવિઝન ઝોન નોંધો',
    nameLabel: 'પૂરું નામ',
    emailLabel: 'સત્તાવાર ઈમેલ',
    passwordLabel: 'પ્રારંભિક પાસવર્ડ (ઓછામાં ઓછા 8 અક્ષર)',
    roleLabel: 'ભૂમિકા',
    zoneLabel: 'ફાળવેલ ઝોન',
    createStaffBtn: 'સ્ટાફ બનાવો અને સોંપો',
    adminPasswordLabel: 'એડમિન અધિકૃત પાસવર્ડ',
    adminPasswordPlaceholder: 'મંજૂરી માટે તમારો એડમિન પાસવર્ડ દાખલ કરો',
    adminPasswordError: 'એડમિન પાસવર્ડ ખોટો છે. સ્ટાફ બનાવવા અને સોંપવા માટે તમારો પાસવર્ડ દાખલ કરો.',
    zoneCodePlaceholder: 'ઝોન કોડ (દા.ત. MehsanaRural)',
    zoneDisplayPlaceholder: 'સબ-ડિવિઝન નામ',
    addZoneBtn: 'સક્રિય ઝોન ઉમેરો',
    refreshBtn: 'રિફ્રેશ',
    workloadLabel: 'ખુલ્લું કાર્ય',
    activeBadge: 'ફરજ પર',
    inactiveBadge: 'નિષ્ક્રિય',
  },
  hi: {
    title: 'लाइव स्टाफ़ ऑनबोर्डिंग और सब-डिवीजन ज़ोन आवंटन',
    subtitle: 'नए ऑफ़िसर और फ़ील्ड इंजीनियर जोड़ें, सक्रिय UGVCL ज़ोन प्रबंधित करें और लंबित अनुरोध आवंटित करें।',
    offlineNotice: 'FastAPI में स्टाफ़ और ज़ोन परिवर्तन सहेजने के लिए एडमिन सर्वर सत्र से साइन इन करें।',
    onboardTitle: 'नया ऑफ़िसर / फ़ील्ड इंजीनियर जोड़ें',
    zoneCreateTitle: 'नया सब-डिवीजन ज़ोन पंजीकृत करें',
    nameLabel: 'पूरा नाम',
    emailLabel: 'आधिकारिक ईमेल',
    passwordLabel: 'प्रारंभिक पासवर्ड (न्यूनतम 8 अक्षर)',
    roleLabel: 'भूमिका',
    zoneLabel: 'आवंटित ज़ोन',
    createStaffBtn: 'स्टाफ़ बनाएं और आवंटित करें',
    adminPasswordLabel: 'एडमिन प्राधिकरण पासवर्ड',
    adminPasswordPlaceholder: 'अनुमति देने के लिए अपना एडमिन पासवर्ड दर्ज करें',
    adminPasswordError: 'गलत एडमिन पासवर्ड। स्टाफ़ बनाने और आवंटित करने के लिए अपना पासवर्ड दर्ज करें।',
    zoneCodePlaceholder: 'ज़ोन कोड (जैसे MehsanaRural)',
    zoneDisplayPlaceholder: 'सब-डिवीजन नाम',
    addZoneBtn: 'सक्रिय ज़ोन जोड़ें',
    refreshBtn: 'रीफ़्रेश',
    workloadLabel: 'खुला कार्यभार',
    activeBadge: 'ड्यूटी पर',
    inactiveBadge: 'ऑफ़ ड्यूटी',
  },
  mr: {
    title: 'लाइव्ह स्टाफ ऑनबोर्डिंग आणि सब-डिव्हिजन झोन वाटप',
    subtitle: 'नवीन ऑफिसर व फील्ड इंजिनिअर जोडा, सक्रिय UGVCL झोन व्यवस्थापित करा आणि प्रलंबित अर्ज वाटप करा.',
    offlineNotice: 'FastAPI मध्ये बदल जतन करण्यासाठी अॅडमिन सर्व्हर सत्राने साइन इन करा.',
    onboardTitle: 'नवीन ऑफिसर / फील्ड इंजिनिअर जोडा',
    zoneCreateTitle: 'नवीन सब-डिव्हिजन झोन नोंदवा',
    nameLabel: 'पूर्ण नाव',
    emailLabel: 'अधिकृत ईमेल',
    passwordLabel: 'प्रारंभिक पासवर्ड (किमान 8 अक्षरे)',
    roleLabel: 'भूमिका',
    zoneLabel: 'नेमलेला झोन',
    createStaffBtn: 'स्टाफ तयार करा आणि नेमा',
    adminPasswordLabel: 'अॅडमिन अधिकृत पासवर्ड',
    adminPasswordPlaceholder: 'मंजुरीसाठी तुमचा अॅडमिन पासवर्ड टाका',
    adminPasswordError: 'चुकीचा अॅडमिन पासवर्ड. स्टाफ तयार करण्यासाठी आणि नेमण्यासाठी तुमचा पासवर्ड टाका.',
    zoneCodePlaceholder: 'झोन कोड (उदा. MehsanaRural)',
    zoneDisplayPlaceholder: 'सब-डिव्हिजन नाव',
    addZoneBtn: 'सक्रिय झोन जोडा',
    refreshBtn: 'रिफ्रेश',
    workloadLabel: 'खुला कार्यभार',
    activeBadge: 'ड्युटीवर',
    inactiveBadge: 'ऑफ ड्युटी',
  },
} as const;

export interface OfficerPostOption {
  post: string;
  role: 'officer' | 'engineer';
  roleLabel: string;
  subdivisions: { name: string; zone: string }[];
}

export const OFFICER_POST_OPTIONS: OfficerPostOption[] = [
  {
    post: 'Sub-Divisional Officer (SDO)',
    role: 'officer',
    roleLabel: 'Office Employee ERP',
    subdivisions: [
      { name: 'Mehsana City North', zone: 'North' },
      { name: 'Mehsana Industrial GIDC', zone: 'North' },
      { name: 'Gandhinagar Sub-Div 2', zone: 'Central' },
      { name: 'Kadi Rural (Ag)', zone: 'West' },
      { name: 'Visnagar Sub-Division', zone: 'East' },
      { name: 'Kalol Industrial Sub-Division', zone: 'South' },
    ],
  },
  {
    post: 'Deputy Executive Engineer (DEE)',
    role: 'officer',
    roleLabel: 'Office Employee ERP',
    subdivisions: [
      { name: 'Mehsana City North', zone: 'North' },
      { name: 'Mehsana Industrial GIDC', zone: 'North' },
      { name: 'Gandhinagar Sub-Div 2', zone: 'Central' },
      { name: 'Patan City Sub-Division', zone: 'West' },
    ],
  },
  {
    post: 'Assistant Engineer (Commercial & Billing)',
    role: 'officer',
    roleLabel: 'Office Employee ERP',
    subdivisions: [
      { name: 'Mehsana City North', zone: 'North' },
      { name: 'Gandhinagar Sub-Div 2', zone: 'Central' },
      { name: 'Visnagar Sub-Division', zone: 'East' },
      { name: 'Kalol Industrial Sub-Division', zone: 'South' },
    ],
  },
  {
    post: 'Executive Engineer (Circle Office)',
    role: 'officer',
    roleLabel: 'Office Employee ERP',
    subdivisions: [
      { name: 'Mehsana Circle Division', zone: 'North' },
      { name: 'Gandhinagar Circle Division', zone: 'Central' },
      { name: 'Patan Circle Division', zone: 'West' },
      { name: 'Sabarkantha Circle Division', zone: 'East' },
    ],
  },
  {
    post: 'Junior Engineer (Field Operations)',
    role: 'engineer',
    roleLabel: 'Field Engineer',
    subdivisions: [
      { name: 'Mehsana Rural Feeder Wing', zone: 'North' },
      { name: 'Mehsana Industrial GIDC', zone: 'North' },
      { name: 'Gandhinagar Sub-Div 2', zone: 'Central' },
      { name: 'Kadi Rural Feeder Wing', zone: 'West' },
      { name: 'Visnagar Feeder Wing', zone: 'East' },
    ],
  },
  {
    post: 'Field Maintenance Engineer',
    role: 'engineer',
    roleLabel: 'Field Engineer',
    subdivisions: [
      { name: 'Mehsana Rural Feeder Wing', zone: 'North' },
      { name: 'Kalol Industrial Sub-Division', zone: 'South' },
      { name: 'Patan Rural Feeder Wing', zone: 'West' },
    ],
  },
];

export const LiveStaffAssignmentPanel: React.FC<{
  onToast?: (msg: string, kind?: 'success' | 'error' | 'info') => void;
  onStaffCreated?: (staff: {
    name: string;
    email: string;
    post: string;
    roleLabel: string;
    subdivision: string;
    zone: string;
  }) => void;
}> = ({
  onToast,
  onStaffCreated,
}) => {
  const { activeUser } = useApp();
  const { language } = useLanguage();
  const lang = (language in TEXT ? language : 'en') as keyof typeof TEXT;
  const t = TEXT[lang];

  const [zones, setZones] = useState<SubdivisionZoneItem[]>([]);
  const [staff, setStaff] = useState<StaffMemberItem[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [pendingZoneReassign, setPendingZoneReassign] = useState<{
    member: StaffMemberItem;
    nextZone: string;
  } | null>(null);
  const [reassignPassword, setReassignPassword] = useState('');
  const [reassignPasswordError, setReassignPasswordError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState(OFFICER_POST_OPTIONS[0].post);
  const [subdivision, setSubdivision] = useState(OFFICER_POST_OPTIONS[0].subdivisions[0].name);
  const [zone, setZone] = useState(OFFICER_POST_OPTIONS[0].subdivisions[0].zone);

  const activePostConfig =
    OFFICER_POST_OPTIONS.find(p => p.post === selectedPost) || OFFICER_POST_OPTIONS[0];
  const role = activePostConfig.role;

  const handlePostChange = (nextPost: string) => {
    setSelectedPost(nextPost);
    const cfg = OFFICER_POST_OPTIONS.find(p => p.post === nextPost) || OFFICER_POST_OPTIONS[0];
    if (cfg.subdivisions.length > 0) {
      setSubdivision(cfg.subdivisions[0].name);
      setZone(cfg.subdivisions[0].zone);
    }
  };

  const handleSubdivisionChange = (nextSub: string) => {
    setSubdivision(nextSub);
    const matched = activePostConfig.subdivisions.find(s => s.name === nextSub);
    if (matched) {
      setZone(matched.zone);
    }
  };

  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneDisplay, setNewZoneDisplay] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const buildLocalDirectorySnapshot = useCallback((): {
    zones: SubdivisionZoneItem[];
    staff: StaffMemberItem[];
  } => {
    const baseZones = ['North', 'South', 'East', 'West', 'Central'];
    const mapRole = (r: string): StaffMemberItem['role'] =>
      r === 'field' ? 'engineer' : r === 'admin' ? 'admin' : 'officer';
    const inferZone = (subdivision?: string): string => {
      const s = (subdivision || '').toLowerCase();
      if (s.includes('south')) return 'South';
      if (s.includes('east')) return 'East';
      if (s.includes('west')) return 'West';
      if (s.includes('central')) return 'Central';
      return 'North';
    };

    const canonicalStaff: StaffMemberItem[] = CANONICAL_DEMO_IDENTITIES.filter(
      u => u.role === 'employee' || u.role === 'field' || u.role === 'admin'
    ).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: mapRole(u.role),
      zone: inferZone(u.subdivision),
      is_active: true,
      active_workload: u.role === 'field' ? 2 : u.role === 'employee' ? 3 : 0,
      created_at: null,
    }));

    const customStaff: StaffMemberItem[] = getCustomDemoUsers()
      .filter(u => u.role === 'employee' || u.role === 'field' || u.role === 'admin')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: mapRole(u.role),
        zone: inferZone((u as { subdivision?: string }).subdivision),
        is_active: true,
        active_workload: 0,
        created_at: null,
      }));

    const seen = new Set<string>();
    const mergedStaff = [...canonicalStaff, ...customStaff].filter(item => {
      const key = item.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const mergedZones: SubdivisionZoneItem[] = baseZones.map(code => ({
      code,
      display_name: `${code} Zone`,
      circle_name: 'UGVCL Circle',
      pin_prefix: '38',
      center_lat: 23.6,
      center_lng: 72.4,
      is_active: true,
      officer_count: mergedStaff.filter(s => s.zone === code && s.role === 'officer').length,
      engineer_count: mergedStaff.filter(s => s.zone === code && s.role === 'engineer').length,
    }));

    return { zones: mergedZones, staff: mergedStaff };
  }, []);

  const loadDirectory = useCallback(async (manual = false) => {
    setRefreshing(true);
    try {
      if (hasBackendSession()) {
        try {
          const [zRes, sRes] = await Promise.all([fetchSubdivisionZones(), fetchStaffMembers()]);
          setZones(zRes.items);
          setStaff(sRes.items);
          setLiveConnected(true);
          if (manual) {
            onToast?.(`Directory refreshed (${sRes.items.length} staff · ${zRes.items.length} zones).`, 'info');
          }
          return;
        } catch {
          // Fall back to local directory snapshot
        }
      }
      setLiveConnected(false);
      const local = buildLocalDirectorySnapshot();
      setZones(prev => {
        const existingCodes = new Set(local.zones.map(z => z.code));
        const customZones = prev.filter(z => !existingCodes.has(z.code));
        return [...local.zones, ...customZones];
      });
      setStaff(prev => {
        const seen = new Set(local.staff.map(s => s.email.toLowerCase()));
        const sessionCreated = prev.filter(s => !seen.has(s.email.toLowerCase()));
        return [...local.staff, ...sessionCreated];
      });
      if (manual) {
        onToast?.(`Directory refreshed (${local.staff.length} staff · ${local.zones.length} zones).`, 'info');
      }
    } finally {
      setRefreshing(false);
    }
  }, [buildLocalDirectorySnapshot, onToast]);

  useEffect(() => {
    void loadDirectory();
    return subscribeBackendSession(() => {
      void loadDirectory();
    });
  }, [loadDirectory]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      onToast?.('Please enter full name, official email, and a password of at least 8 characters.', 'error');
      return;
    }
    const isAdminPasswordValid = verifyStaffActionPassword(adminPassword, {
      id: activeUser?.id,
      email: activeUser?.email,
      role: 'admin',
    });
    if (!isAdminPasswordValid) {
      setAdminPasswordError(t.adminPasswordError);
      onToast?.(t.adminPasswordError, 'error');
      return;
    }
    setBusy(true);
    try {
      let claimedCount = 0;
      if (liveConnected) {
        const created = await createStaffMember({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          zone,
        });
        claimedCount = created.claimed_unassigned_requests;
        await loadDirectory();
      } else {
        setStaff(prev => [
          ...prev,
          {
            id: `STF-${Date.now().toString().slice(-4)}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            zone,
            is_active: true,
            active_workload: 0,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      onStaffCreated?.({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        post: selectedPost,
        roleLabel: `${activePostConfig.roleLabel} — ${selectedPost}`,
        subdivision,
        zone,
      });
      setName('');
      setEmail('');
      setPassword('');
      setAdminPassword('');
      onToast?.(
        liveConnected
          ? `Created ${selectedPost} (${name.trim()}) for ${subdivision} [${zone} zone] — claimed ${claimedCount} unassigned requests.`
          : `Created ${selectedPost} credential for ${name.trim()} (${subdivision}).`,
        'success'
      );
    } catch (err: any) {
      onToast?.(err?.message || 'Failed to create staff member.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneCode.trim() || !newZoneDisplay.trim()) return;
    setBusy(true);
    try {
      const code = newZoneCode.trim();
      const displayName = newZoneDisplay.trim();
      if (liveConnected) {
        const z = await upsertSubdivisionZone({
          code,
          display_name: displayName,
        });
        setZone(z.code);
        await loadDirectory();
        onToast?.(`Active subdivision zone "${z.code}" registered.`, 'success');
      } else {
        setZones(prev => {
          if (prev.some(z => z.code.toLowerCase() === code.toLowerCase())) return prev;
          return [
            ...prev,
            {
              code,
              display_name: displayName,
              circle_name: 'UGVCL Circle',
              pin_prefix: '38',
              center_lat: 23.6,
              center_lng: 72.4,
              is_active: true,
              officer_count: 0,
              engineer_count: 0,
            },
          ];
        });
        setZone(code);
        onToast?.(`Active subdivision zone "${code}" registered.`, 'success');
      }
      setNewZoneCode('');
      setNewZoneDisplay('');
    } catch (err: any) {
      onToast?.(err?.message || 'Failed to register zone.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReassignZone = (member: StaffMemberItem, nextZone: string) => {
    if (nextZone === member.zone) return;
    setReassignPassword('');
    setReassignPasswordError(null);
    setPendingZoneReassign({ member, nextZone });
  };

  const handleConfirmReassignZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingZoneReassign) return;
    const ok = verifyStaffActionPassword(reassignPassword, {
      id: activeUser?.id,
      email: activeUser?.email,
      role: 'admin',
    });
    if (!ok) {
      setReassignPasswordError(t.adminPasswordError);
      return;
    }
    try {
      if (liveConnected) {
        const updated = await updateStaffMember(pendingZoneReassign.member.id, {
          zone: pendingZoneReassign.nextZone,
        });
        await loadDirectory();
        onToast?.(
          `Reassigned ${updated.name} to ${updated.zone} (claimed ${updated.claimed_unassigned_requests} open requests).`,
          'success'
        );
      } else {
        const target = pendingZoneReassign;
        setStaff(prev =>
          prev.map(m => (m.id === target.member.id ? { ...m, zone: target.nextZone } : m))
        );
        onToast?.(`Reassigned ${target.member.name} to ${target.nextZone}.`, 'success');
      }
      setPendingZoneReassign(null);
      setReassignPassword('');
      setReassignPasswordError(null);
    } catch (err: any) {
      onToast?.(err?.message || 'Zone reassignment failed.', 'error');
    }
  };

  const handleToggleActive = async (member: StaffMemberItem) => {
    try {
      if (liveConnected) {
        const updated = await updateStaffMember(member.id, { is_active: !member.is_active });
        await loadDirectory();
        onToast?.(`${updated.name} marked ${updated.is_active ? 'On Duty' : 'Off Duty'}.`, 'info');
      } else {
        const nextActive = !member.is_active;
        setStaff(prev => prev.map(m => (m.id === member.id ? { ...m, is_active: nextActive } : m)));
        onToast?.(`${member.name} marked ${nextActive ? 'On Duty' : 'Off Duty'}.`, 'info');
      }
    } catch (err: any) {
      onToast?.(err?.message || 'Status update failed.', 'error');
    }
  };

  const zoneOptions = zones.length > 0 ? zones.map(z => z.code) : ['North', 'South', 'East', 'West', 'Central'];

  return (
    <div
      id="live-staff-assignment-panel"
      className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{t.title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDirectory(true)}
          disabled={refreshing}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{t.refreshBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Staff Onboarding Form */}
        <form
          onSubmit={handleCreateStaff}
          className="lg:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.onboardTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <input
              id="staff-onboard-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.nameLabel}
              aria-label={t.nameLabel}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.emailLabel}
              aria-label={t.emailLabel}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.passwordLabel}
                aria-label={t.passwordLabel}
                className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <select
              value={selectedPost}
              onChange={e => handlePostChange(e.target.value)}
              aria-label="Officer Post"
              className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {OFFICER_POST_OPTIONS.map(opt => (
                <option key={opt.post} value={opt.post}>
                  {opt.post}
                </option>
              ))}
            </select>
            <select
              value={subdivision}
              onChange={e => handleSubdivisionChange(e.target.value)}
              aria-label="Assigned Sub-Division"
              className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {activePostConfig.subdivisions.map(sub => (
                <option key={sub.name} value={sub.name}>
                  {sub.name} ({sub.zone} Zone)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="staff-create-admin-password"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              {t.adminPasswordLabel} *
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="staff-create-admin-password"
                type={showAdminPassword ? 'text' : 'password'}
                required
                value={adminPassword}
                onChange={e => {
                  setAdminPassword(e.target.value);
                  if (adminPasswordError) setAdminPasswordError(null);
                }}
                placeholder={t.adminPasswordPlaceholder}
                className="w-full pl-8 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showAdminPassword ? 'Hide admin password' : 'Show admin password'}
              >
                {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {adminPasswordError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {adminPasswordError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-9 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {t.createStaffBtn}
          </button>
        </form>

        {/* Subdivision Zone Registration Form */}
        <form
          onSubmit={handleCreateZone}
          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5"
        >
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.zoneCreateTitle}</span>
          </p>
          <input
            type="text"
            required
            value={newZoneCode}
            onChange={e => setNewZoneCode(e.target.value)}
            placeholder={t.zoneCodePlaceholder}
            aria-label={t.zoneCodePlaceholder}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <input
            type="text"
            required
            value={newZoneDisplay}
            onChange={e => setNewZoneDisplay(e.target.value)}
            placeholder={t.zoneDisplayPlaceholder}
            aria-label={t.zoneDisplayPlaceholder}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {t.addZoneBtn}
          </button>
        </form>
      </div>

      {/* Live Staff Assignment Table */}
      {staff.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Staff</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">{t.zoneLabel}</th>
                <th className="p-2.5">{t.workloadLabel}</th>
                <th className="p-2.5">Duty Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map(m => (
                <tr key={m.id}>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.email}</div>
                  </td>
                  <td className="p-2.5 uppercase font-mono text-[11px]">{m.role}</td>
                  <td className="p-2.5">
                    <select
                      value={m.zone}
                      onChange={e => handleReassignZone(m, e.target.value)}
                      aria-label={`Reassign zone for ${m.name}`}
                      className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      {zoneOptions.map(z => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5 font-mono">{m.active_workload}</td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(m)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                        m.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{m.is_active ? t.activeBadge : t.inactiveBadge}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingZoneReassign && (
        <form
          onSubmit={handleConfirmReassignZone}
          className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5 text-xs"
        >
          <div className="font-semibold text-amber-950 dark:text-amber-200">
            Authorize zone reassignment for <strong>{pendingZoneReassign.member.name}</strong> ({pendingZoneReassign.member.zone} → {pendingZoneReassign.nextZone})
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              required
              value={reassignPassword}
              onChange={e => {
                setReassignPassword(e.target.value);
                if (reassignPasswordError) setReassignPasswordError(null);
              }}
              placeholder={t.adminPasswordPlaceholder}
              className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingZoneReassign(null);
                  setReassignPassword('');
                  setReassignPasswordError(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
          {reassignPasswordError && (
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {reassignPasswordError}
            </p>
          )}
        </form>
      )}
    </div>
  );
};
