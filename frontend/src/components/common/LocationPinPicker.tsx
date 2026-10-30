import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Interactive GPS + UGVCL Subdivision Map Pin Picker (Item #28).
 *
 * Supports:
 * 1. Browser `navigator.geolocation.getCurrentPosition(...)` auto-detection with nearest
 *    UGVCL subdivision / zone / PIN code resolution.
 * 2. Interactive clickable UGVCL Service Territory Map Grid (5 canonical Gujarat zones)
 *    for indoor / desktop kiosks without GPS hardware.
 */

export interface SelectedGeoPin {
  latitude: number;
  longitude: number;
  zone: string;
  subdivision: string;
  pinCode: string;
  suggestedAddress: string;
  source: 'gps' | 'map_pin';
}

interface PresetPin {
  zone: string;
  subdivision: string;
  cityLabel: Record<'en' | 'gu' | 'hi' | 'mr', string>;
  pinCode: string;
  lat: number;
  lng: number;
  xPct: number;
  yPct: number;
  sampleAddress: string;
}

const UGVCL_TERRITORY_PINS: PresetPin[] = [
  {
    zone: 'West',
    subdivision: 'Patan Urban Zone',
    cityLabel: {
      en: 'Palanpur / Patan (West)',
      gu: 'પાલનપુર / પાટણ (પશ્ચિમ)',
      hi: 'पालनपुर / पाटन (पश्चिम)',
      mr: 'पालनपूर / पाटण (पश्चिम)',
    },
    pinCode: '385001',
    lat: 24.1724,
    lng: 72.4346,
    xPct: 24,
    yPct: 22,
    sampleAddress: 'Plot 14, Abu Highway Circle, Palanpur-Patan Division',
  },
  {
    zone: 'North',
    subdivision: 'Mehsana City North',
    cityLabel: {
      en: 'Mehsana HQ (North)',
      gu: 'મહેસાણા HQ (ઉત્તર)',
      hi: 'महेसाणा HQ (उत्तर)',
      mr: 'महेसाणा HQ (उत्तर)',
    },
    pinCode: '384001',
    lat: 23.588,
    lng: 72.3693,
    xPct: 45,
    yPct: 44,
    sampleAddress: 'B-204, Radhanpur Road Sector, Mehsana North',
  },
  {
    zone: 'East',
    subdivision: 'Visnagar Division',
    cityLabel: {
      en: 'Himatnagar / Sabarkantha (East)',
      gu: 'હિંમતનગર / સાબરકાંઠા (પૂર્વ)',
      hi: 'हिम्मतनगर / साबरकांठा (पूर्व)',
      mr: 'हिंमतनगर / साबरकांठा (पूर्व)',
    },
    pinCode: '383001',
    lat: 23.5969,
    lng: 72.9631,
    xPct: 77,
    yPct: 42,
    sampleAddress: 'Survey 88, Motipura Bypass Feeder, Himatnagar East',
  },
  {
    zone: 'South',
    subdivision: 'Gandhinagar Sub-Division 2',
    cityLabel: {
      en: 'Gandhinagar Circle (South)',
      gu: 'ગાંધીનગર સર્કલ (દક્ષિણ)',
      hi: 'गांधीनगर सर्कल (दक्षिण)',
      mr: 'गांधीनगर सर्कल (दक्षिण)',
    },
    pinCode: '382016',
    lat: 23.2156,
    lng: 72.6369,
    xPct: 58,
    yPct: 70,
    sampleAddress: 'Sector 16, GH-4 Cross Road, Gandhinagar South',
  },
  {
    zone: 'Central',
    subdivision: 'Kalol Sub-Division',
    cityLabel: {
      en: 'Sabarmati / Kalol (Central)',
      gu: 'સાબરમતી / કલોલ (મધ્ય)',
      hi: 'साबरमती / कलोल (मध्य)',
      mr: 'साबरमती / कलोल (मध्य)',
    },
    pinCode: '380005',
    lat: 23.0858,
    lng: 72.5931,
    xPct: 48,
    yPct: 86,
    sampleAddress: '12, Power House Road, Sabarmati-Kalol Central',
  },
];

const TEXT = {
  en: {
    title: 'GPS & Service Territory Pin Selection',
    subtitle: 'Use device GPS or tap a UGVCL territory pin to auto-fill coordinates, zone & PIN code.',
    gpsBtn: 'Use Current GPS Location',
    locating: 'Detecting GPS...',
    gpsUnsupported: 'Browser geolocation unavailable — select a territory pin on the map below.',
    gpsDenied: 'GPS permission declined — tap any UGVCL subdivision pin below instead.',
    coordinatesLabel: 'Selected Geotag',
    noneSelected: 'No GPS pin selected yet',
  },
  gu: {
    title: 'GPS અને સર્વિસ વિસ્તાર પિન પસંદગી',
    subtitle: 'કોઓર્ડિનેટ્સ, ઝોન અને પિન કોડ ઓટો-ભરવા માટે GPS વાપરો અથવા UGVCL નકશા પિન પર ટેપ કરો.',
    gpsBtn: 'વર્તમાન GPS લોકેશન વાપરો',
    locating: 'GPS શોધી રહ્યું છે...',
    gpsUnsupported: 'બ્રાઉઝર GPS ઉપલબ્ધ નથી — નીચે નકશા પર પિન પસંદ કરો.',
    gpsDenied: 'GPS પરવાનગી મળી નથી — નીચે કોઈપણ UGVCL સબ-ડિવિઝન પિન પર ટેપ કરો.',
    coordinatesLabel: 'પસંદ કરેલ જીઓટેગ',
    noneSelected: 'હજુ સુધી કોઈ GPS પિન પસંદ નથી',
  },
  hi: {
    title: 'GPS और सेवा क्षेत्र पिन चयन',
    subtitle: 'निर्देशांक, ज़ोन और पिन कोड स्वतः भरने के लिए डिवाइस GPS या मानचित्र पिन चुनें।',
    gpsBtn: 'वर्तमान GPS स्थान चुनें',
    locating: 'GPS खोजा जा रहा है...',
    gpsUnsupported: 'ब्राउज़र GPS उपलब्ध नहीं है — नीचे मानचित्र पिन चुनें।',
    gpsDenied: 'GPS अनुमति अस्वीकृत — नीचे किसी भी UGVCL सब-डिवीजन पिन पर टैप करें।',
    coordinatesLabel: 'चयनित जियोटैग',
    noneSelected: 'अभी तक कोई GPS पिन चयनित नहीं',
  },
  mr: {
    title: 'GPS आणि सेवा क्षेत्र पिन निवड',
    subtitle: 'निर्देशांक, झोन आणि पिन कोड आपोआप भरण्यासाठी डिव्हाइस GPS किंवा नकाशा पिन निवडा.',
    gpsBtn: 'सध्याचे GPS स्थान वापरा',
    locating: 'GPS शोधत आहे...',
    gpsUnsupported: 'ब्राउझर GPS उपलब्ध नाही — खालील नकाशा पिन निवडा.',
    gpsDenied: 'GPS परवानगी नाकारली — खालील कोणत्याही UGVCL सब-डिव्हिजन पिनवर टॅप करा.',
    coordinatesLabel: 'निवडलेला जिओटॅग',
    noneSelected: 'अद्याप कोणताही GPS पिन निवडलेला नाही',
  },
} as const;

export function findNearestTerritoryPin(lat: number, lng: number): PresetPin {
  let best = UGVCL_TERRITORY_PINS[1];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const pin of UGVCL_TERRITORY_PINS) {
    const d = (pin.lat - lat) ** 2 + (pin.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = pin;
    }
  }
  return best;
}

interface LocationPinPickerProps {
  value: { latitude: number | null; longitude: number | null; zone?: string };
  onSelect: (pin: SelectedGeoPin) => void;
}

export const LocationPinPicker: React.FC<LocationPinPickerProps> = ({ value, onSelect }) => {
  const { language } = useLanguage();
  const lang = (language in TEXT ? language : 'en') as keyof typeof TEXT;
  const t = TEXT[lang];
  const [locating, setLocating] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const handleUseDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusNote(t.gpsUnsupported);
      return;
    }
    setLocating(true);
    setStatusNote(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const nearest = findNearestTerritoryPin(lat, lng);
        onSelect({
          latitude: lat,
          longitude: lng,
          zone: nearest.zone,
          subdivision: nearest.subdivision,
          pinCode: nearest.pinCode,
          suggestedAddress: `GPS (${lat}, ${lng}) — ${nearest.sampleAddress}`,
          source: 'gps',
        });
      },
      () => {
        setLocating(false);
        setStatusNote(t.gpsDenied);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{t.title}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleUseDeviceGps}
          disabled={locating}
          className="min-h-9 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{locating ? t.locating : t.gpsBtn}</span>
        </button>
      </div>

      {/* Interactive UGVCL North/Central Gujarat Territory Map Canvas */}
      <div
        role="group"
        aria-label={t.title}
        className="relative h-36 rounded-lg border border-blue-200/80 dark:border-slate-700 bg-gradient-to-br from-sky-50 via-emerald-50/40 to-indigo-50 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 overflow-hidden"
      >
        {UGVCL_TERRITORY_PINS.map(pin => {
          const isSelected =
            value.zone === pin.zone &&
            value.latitude !== null &&
            Math.abs(value.latitude - pin.lat) < 0.25;
          return (
            <button
              key={pin.zone}
              type="button"
              style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
              onClick={() => {
                setStatusNote(null);
                onSelect({
                  latitude: pin.lat,
                  longitude: pin.lng,
                  zone: pin.zone,
                  subdivision: pin.subdivision,
                  pinCode: pin.pinCode,
                  suggestedAddress: pin.sampleAddress,
                  source: 'map_pin',
                });
              }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute px-2 py-1 rounded-full text-[10px] font-bold shadow-xs border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 z-10'
                  : 'bg-white/95 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-500'
              }`}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{pin.cityLabel[lang]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1.5">
          {value.latitude !== null && value.longitude !== null ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {t.coordinatesLabel}: {value.latitude.toFixed(4)}°N, {value.longitude.toFixed(4)}°E
                {value.zone ? ` · Zone: ${value.zone}` : ''}
              </span>
            </>
          ) : (
            <span className="text-slate-400">{t.noneSelected}</span>
          )}
        </span>
        {statusNote && <span className="text-amber-700 dark:text-amber-400">{statusNote}</span>}
      </div>
    </div>
  );
};
