import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import {
  Phone,
  Mail,
  MapPin,
  Building,
  MessageSquare,
  Send,
  CheckCircle2,
  Headphones,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface ContactUsPageProps {
  onBackHome: () => void;
}

const CONTACT_COPY: Record<
  LanguageCode,
  {
    pageTitle: string;
    pageSubtitle: string;
    tollFreeBanner: string;
    tollFreeLabel: string;
    whatsappLabel: string;
    whatsappSub: string;
    customerSupportLabel: string;
    corporateOfficeLabel: string;
    tollFreeShort: string;
    mapTitle: string;
    openMaps: string;
    reachOutTitle: string;
    reachOutSub: string;
    thankYouTitle: string;
    thankYouBody: string;
    sendAnother: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    contactLabel: string;
    contactPlaceholder: string;
    circleLabel: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitBtn: string;
    directoryTitle: string;
  }
> = {
  en: {
    pageTitle: 'Contact',
    pageSubtitle: 'Uttar Gujarat Vij Company Limited — Corporate Office, Circle Offices & 24×7 Consumer Support',
    tollFreeBanner: '24×7 Toll-Free: 19121 / 19124',
    tollFreeLabel: 'Toll-Free Helpline',
    whatsappLabel: 'WhatsApp Helpline',
    whatsappSub: 'Outage & Billing Help',
    customerSupportLabel: 'Customer Support',
    corporateOfficeLabel: 'Corporate Office',
    tollFreeShort: 'Toll Free',
    mapTitle: 'Location Map & Office Locator',
    openMaps: 'Open in Google Maps',
    reachOutTitle: 'Reach Out to Us',
    reachOutSub: 'Send your query, billing question, or feedback directly to UGVCL',
    thankYouTitle: 'Thank You for Reaching Out!',
    thankYouBody: 'Your inquiry has been noted. For immediate assistance with power outages or billing, please call 19121 / 1800-233-155335 or email ccc@ugvcl.com.',
    sendAnother: 'Send Another Inquiry',
    fullNameLabel: 'Full Name *',
    fullNamePlaceholder: 'Enter your full name',
    contactLabel: 'Mobile Number or Email *',
    contactPlaceholder: '10-digit mobile or email address',
    circleLabel: 'UGVCL Office / Circle',
    messageLabel: 'Message / Query *',
    messagePlaceholder: 'Describe your query or feedback...',
    submitBtn: 'Submit Message',
    directoryTitle: 'UGVCL Corporate & Circle Offices',
  },
  gu: {
    pageTitle: 'સંપર્ક',
    pageSubtitle: 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ — કોર્પોરેટ ઓફિસ, સર્કલ ઓફિસો અને 24×7 ગ્રાહક સહાય',
    tollFreeBanner: '24×7 ટોલ-ફ્રી: 19121 / 19124',
    tollFreeLabel: 'ટોલ-ફ્રી હેલ્પલાઇન',
    whatsappLabel: 'WhatsApp હેલ્પલાઇન',
    whatsappSub: 'વીજ પુરવઠા અને બિલિંગ સહાય',
    customerSupportLabel: 'ગ્રાહક સહાય',
    corporateOfficeLabel: 'કોર્પોરેટ ઓફિસ',
    tollFreeShort: 'ટોલ ફ્રી',
    mapTitle: 'સ્થાન નકશો અને ઓફિસ લોકેટર',
    openMaps: 'Google Maps માં ખોલો',
    reachOutTitle: 'અમારો સંપર્ક કરો',
    reachOutSub: 'તમારો પ્રશ્ન, બિલિંગ પૂછપરછ અથવા પ્રતિસાદ સીધો UGVCL ને મોકલો',
    thankYouTitle: 'સંપર્ક કરવા બદલ આભાર!',
    thankYouBody: 'તમારી પૂછપરછ નોંધવામાં આવી છે. તાત્કાલિક સહાય માટે 19121 / 1800-233-155335 પર કૉલ કરો અથવા ccc@ugvcl.com પર ઇમેઇલ કરો.',
    sendAnother: 'બીજી પૂછપરછ મોકલો',
    fullNameLabel: 'પૂરું નામ *',
    fullNamePlaceholder: 'તમારું પૂરું નામ દાખલ કરો',
    contactLabel: 'મોબાઇલ નંબર અથવા ઇમેઇલ *',
    contactPlaceholder: '10-અંકનો મોબાઇલ અથવા ઇમેઇલ સરનામું',
    circleLabel: 'UGVCL ઓફિસ / સર્કલ',
    messageLabel: 'સંદેશ / પ્રશ્ન *',
    messagePlaceholder: 'તમારો પ્રશ્ન અથવા પ્રતિસાદ લખો...',
    submitBtn: 'સંદેશ મોકલો',
    directoryTitle: 'UGVCL કોર્પોરેટ અને સર્કલ ઓફિસો',
  },
  hi: {
    pageTitle: 'संपर्क',
    pageSubtitle: 'उत्तर गुजरात विज कंपनी लिमिटेड — कॉर्पोरेट कार्यालय, सर्कल कार्यालय एवं 24×7 उपभोक्ता सहायता',
    tollFreeBanner: '24×7 टोल-फ्री: 19121 / 19124',
    tollFreeLabel: 'टोल-फ्री हेल्पलाइन',
    whatsappLabel: 'WhatsApp हेल्पलाइन',
    whatsappSub: 'आउटेज और बिलिंग सहायता',
    customerSupportLabel: 'ग्राहक सहायता',
    corporateOfficeLabel: 'कॉर्पोरेट कार्यालय',
    tollFreeShort: 'टोल फ्री',
    mapTitle: 'स्थान मानचित्र और कार्यालय लोकेटर',
    openMaps: 'Google Maps में खोलें',
    reachOutTitle: 'हमसे संपर्क करें',
    reachOutSub: 'अपना प्रश्न, बिलिंग पूछताछ या प्रतिक्रिया सीधे UGVCL को भेजें',
    thankYouTitle: 'संपर्क करने के लिए धन्यवाद!',
    thankYouBody: 'आपकी पूछताछ दर्ज कर ली गई है। तत्काल सहायता के लिए 19121 / 1800-233-155335 पर कॉल करें या ccc@ugvcl.com पर ईमेल करें।',
    sendAnother: 'एक और पूछताछ भेजें',
    fullNameLabel: 'पूरा नाम *',
    fullNamePlaceholder: 'अपना पूरा नाम दर्ज करें',
    contactLabel: 'मोबाइल नंबर या ईमेल *',
    contactPlaceholder: '10-अंकीय मोबाइल या ईमेल पता',
    circleLabel: 'UGVCL कार्यालय / सर्कल',
    messageLabel: 'संदेश / प्रश्न *',
    messagePlaceholder: 'अपना प्रश्न या प्रतिक्रिया लिखें...',
    submitBtn: 'संदेश भेजें',
    directoryTitle: 'UGVCL कॉर्पोरेट और सर्कल कार्यालय',
  },
  mr: {
    pageTitle: 'संपर्क',
    pageSubtitle: 'उत्तर गुजरात वीज कंपनी लिमिटेड — कॉर्पोरेट कार्यालय, सर्कल कार्यालये आणि 24×7 ग्राहक सहाय्य',
    tollFreeBanner: '24×7 टोल-फ्री: 19121 / 19124',
    tollFreeLabel: 'टोल-फ्री हेल्पलाइन',
    whatsappLabel: 'WhatsApp हेल्पलाइन',
    whatsappSub: 'वीज पुरवठा व बिलिंग मदत',
    customerSupportLabel: 'ग्राहक सहाय्य',
    corporateOfficeLabel: 'कॉर्पोरेट कार्यालय',
    tollFreeShort: 'टोल फ्री',
    mapTitle: 'स्थान नकाशा आणि कार्यालय लोकेटर',
    openMaps: 'Google Maps मध्ये उघडा',
    reachOutTitle: 'आमच्याशी संपर्क साधा',
    reachOutSub: 'तुमचा प्रश्न, बिलिंग चौकशी किंवा अभिप्राय थेट UGVCL ला पाठवा',
    thankYouTitle: 'संपर्क साधल्याबद्दल धन्यवाद!',
    thankYouBody: 'तुमची चौकशी नोंदवली गेली आहे. तात्काळ मदतीसाठी 19121 / 1800-233-155335 वर कॉल करा किंवा ccc@ugvcl.com वर ईमेल करा.',
    sendAnother: 'आणखी एक चौकशी पाठवा',
    fullNameLabel: 'पूर्ण नाव *',
    fullNamePlaceholder: 'तुमचे पूर्ण नाव प्रविष्ट करा',
    contactLabel: 'मोबाईल नंबर किंवा ईमेल *',
    contactPlaceholder: '10-अंकी मोबाईल किंवा ईमेल पत्ता',
    circleLabel: 'UGVCL कार्यालय / सर्कल',
    messageLabel: 'संदेश / प्रश्न *',
    messagePlaceholder: 'तुमचा प्रश्न किंवा अभिप्राय लिहा...',
    submitBtn: 'संदेश पाठवा',
    directoryTitle: 'UGVCL कॉर्पोरेट आणि सर्कल कार्यालये',
  },
};

interface UgvclOffice {
  id: string;
  name: string;
  shortLabel: string;
  address: string;
  phones: string[];
  coords: [number, number];
}

const UGVCL_OFFICES: UgvclOffice[] = [
  {
    id: 'corporate',
    name: 'Registered & Corporate Office (Mehsana)',
    shortLabel: 'Corporate HQ',
    address: 'Visnagar Road, Mehsana – 384001, North Gujarat, India',
    phones: ['02762-222080', '02762-222081'],
    coords: [23.5988, 72.3935],
  },
  {
    id: 'mehsana',
    name: 'Mehsana Circle Office',
    shortLabel: 'Mehsana Circle',
    address: 'Mehsana, Dist. Mehsana – 384001, Gujarat',
    phones: ['02762-222424'],
    coords: [23.5880, 72.3693],
  },
  {
    id: 'sabarmati',
    name: 'Sabarmati Circle Office',
    shortLabel: 'Sabarmati Circle',
    address: 'O&M Circle Office Compound, Sabarmati, Ahmedabad – 380005, Gujarat',
    phones: ['079-27500981', '079-27500214', '079-27506436'],
    coords: [23.0819, 72.5873],
  },
  {
    id: 'palanpur',
    name: 'Palanpur Circle Office',
    address: 'Highway Char Rasta, Palanpur, Dist. Banaskantha – 385001, Gujarat',
    shortLabel: 'Palanpur Circle',
    phones: ['02742-255451', '02742-255452', '02742-255471'],
    coords: [24.1724, 72.4346],
  },
  {
    id: 'himatnagar',
    name: 'Himatnagar Circle Office',
    shortLabel: 'Himatnagar Circle',
    address: 'Hajipura, Himatnagar, Dist. Sabarkantha – 383001, Gujarat',
    phones: ['02772-240262'],
    coords: [23.5978, 72.9663],
  },
];

export const ContactUsPage: React.FC<ContactUsPageProps> = ({ onBackHome }) => {
  const { language } = useLanguage();
  const cCopy = CONTACT_COPY[language] || CONTACT_COPY.en;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeOfficeId, setActiveOfficeId] = useState<string>('corporate');

  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('Corporate Office (Mehsana)');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const activeOffice = UGVCL_OFFICES.find((o) => o.id === activeOfficeId) || UGVCL_OFFICES[0];

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: UGVCL_OFFICES[0].coords,
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    UGVCL_OFFICES.forEach((office) => {
      const marker = L.circleMarker(office.coords, {
        radius: office.id === 'corporate' ? 9 : 7,
        color: '#0A2540',
        weight: 2.5,
        fillColor: '#FF6B00',
        fillOpacity: 0.9,
      }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;"><strong>${office.name}</strong><br/>${office.address}<br/>Tel: ${office.phones.join(', ')}</div>`
      );
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const focusOfficeOnMap = (office: UgvclOffice) => {
    setActiveOfficeId(office.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(office.coords, office.id === 'corporate' ? 13 : 12, {
        animate: true,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderContact.trim() || !message.trim()) return;
    setSubmitted(true);
    setSenderName('');
    setSenderContact('');
    setMessage('');
  };

  return (
    <main className="flex-1 bg-[#F4F7FB]">
      {/* 1. CLEAN INSTITUTIONAL HEADER BANNER */}
      <section className="w-full bg-[#EAF2FB] border-b border-slate-200/80">
        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-14">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2540] leading-snug">
              {cCopy.pageTitle}
            </h1>
            <p className="mt-1.5 text-sm font-medium text-slate-700 leading-relaxed">
              {cCopy.pageSubtitle}
            </p>
            <div className="w-10 h-0.5 bg-[#FF6B00] mt-3 mb-4" />

            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#0A2540]">
              <span className="inline-flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#0A2540]" />
                <span>{cCopy.tollFreeBanner}</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0A2540]" />
                <span>Visnagar Road, Mehsana – 384001</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK CONTACT BAR */}
      <section className="relative z-20 max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 -mt-7 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1">
              {/* Toll Free */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <Headphones className="w-4 h-4 text-[#0A2540] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{cCopy.tollFreeLabel}</div>
                  <div className="text-sm font-bold text-[#0A2540] font-mono mt-0.5">1800-233-155335</div>
                  <div className="text-xs font-mono text-slate-600">1800-233-155336 · 19121</div>
                </div>
              </div>

              {/* WhatsApp */}
              <a
                href="tel:+919825819121"
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#0A2540] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{cCopy.whatsappLabel}</div>
                  <div className="text-sm font-bold text-[#0A2540] font-mono mt-0.5">+91 98258 19121</div>
                  <div className="text-xs text-slate-600">{cCopy.whatsappSub}</div>
                </div>
              </a>

              {/* Customer Support Email */}
              <a
                href="mailto:ccc@ugvcl.com"
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-[#0A2540] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{cCopy.customerSupportLabel}</div>
                  <div className="text-sm font-bold text-[#0A2540] truncate mt-0.5">ccc@ugvcl.com</div>
                  <div className="text-xs text-slate-600 truncate">corporate@ugvcl.com</div>
                </div>
              </a>

              {/* Corporate Phone */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <Phone className="w-4 h-4 text-[#0A2540] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{cCopy.corporateOfficeLabel}</div>
                  <div className="text-sm font-bold text-[#0A2540] font-mono mt-0.5">02762-222080</div>
                  <div className="text-xs font-mono text-slate-600">02762-222081</div>
                </div>
              </div>
            </div>

            <a
              href="tel:19124"
              className="group px-5 py-3 rounded-xl bg-[#082444] hover:bg-[#0A2E58] text-white flex items-center justify-between gap-4 shadow-sm transition-colors shrink-0"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-white shrink-0" />
                <div className="leading-tight">
                  <div className="text-lg font-bold tracking-wide font-mono text-white">19124</div>
                  <div className="text-[0.6875rem] text-slate-300 font-medium">{cCopy.tollFreeShort}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </a>
          </div>
        </div>
      </section>

      {/* 3. MAP + CORPORATE OFFICE & REACH OUT TO US */}
      <section className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 pb-12 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 7 cols: Interactive Map & Registered Corporate Office */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B00]" />
                <h2 className="text-sm sm:text-base font-black text-[#0A2540]">
                  {cCopy.mapTitle}
                </h2>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activeOffice.coords[0]},${activeOffice.coords[1]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0A2540] hover:text-[#FF6B00]"
              >
                <span>{cCopy.openMaps}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Office Map Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {UGVCL_OFFICES.map((office) => (
                <button
                  key={office.id}
                  type="button"
                  onClick={() => focusOfficeOnMap(office)}
                  className={`px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors cursor-pointer ${
                    activeOfficeId === office.id
                      ? 'bg-[#0A1C3E] text-white'
                      : 'bg-[#F4F7FB] text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {office.shortLabel}
                </button>
              ))}
            </div>

            {/* Leaflet OpenStreetMap Container */}
            <div
              ref={mapContainerRef}
              className="w-full h-[270px] sm:h-[310px] rounded-xl border border-slate-200 overflow-hidden z-10"
            />

            {/* Selected Office Details Bar */}
            <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-extrabold text-[#0A2540] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>{activeOffice.name}</span>
                </div>
                <p className="text-slate-600">{activeOffice.address}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {activeOffice.phones.map((ph) => (
                  <a
                    key={ph}
                    href={`tel:${ph.replace(/-/g, '')}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#0A2540] font-mono font-bold hover:border-blue-300"
                  >
                    <Phone className="w-3 h-3 text-blue-600" />
                    {ph}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Reach Out to Us */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Send className="w-4 h-4 text-[#FF6B00]" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#0A2540] leading-tight">
                    {cCopy.reachOutTitle}
                  </h2>
                  <p className="text-[0.6875rem] text-slate-500 font-medium">
                    {cCopy.reachOutSub}
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{cCopy.thankYouTitle}</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {cCopy.thankYouBody}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2 rounded-full bg-[#0A2540] text-white text-xs font-bold cursor-pointer"
                  >
                    {cCopy.sendAnother}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700 block">{cCopy.fullNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder={cCopy.fullNamePlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F4F7FB]/60 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700 block">{cCopy.contactLabel}</label>
                    <input
                      type="text"
                      required
                      value={senderContact}
                      onChange={(e) => setSenderContact(e.target.value)}
                      placeholder={cCopy.contactPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F4F7FB]/60 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700 block">{cCopy.circleLabel}</label>
                    <select
                      value={selectedCircle}
                      onChange={(e) => setSelectedCircle(e.target.value)}
                      aria-label="Select UGVCL Office"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F4F7FB]/60 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20"
                    >
                      <option>Corporate Office (Mehsana)</option>
                      <option>Mehsana Circle Office</option>
                      <option>Sabarmati Circle Office</option>
                      <option>Palanpur Circle Office</option>
                      <option>Himatnagar Circle Office</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700 block">{cCopy.messageLabel}</label>
                    <textarea
                      rows={3}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={cCopy.messagePlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F4F7FB]/60 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-5 rounded-lg bg-[#0A2540] hover:bg-[#12365c] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{cCopy.submitBtn}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 4. UGVCL CIRCLE OFFICES DIRECTORY ROW */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-[#0A2540]" />
            <h2 className="text-sm sm:text-base font-black text-[#0A2540]">
              {cCopy.directoryTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {UGVCL_OFFICES.map((office) => (
              <div
                key={office.id}
                className="p-4 rounded-xl bg-[#F4F7FB]/80 border border-slate-200/80 flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-[#0A2540]">{office.name}</div>
                  <p className="text-[0.6875rem] text-slate-600 leading-snug">{office.address}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {office.phones.map((ph) => (
                    <a
                      key={ph}
                      href={`tel:${ph.replace(/-/g, '')}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#0A2540] hover:border-blue-300 text-[0.6875rem] font-mono font-semibold"
                    >
                      <Phone className="w-3 h-3 text-blue-600" />
                      {ph}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

