import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Plus, Trash2, Home } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { hasBackendSession, subscribeBackendSession } from '../../utils/backendSession';
import {
  SavedPremiseRecord,
  createSavedPremise,
  deleteSavedPremise,
  fetchSavedPremises,
} from '../../utils/liveData';

/**
 * Reusable Consumer Profile & Saved Premises Bar (Item #29: "Enter Once, Reuse Everywhere").
 *
 * Syncs with FastAPI `GET/POST/DELETE /v1/auth/premises` when a verified backend session is active,
 * and maintains an isolated per-user fallback in memory/localStorage when offline or in demo mode.
 */

const TEXT = {
  en: {
    title: 'Saved Premises — Enter Once, Reuse Everywhere',
    subtitle: 'Tap a saved premise to autofill applicant, address, zone, PIN & GPS across repeat requests.',
    saveBtn: 'Save Current Premise',
    labelPlaceholder: 'Premise label (e.g. Home, Shop, Farmhouse)',
    emptyNote: 'No saved premises yet — fill your details once and click "Save Current Premise".',
    appliedToast: 'Saved premise autofilled into form.',
    savedToast: 'Premise saved to your reusable profile.',
  },
  gu: {
    title: 'સાચવેલ પ્રિમાઇઝ — એકવાર લખો, દરેક અરજીમાં વાપરો',
    subtitle: 'નામ, સરનામું, ઝોન, પિન અને GPS ઓટો-ભરવા માટે સાચવેલ પ્રિમાઇઝ પસંદ કરો.',
    saveBtn: 'વર્તમાન પ્રિમાઇઝ સાચવો',
    labelPlaceholder: 'પ્રિમાઇઝનું નામ (દા.ત. ઘર, દુકાન, ફાર્મ)',
    emptyNote: 'હજુ સુધી કોઈ પ્રિમાઇઝ સાચવેલ નથી — વિગત ભરી "વર્તમાન પ્રિમાઇઝ સાચવો" દબાવો.',
    appliedToast: 'સાચવેલ પ્રિમાઇઝ ફોર્મમાં ભરાઈ ગયું.',
    savedToast: 'પ્રિમાઇઝ તમારી પ્રોફાઇલમાં સાચવવામાં આવ્યું.',
  },
  hi: {
    title: 'सहेजे गए परिसर — एक बार दर्ज करें, हर सेवा में उपयोग करें',
    subtitle: 'आवेदक, पता, ज़ोन, पिन और GPS स्वतः भरने के लिए सहेजे गए परिसर पर टैप करें।',
    saveBtn: 'वर्तमान परिसर सहेजें',
    labelPlaceholder: 'परिसर का नाम (जैसे घर, दुकान, फ़ार्म)',
    emptyNote: 'अभी कोई परिसर सहेजा नहीं गया है — विवरण भरकर "वर्तमान परिसर सहेजें" चुनें।',
    appliedToast: 'सहेजा गया परिसर फ़ॉर्म में भर दिया गया।',
    savedToast: 'परिसर आपकी प्रोफ़ाइल में सहेजा गया।',
  },
  mr: {
    title: 'जतन केलेले परिसर — एकदाच भरा, सर्व अर्जासाठी वापरा',
    subtitle: 'नाव, पत्ता, झोन, पिन आणि GPS आपोआप भरण्यासाठी जतन केलेल्या परिसरावर टॅप करा.',
    saveBtn: 'सध्याचा परिसर जतन करा',
    labelPlaceholder: 'परिसराचे नाव (उदा. घर, दुकान, फार्म)',
    emptyNote: 'अद्याप कोणताही परिसर जतन केलेला नाही — तपशील भरून "सध्याचा परिसर जतन करा" दाबा.',
    appliedToast: 'जतन केलेला परिसर फॉर्ममध्ये भरला गेला.',
    savedToast: 'परिसर तुमच्या प्रोफाइलमध्ये जतन केला गेला.',
  },
} as const;

interface SavedPremisesBarProps {
  userKey: string;
  currentDraft: {
    applicantName: string;
    phone: string;
    address: string;
    zone: string;
    subdivision: string;
    pinCode: string;
    premisesType: string;
    latitude: number | null;
    longitude: number | null;
  };
  onApplyPremise: (premise: SavedPremiseRecord) => void;
  onNotify?: (msg: string) => void;
}

export const SavedPremisesBar: React.FC<SavedPremisesBarProps> = ({
  userKey,
  currentDraft,
  onApplyPremise,
  onNotify,
}) => {
  const { language } = useLanguage();
  const lang = (language in TEXT ? language : 'en') as keyof typeof TEXT;
  const t = TEXT[lang];

  const storageKey = `vidyutflow_saved_premises_${(userKey || 'anon').toLowerCase()}`;
  const [items, setItems] = useState<SavedPremiseRecord[]>([]);
  const [labelInput, setLabelInput] = useState('Home');
  const [saving, setSaving] = useState(false);

  const loadLocal = (): SavedPremiseRecord[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistLocal = (next: SavedPremiseRecord[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  };

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (hasBackendSession()) {
        try {
          const res = await fetchSavedPremises();
          if (!cancelled) setItems(res.items);
          return;
        } catch {
          // Fall back to per-user local list if backend is offline
        }
      }
      if (!cancelled) setItems(loadLocal());
    };
    void sync();
    const unsub = subscribeBackendSession(() => {
      void sync();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [storageKey]);

  const handleSaveCurrent = async () => {
    if (!currentDraft.address.trim() || !currentDraft.applicantName.trim()) return;
    setSaving(true);
    const payload = {
      label: labelInput.trim() || 'Home',
      applicant_name: currentDraft.applicantName.trim(),
      phone: currentDraft.phone.trim(),
      address: currentDraft.address.trim(),
      zone: currentDraft.zone || 'North',
      subdivision: currentDraft.subdivision,
      pin_code: currentDraft.pinCode.trim(),
      premises_type: currentDraft.premisesType,
      latitude: currentDraft.latitude,
      longitude: currentDraft.longitude,
      is_default: items.length === 0,
    };

    try {
      if (hasBackendSession()) {
        const created = await createSavedPremise(payload);
        setItems(prev => [created, ...prev]);
        onNotify?.(t.savedToast);
        return;
      }
    } catch {
      // Fall back to local per-user storage when offline
    } finally {
      setSaving(false);
    }

    const localItem: SavedPremiseRecord = {
      id: `local-${Date.now()}`,
      ...payload,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      is_default: items.length === 0,
    };
    const next = [localItem, ...items].slice(0, 10);
    setItems(next);
    persistLocal(next);
    onNotify?.(t.savedToast);
  };

  const handleDelete = async (id: string) => {
    if (hasBackendSession() && !id.startsWith('local-')) {
      try {
        await deleteSavedPremise(id);
      } catch {
        // Ignore and remove from view
      }
    }
    const next = items.filter(i => i.id !== id);
    setItems(next);
    persistLocal(next);
  };

  return (
    <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{t.title}</span>
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            placeholder={t.labelPlaceholder}
            aria-label={t.labelPlaceholder}
            className="w-28 sm:w-36 px-2.5 py-1.5 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={saving}
            className="min-h-8 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.saveBtn}</span>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.emptyNote}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs shadow-2xs"
            >
              <button
                type="button"
                onClick={() => {
                  onApplyPremise(item);
                  onNotify?.(t.appliedToast);
                }}
                className="flex items-center gap-1.5 text-left text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
              >
                <Home className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>{item.label}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({item.zone} · {item.pin_code || 'PIN'})
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(item.id)}
                aria-label={`Delete ${item.label}`}
                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
