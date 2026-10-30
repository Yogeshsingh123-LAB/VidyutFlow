import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, MapPin, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
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
    zoneCodePlaceholder: 'झोन कोड (उदा. MehsanaRural)',
    zoneDisplayPlaceholder: 'सब-डिव्हिजन नाव',
    addZoneBtn: 'सक्रिय झोन जोडा',
    refreshBtn: 'रिफ्रेश',
    workloadLabel: 'खुला कार्यभार',
    activeBadge: 'ड्युटीवर',
    inactiveBadge: 'ऑफ ड्युटी',
  },
} as const;

export const LiveStaffAssignmentPanel: React.FC<{ onToast?: (msg: string, kind?: 'success' | 'error' | 'info') => void }> = ({
  onToast,
}) => {
  const { language } = useLanguage();
  const lang = (language in TEXT ? language : 'en') as keyof typeof TEXT;
  const t = TEXT[lang];

  const [zones, setZones] = useState<SubdivisionZoneItem[]>([]);
  const [staff, setStaff] = useState<StaffMemberItem[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Staff@1234');
  const [role, setRole] = useState<'officer' | 'engineer'>('engineer');
  const [zone, setZone] = useState('East');

  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneDisplay, setNewZoneDisplay] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDirectory = useCallback(async () => {
    if (!hasBackendSession()) {
      setLiveConnected(false);
      return;
    }
    try {
      const [zRes, sRes] = await Promise.all([fetchSubdivisionZones(), fetchStaffMembers()]);
      setZones(zRes.items);
      setStaff(sRes.items);
      setLiveConnected(true);
    } catch {
      setLiveConnected(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
    return subscribeBackendSession(() => {
      void loadDirectory();
    });
  }, [loadDirectory]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) return;
    setBusy(true);
    try {
      const created = await createStaffMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        zone,
      });
      setName('');
      setEmail('');
      await loadDirectory();
      onToast?.(
        `Created ${created.role} ${created.name} in ${created.zone} zone (claimed ${created.claimed_unassigned_requests} unassigned requests).`,
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
      const z = await upsertSubdivisionZone({
        code: newZoneCode.trim(),
        display_name: newZoneDisplay.trim(),
      });
      setZone(z.code);
      setNewZoneCode('');
      setNewZoneDisplay('');
      await loadDirectory();
      onToast?.(`Active subdivision zone "${z.code}" registered.`, 'success');
    } catch (err: any) {
      onToast?.(err?.message || 'Failed to register zone.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReassignZone = async (member: StaffMemberItem, nextZone: string) => {
    try {
      const updated = await updateStaffMember(member.id, { zone: nextZone });
      await loadDirectory();
      onToast?.(
        `Reassigned ${updated.name} to ${updated.zone} (claimed ${updated.claimed_unassigned_requests} open requests).`,
        'success'
      );
    } catch (err: any) {
      onToast?.(err?.message || 'Zone reassignment failed.', 'error');
    }
  };

  const handleToggleActive = async (member: StaffMemberItem) => {
    try {
      const updated = await updateStaffMember(member.id, { is_active: !member.is_active });
      await loadDirectory();
      onToast?.(`${updated.name} marked ${updated.is_active ? 'On Duty' : 'Off Duty'}.`, 'info');
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
          onClick={() => void loadDirectory()}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.refreshBtn}</span>
        </button>
      </div>

      {!liveConnected && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Staff Onboarding Form */}
        <form
          onSubmit={handleCreateStaff}
          className="lg:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.onboardTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <input
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
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.passwordLabel}
              aria-label={t.passwordLabel}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'officer' | 'engineer')}
                aria-label={t.roleLabel}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="engineer">Field Engineer</option>
                <option value="officer">Subdivision Officer</option>
              </select>
              <select
                value={zone}
                onChange={e => setZone(e.target.value)}
                aria-label={t.zoneLabel}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {zoneOptions.map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy || !liveConnected}
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
            disabled={busy || !liveConnected}
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
                      onChange={e => void handleReassignZone(m, e.target.value)}
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
    </div>
  );
};
