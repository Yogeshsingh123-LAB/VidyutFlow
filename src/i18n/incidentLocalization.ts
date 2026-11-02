/**
 * Critical Incident Dynamic Content & Record Localization Layer
 *
 * Provides pure, deterministic four-language localization for operational
 * incidents, telemetry descriptions, Standard Operating Procedure (SOP)
 * recommendations, severity/status badges, audit trails, and action dialogs
 * across English (en), Gujarati (gu), Hindi (hi), and Marathi (mr).
 *
 * Architectural Guarantees:
 * 1. Canonical IDs (INC-*, FDR-*, EMP-*, FLD-*, USR-*), numerical values,
 *    coordinates, and raw timestamps remain 100% unaltered.
 * 2. English ("en") preserves original canonical text verbatim.
 * 3. Unknown dynamic text safely falls back to original input.
 * 4. Stored enum values in database/storage are never modified.
 */

import { LanguageCode } from "./types";
import { CriticalIncident, IncidentSeverity, IncidentStatus, IncidentApprovalDecision } from "../types";
import { localizeSubdivision } from "./consumerContentTranslations";

/* ========================================================================= */
/* 1. SEVERITY & STATUS BADGES                                               */
/* ========================================================================= */

export function localizeIncidentSeverity(severity: IncidentSeverity | string | undefined, lang: LanguageCode): string {
  if (!severity || lang === "en") return severity || "";
  const map: Record<string, Record<LanguageCode, string>> = {
    ANOMALY_DETECTED: {
      en: "Anomaly Detected",
      gu: "વિસંગતતા જણાઈ",
      hi: "विसंगति पहचानी गई",
      mr: "विसंगती आढळली"
    },
    CRITICAL: {
      en: "CRITICAL",
      gu: "ગંભીર (CRITICAL)",
      hi: "गंभीर (CRITICAL)",
      mr: "अति-गंभीर (CRITICAL)"
    },
    WARNING: {
      en: "WARNING",
      gu: "ચેતવણી (WARNING)",
      hi: "चेतावनी (WARNING)",
      mr: "धोका (WARNING)"
    },
    INFO: {
      en: "INFO",
      gu: "માહિતી (INFO)",
      hi: "सूचना (INFO)",
      mr: "माहिती (INFO)"
    }
  };
  return map[severity.toUpperCase()]?.[lang] || severity;
}

export function localizeIncidentStatus(status: IncidentStatus | string | undefined, lang: LanguageCode): string {
  if (!status || lang === "en") return status || "";
  const map: Record<string, Record<LanguageCode, string>> = {
    DETECTED: {
      en: "DETECTED",
      gu: "શોધાયેલ",
      hi: "पहचाना गया",
      mr: "आढळले"
    },
    ACKNOWLEDGED: {
      en: "ACKNOWLEDGED",
      gu: "સ્વીકૃત",
      hi: "स्वीकृत",
      mr: "स्वीकारले"
    },
    ASSIGNED: {
      en: "ASSIGNED",
      gu: "સોંપાયેલ",
      hi: "आवंटित",
      mr: "नेमलेले"
    },
    ESCALATED: {
      en: "ESCALATED",
      gu: "એસ્કેલેટ કરેલ",
      hi: "अग्रेषित",
      mr: "वरिष्ठांकडे पाठवले"
    },
    RESOLVED: {
      en: "RESOLVED",
      gu: "ઉકેલાયેલ",
      hi: "समाधान हो गया",
      mr: "निवारण झाले"
    },
    CLOSED: {
      en: "CLOSED",
      gu: "બંધ",
      hi: "बंद",
      mr: "बंद"
    },
    IN_PROGRESS: {
      en: "IN_PROGRESS",
      gu: "પ્રગતિમાં",
      hi: "प्रगति पर",
      mr: "काम सुरू"
    }
  };
  return map[status.toUpperCase()]?.[lang] || status;
}

export function localizeIncidentApprovalDecision(decision: IncidentApprovalDecision | string | undefined, lang: LanguageCode): string {
  if (!decision || lang === "en") return decision || "";
  const map: Record<string, Record<LanguageCode, string>> = {
    APPROVED: {
      en: "Concurrence Approved",
      gu: "સંમતિ મંજૂર",
      hi: "सहमति स्वीकृत",
      mr: "मंजुरी संमत"
    },
    REJECTED: {
      en: "Escalation Rejected",
      gu: "એસ્કેલેશન નકારાયું",
      hi: "एस्केलेशन अस्वीकृत",
      mr: "वरिष्ठांकडील पाठपुरावा नाकारला"
    },
    MORE_INFO_REQUIRED: {
      en: "More Information Required",
      gu: "વધુ માહિતી જરૂરી",
      hi: "अधिक जानकारी आवश्यक",
      mr: "अधिक माहिती आवश्यक"
    },
    PENDING_APPROVAL: {
      en: "Pending Management Concurrence",
      gu: "કાર્યપાલક સંમતિ બાકી",
      hi: "प्रबंधन सहमति प्रतीक्षारत",
      mr: "व्यवस्थापन संमती प्रलंबित"
    }
  };
  return map[decision.toUpperCase()]?.[lang] || decision;
}

/* ========================================================================= */
/* 2. INCIDENT TITLES, DESCRIPTIONS & SOP ACTIONS                            */
/* ========================================================================= */

const INCIDENT_TITLE_MAP: Record<string, Record<LanguageCode, string>> = {
  "11kV Mehsana Feeder 2 Breaker Trip & Overcurrent": {
    en: "11kV Mehsana Feeder 2 Breaker Trip & Overcurrent",
    gu: "11kV મહેસાણા ફીડર ૨ બ્રેકર ટ્રિપ અને ઓવરકરન્ટ",
    hi: "11kV महेसाणा फीडर २ ब्रेकर ट्रिप एवं ओवरकरंट",
    mr: "11kV महेसाणा फीडर २ ब्रेकर ट्रिप आणि ओव्हरकरंट"
  },
  "11kV Kadi-Rural Feeder Overload Trip": {
    en: "11kV Kadi-Rural Feeder Overload Trip",
    gu: "11kV કડી-ગ્રામ્ય ફીડર ઓવરલોડ ટ્રિપ",
    hi: "11kV कडी-ग्रामीण फीडर ओवरलोड ट्रिप",
    mr: "11kV कडी-ग्रामीण फीडर ओव्हरलोड ट्रिप"
  },
  "11kV Kadi-Rural Ag Feeder (Jyotigram) Overload Anomaly": {
    en: "11kV Kadi-Rural Ag Feeder (Jyotigram) Overload Anomaly",
    gu: "11kV કડી-ગ્રામ્ય કૃષિ ફીડર (જ્યોતિગ્રામ) ઓવરલોડ વિસંગતતા",
    hi: "11kV कडी-ग्रामीण कृषि फीडर (ज्योतिग्राम) ओवरलोड विसंगति",
    mr: "11kV कडी-ग्रामीण कृषी फीडर (ज्योतीग्राम) ओव्हरलोड विसंगती"
  },
  "Directional Overcurrent Alert": {
    en: "Directional Overcurrent Alert",
    gu: "ડિરેક્શનલ ઓવરકરન્ટ ચેતવણી",
    hi: "दिशात्मक ओवरकरंट चेतावनी",
    mr: "दिशात्मक ओव्हरकरंट सूचना"
  },
  "Transformer Overload Warning": {
    en: "Transformer Overload Warning",
    gu: "ટ્રાન્સફોર્મર ઓવરલોડ ચેતવણી",
    hi: "ट्रांसफॉर्मर ओवरलोड चेतावनी",
    mr: "ट्रान्सफॉर्मर ओव्हरलोड धोका"
  },
  "Feeder Tripping Risk": {
    en: "Feeder Tripping Risk",
    gu: "ફીડર ટ્રિપિંગ જોખમ",
    hi: "फीडर ट्रिपिंग जोखिम",
    mr: "फीडर ट्रिपिंग धोका"
  },
  "Peak Load Warning: 11kV Kadi-Rural Feeder": {
    en: "Peak Load Warning: 11kV Kadi-Rural Feeder",
    gu: "પીક લોડ ચેતવણી: 11kV કડી-ગ્રામ્ય ફીડર",
    hi: "पीक लोड चेतावनी: 11kV कडी-ग्रामीण फीडर",
    mr: "कमाल भार धोका: 11kV कडी-ग्रामीण फीडर"
  }
};

export function localizeIncidentTitle(title: string | undefined, lang: LanguageCode): string {
  if (!title) return "";
  if (lang === "en") return title;
  if (INCIDENT_TITLE_MAP[title]?.[lang]) {
    return INCIDENT_TITLE_MAP[title][lang];
  }

  // 1. Critical 11kV Overload: {name} ({pct}% Capacity)
  const critMatch = title.match(/^Critical\s+(11kV|66kV|33kV)\s+Overload:\s*(.+?)\s*\((\d+(?:\.\d+)?%)\s*Capacity\)$/i);
  if (critMatch) {
    const [, kv, name, pct] = critMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: title,
      gu: "ગંભીર " + kv + " ઓવરલોડ: " + locName + " (" + pct + " ક્ષમતા)",
      hi: "गंभीर " + kv + " ओवरलोड: " + locName + " (" + pct + " क्षमता)",
      mr: "अति-गंभीर " + kv + " ओव्हरलोड: " + locName + " (" + pct + " क्षमता)"
    })[lang];
  }

  // 2. Feeder High Load Warning: {name} ({pct}%)
  const highLoadMatch = title.match(/^Feeder\s+High\s+Load\s+Warning:\s*(.+?)\s*\((\d+(?:\.\d+)?%)\)$/i);
  if (highLoadMatch) {
    const [, name, pct] = highLoadMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: title,
      gu: "ફીડર હાઈ લોડ ચેતવણી: " + locName + " (" + pct + ")",
      hi: "फीडर हाई लोड चेतावनी: " + locName + " (" + pct + ")",
      mr: "फीडर हाय लोड धोका: " + locName + " (" + pct + ")"
    })[lang];
  }

  // 3. GERC SLA Breach Risk: Complaint #{id} ({category})
  const slaMatch = title.match(/^GERC\s+SLA\s+Breach\s+Risk:\s*Complaint\s*#?([A-Za-z0-9-]+)\s*\((.+?)\)$/i);
  if (slaMatch) {
    const [, cid, cat] = slaMatch;
    return ({
      en: title,
      gu: "GERC SLA ભંગ જોખમ: ફરિયાદ #" + cid + " (" + cat + ")",
      hi: "GERC SLA उल्लंघन जोखिम: शिकायत #" + cid + " (" + cat + ")",
      mr: "GERC SLA उल्लंघन धोका: तक्रार #" + cid + " (" + cat + ")"
    })[lang];
  }

  // 4. High Priority Grievance: #{id} ({category})
  const griMatch = title.match(/^High\s+Priority\s+Grievance:\s*#?([A-Za-z0-9-]+)\s*\((.+?)\)$/i);
  if (griMatch) {
    const [, cid, cat] = griMatch;
    return ({
      en: title,
      gu: "ઉચ્ચ અગ્રતા ફરિયાદ: #" + cid + " (" + cat + ")",
      hi: "उच्च प्राथमिकता शिकायत: #" + cid + " (" + cat + ")",
      mr: "उच्च प्राधान्य तक्रार: #" + cid + " (" + cat + ")"
    })[lang];
  }

  // 5. Emergency Work Order Unresolved: {title} ({id})
  const woMatch = title.match(/^Emergency\s+Work\s+Order\s+Unresolved:\s*(.+?)\s*\((WO-[A-Za-z0-9-]+)\)$/i);
  if (woMatch) {
    const [, woTitle, woId] = woMatch;
    return ({
      en: title,
      gu: "કટોકટી વર્ક ઓર્ડર વણઉકેલાયેલ: " + woTitle + " (" + woId + ")",
      hi: "आपातकालीन कार्य आदेश अनसुलझा: " + woTitle + " (" + woId + ")",
      mr: "तातडीचे वर्क ऑर्डर अनिर्णित: " + woTitle + " (" + woId + ")"
    })[lang];
  }

  // 6. Security Anomaly: Multiple Failed Auth Attempts from {ip}
  const secMatch = title.match(/^Security\s+Anomaly:\s*Multiple\s+Failed\s+Auth\s+Attempts\s+from\s*(.+)$/i);
  if (secMatch) {
    const [, ip] = secMatch;
    return ({
      en: title,
      gu: "સુરક્ષા વિસંગતતા: " + ip + " પરથી બહુવિધ નિષ્ફળ લૉગિન પ્રયાસો",
      hi: "सुरक्षा विसंगति: " + ip + " से एकाधिक असफल प्रमाणीकरण प्रयास",
      mr: "सुरक्षा विसंगती: " + ip + " वरून अनेक अयशस्वी लॉगिन प्रयत्न"
    })[lang];
  }

  // 7. Core Service Alert: {name} is {status}
  const srvMatch = title.match(/^Core\s+Service\s+Alert:\s*(.+?)\s+is\s+(.+)$/i);
  if (srvMatch) {
    const [, srvName, status] = srvMatch;
    return ({
      en: title,
      gu: "કોર સર્વિસ ચેતવણી: " + srvName + " " + status + " સ્થિતિમાં છે",
      hi: "कोर सेवा अलर्ट: " + srvName + " " + status + " स्थिति में है",
      mr: "कोअर सेवा इशारा: " + srvName + " " + status + " स्थितीत आहे"
    })[lang];
  }

  // 8. Assigned Incident: {id}
  const assignMatch = title.match(/^Assigned\s+Incident:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (assignMatch) {
    const [, incId] = assignMatch;
    return ({
      en: title,
      gu: "સોંપાયેલ ઘટના: " + incId,
      hi: "आवंटित घटना: " + incId,
      mr: "नेमलेली घटना: " + incId
    })[lang];
  }

  // 9. Reassigned Incident: {id}
  const reassignMatch = title.match(/^Reassigned\s+Incident:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (reassignMatch) {
    const [, incId] = reassignMatch;
    return ({
      en: title,
      gu: "પુનઃ સોંપાયેલ ઘટના: " + incId,
      hi: "पुनः आवंटित घटना: " + incId,
      mr: "पुन्हा नेमलेली घटना: " + incId
    })[lang];
  }

  // 10. Assignment Declined: #{id}
  const declineMatch = title.match(/^Assignment\s+Declined:\s*#?(INC-[A-Za-z0-9-]+)$/i);
  if (declineMatch) {
    const [, incId] = declineMatch;
    return ({
      en: title,
      gu: "સોંપણી નકારાઈ: #" + incId,
      hi: "आवंटन अस्वीकृत: #" + incId,
      mr: "नेमणूक नाकारली: #" + incId
    })[lang];
  }

  // 11. Feeder Overload Trip
  const tripMatch = title.match(/^(11kV|66kV|33kV)\s+([^:]+?)\s+Feeder\s+Overload\s+Trip$/i);
  if (tripMatch) {
    const [, kv, name] = tripMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: title,
      gu: kv + " " + locName + " ફીડર ઓવરલોડ ટ્રિપ",
      hi: kv + " " + locName + " फीडर ओवरलोड ट्रिप",
      mr: kv + " " + locName + " फीडर ओव्हरलोड ट्रिप"
    })[lang];
  }

  // 12. Breaker Trip & Overcurrent
  const breakerMatch = title.match(/^(11kV|66kV|33kV)\s+([^:]+?)\s+Breaker\s+Trip\s+&\s+Overcurrent$/i);
  if (breakerMatch) {
    const [, kv, name] = breakerMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: title,
      gu: kv + " " + locName + " બ્રેકર ટ્રિપ અને ઓવરકરન્ટ",
      hi: kv + " " + locName + " ब्रेकर ट्रिप एवं ओवरकरंट",
      mr: kv + " " + locName + " ब्रेकर ट्रिप आणि ओव्हरकरंट"
    })[lang];
  }

  // 13. EMERGENCY LIFE HAZARD / Field Hazard Alert from reportFeederFault
  const fieldHazardMatch = title.match(/^(EMERGENCY\s+LIFE\s+HAZARD|Field\s+Hazard\s+Alert):\s*(.+?)\s+on\s+(.+)$/i);
  const fieldHazardDashMatch = !fieldHazardMatch
    ? title.match(/^(EMERGENCY\s+LIFE\s+HAZARD|Field\s+Hazard\s+Alert):\s*(.+?)\s+[—-]\s+(.+)$/i)
    : null;
  if (fieldHazardMatch || fieldHazardDashMatch) {
    const prefix = (fieldHazardMatch ? fieldHazardMatch[1] : fieldHazardDashMatch![1]);
    const rawFault = (fieldHazardMatch ? fieldHazardMatch[2] : fieldHazardDashMatch![3]);
    const rawFeeder = (fieldHazardMatch ? fieldHazardMatch[3] : fieldHazardDashMatch![2]);
    const isEmergency = prefix.toUpperCase().includes("EMERGENCY");
    const faultMap: Record<string, Record<LanguageCode, string>> = {
      "TRANSFORMER OVERHEATING": {
        en: "TRANSFORMER OVERHEATING",
        gu: "ટ્રાન્સફોર્મર ઓવરહીટિંગ",
        hi: "ट्रांसफॉर्मर ओवरहीटिंग",
        mr: "ट्रान्सफॉर्मर ओव्हरहीटिंग"
      },
      "FEEDER OVERLOAD": {
        en: "FEEDER OVERLOAD",
        gu: "ફીડર ઓવરલોડ",
        hi: "फीडर ओवरलोड",
        mr: "फीडर ओव्हरलोड"
      },
      "CRITICAL FEEDER OUTAGE": {
        en: "CRITICAL FEEDER OUTAGE",
        gu: "ગંભીર ફીડર આઉટેજ",
        hi: "गंभीर फीडर आउटेज",
        mr: "गंभीर फीडर आउटेज"
      }
    };
    const locFault = faultMap[rawFault.trim().toUpperCase()]?.[lang] || rawFault.trim();
    const locFeeder = localizeSubdivision(rawFeeder.trim(), lang);
    if (isEmergency) {
      return ({
        en: title,
        gu: `કટોકટી જીવન જોખમ: ${locFeeder} પર ${locFault}`,
        hi: `आपातकालीन जीवन संकट: ${locFeeder} पर ${locFault}`,
        mr: `आपत्कालीन जीवित धोका: ${locFeeder} वर ${locFault}`
      })[lang];
    }
    return ({
      en: title,
      gu: `ફિલ્ડ જોખમ ચેતવણી: ${locFeeder} પર ${locFault}`,
      hi: `फील्ड खतरा अलर्ट: ${locFeeder} पर ${locFault}`,
      mr: `फील्ड धोका इशारा: ${locFeeder} वर ${locFault}`
    })[lang];
  }

  return title;
}

const INCIDENT_DESC_MAP: Record<string, Record<LanguageCode, string>> = {
  "Phase-to-phase fault on 11kV Feeder 2 overhead line near Radhanpur crossroads. Overcurrent relay tripped circuit breaker. 1,420 consumers unserved.": {
    en: "Phase-to-phase fault on 11kV Feeder 2 overhead line near Radhanpur crossroads. Overcurrent relay tripped circuit breaker. 1,420 consumers unserved.",
    gu: "રાધનપુર ચાર રસ્તા નજીક 11kV ફીડર ૨ ઓવરહેડ લાઇન પર ફેઝ-ટુ-ફેઝ ખામી. ઓવરકરન્ટ રિલેએ સર્કિટ બ્રેકર ટ્રિપ કર્યું. ૧,૪૨૦ ગ્રાહકો પ્રભાવિત.",
    hi: "राधनपुर चौराहे के पास 11kV फीडर २ ओवरहेड लाइन पर फेज-टू-फेज खराबी। ओवरकरंट रिले ने सर्किट ब्रेकर ट्रिप किया। १,४२० उपभोक्ता प्रभावित।",
    mr: "राधनपूर चौकाजवळ 11kV फीडर २ ओव्हरहेड लाइनवर फेज-टू-फेज बिघाड. ओव्हरकरंट रिलेने सर्किट ब्रेकर ट्रिप केला. १,४२० ग्राहक बाधित."
  },
  "Directional overcurrent relay tripped at Substation Bay 4.": {
    en: "Directional overcurrent relay tripped at Substation Bay 4.",
    gu: "સબસ્ટેશન બે ૪ ખાતે ડિરેક્શનલ ઓવરકરન્ટ રિલે ટ્રિપ થઈ.",
    hi: "सबस्टेशन बे ४ पर दिशात्मक ओवरकरंट रिले ट्रिप हो गया।",
    mr: "सबस्टेशन बे ४ येथे दिशात्मक ओव्हरकरंट रिले ट्रिप झाला."
  },
  "Feeder utilization reached 108.2% of rated capacity. Load shedding or feeder segregation recommended.": {
    en: "Feeder utilization reached 108.2% of rated capacity. Load shedding or feeder segregation recommended.",
    gu: "ફીડર વપરાશ નિર્ધારિત ક્ષમતાના ૧૦૮.૨% પર પહોંચ્યો. લોડ શેડિંગ અથવા ફીડર વિભાજનની ભલામણ છે.",
    hi: "फीडर उपयोग निर्धारित क्षमता के १०૮.२% तक पहुंच गया। लोड शेडिंग अथवा फीडर पृथक्करण अनुशंसित है।",
    mr: "फीडर वापर क्षमतेच्या १०૮.२% वर पोहोचला. लोड शेडिंग किंवा फीडर विभाजनाची शिफारस केली आहे."
  },
  "Current draw exceeded 238A against rated capacity of 220A. Risk of conductor annealing and transformer burnout.": {
    en: "Current draw exceeded 238A against rated capacity of 220A. Risk of conductor annealing and transformer burnout.",
    gu: "૨૨૦A ની નિર્ધારિત ક્ષમતા સામે કરન્ટ ૨૩૮A પર પહોંચ્યો. વાહક તાર ગરમ થવાનો અને ટ્રાન્સફોર્મર બળી જવાનો ભય છે.",
    hi: "२२०A की निर्धारित क्षमता के विरुद्ध विद्युत प्रवाह २३८A से अधिक हुआ। कंडक्टर अत्यधिक गर्म होने और ट्रांसफॉर्मर जलने का जोखिम।",
    mr: "२२०A क्षमतेच्या तुलनेत वीज प्रवाह २३८A वर गेला. कंडक्टर तापण्याचा आणि ट्रान्सफॉर्मर जळण्याचा धोका."
  }
};

export function localizeIncidentDescription(desc: string | undefined, lang: LanguageCode): string {
  if (!desc) return "";
  if (lang === "en") return desc;
  if (INCIDENT_DESC_MAP[desc]?.[lang]) {
    return INCIDENT_DESC_MAP[desc][lang];
  }

  // 1. Feeder {name} ({id}) is operating at {pct}% rated capacity ({peak}A / {rated}A) with {trips} recorded tripping events. Risk of distribution transformer thermal failure.
  const feederCritMatch = desc.match(/^Feeder\s+(.+?)\s+\(([A-Za-z0-9_-]+)\)\s+is\s+operating\s+at\s+(\d+(?:\.\d+)?%)\s+rated\s+capacity\s+\((\d+(?:\.\d+)?)A\s*\/\s*(\d+(?:\.\d+)?)A\)\s+with\s+(\d+)\s+recorded\s+tripping\s+events\.\s+Risk\s+of\s+distribution\s+transformer\s+thermal\s+failure\./i);
  if (feederCritMatch) {
    const [, name, id, pct, peak, rated, trips] = feederCritMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: desc,
      gu: "ફીડર " + locName + " (" + id + ") " + pct + " નિર્ધારિત ક્ષમતા (" + peak + "A / " + rated + "A) પર ચાલે છે જેમાં " + trips + " ટ્રિપિંગ ઇવેન્ટ્સ નોંધાઈ છે. વિતરણ ટ્રાન્સફોર્મર થર્મલ નિષ્ફળતાનું જોખમ.",
      hi: "फीडर " + locName + " (" + id + ") निर्धारित क्षमता के " + pct + " (" + peak + "A / " + rated + "A) पर संचालित है तथा " + trips + " ट्रिपिंग घटनाएं दर्ज हैं। वितरण ट्रांसफॉर्मर थर्मल विफलता का जोखिम।",
      mr: "फीडर " + locName + " (" + id + ") निर्धारित क्षमतेच्या " + pct + " (" + peak + "A / " + rated + "A) वर कार्यरत असून " + trips + " ट्रिपिंग नोंदी झाल्या आहेत. वितरण ट्रान्सफॉर्मर थर्मल बिघाडाचा धोका."
    })[lang];
  }

  // 2. Feeder {name} is approaching maximum operating threshold at {pct}% rated capacity.
  const feederWarnMatch = desc.match(/^Feeder\s+(.+?)\s+is\s+approaching\s+maximum\s+operating\s+threshold\s+at\s+(\d+(?:\.\d+)?%)\s+rated\s+capacity\./i);
  if (feederWarnMatch) {
    const [, name, pct] = feederWarnMatch;
    const locName = localizeSubdivision(name.trim(), lang);
    return ({
      en: desc,
      gu: "ફીડર " + locName + " " + pct + " નિર્ધારિત ક્ષમતા પર મહત્તમ ઓપરેટિંગ મર્યાદાની નજીક પહોંચી રહ્યું છે.",
      hi: "फीडर " + locName + " " + pct + " निर्धारित क्षमता पर अधिकतम परिचालन सीमा के निकट पहुंच रहा है।",
      mr: "फीडर " + locName + " " + pct + " निर्धारित क्षमतेवर कमाल मर्यादा पातळीच्या जवळ पोहोचत आहे."
    })[lang];
  }

  // 3. Consumer complaint #{id} ({category} for {consumerNo}) is in "{status}" state. Target SLA turnaround time exceeded or approaching critical limit.
  const complaintSlaMatch = desc.match(/^Consumer\s+complaint\s*#?([A-Za-z0-9-]+)\s*\((.+?)\s+for\s+([0-9-]+)\)\s+is\s+in\s+"([^"]+)"\s+state\.\s+Target\s+SLA\s+turnaround\s+time\s+exceeded\s+or\s+approaching\s+critical\s+limit\./i);
  if (complaintSlaMatch) {
    const [, id, cat, cNo, status] = complaintSlaMatch;
    return ({
      en: desc,
      gu: "ગ્રાહક ફરિયાદ #" + id + " (" + cat + " - " + cNo + ") \"" + status + "\" સ્થિતિમાં છે. લક્ષ્ય SLA સમય મર્યાદા ઓળંગી ગઈ છે અથવા ગંભીર મર્યાદા સુધી પહોંચી ગઈ છે.",
      hi: "उपभोक्ता शिकायत #" + id + " (" + cat + " - " + cNo + ") \"" + status + "\" स्थिति में है। लक्षित SLA समय सीमा पार हो चुकी है या गंभीर सीमा के निकट है।",
      mr: "ग्राहक तक्रार #" + id + " (" + cat + " - " + cNo + ") \"" + status + "\" स्थितीत आहे. लक्षित SLA मुदत ओलांडली गेली आहे किंवा गंभीर मर्यादेजवळ आहे."
    })[lang];
  }

  // 4. High priority complaint logged for connection {consumerNo}: {text}
  const complaintGriMatch = desc.match(/^High\s+priority\s+complaint\s+logged\s+for\s+connection\s+([0-9-]+):\s*(.+)$/i);
  if (complaintGriMatch) {
    const [, cNo, detail] = complaintGriMatch;
    return ({
      en: desc,
      gu: "કનેક્શન " + cNo + " માટે ઉચ્ચ અગ્રતાવાળી ફરિયાદ નોંધાઈ: " + detail,
      hi: "कनेक्शन " + cNo + " के लिए उच्च प्राथमिकता शिकायत दर्ज: " + detail,
      mr: "जोडणी " + cNo + " साठी उच्च प्राधान्य तक्रार नोंदवली: " + detail
    })[lang];
  }

  // 5. Work order {id} at {location} ({feeder}) has emergency priority and remains in {status} status.
  const woDescMatch = desc.match(/^Work\s+order\s+([A-Za-z0-9-]+)\s+at\s+(.+?)\s*\((.+?)\)\s+has\s+emergency\s+priority\s+and\s+remains\s+in\s+([A-Za-z_]+)\s+status\./i);
  if (woDescMatch) {
    const [, woId, loc, feeder, status] = woDescMatch;
    return ({
      en: desc,
      gu: "વર્ક ઓર્ડર " + woId + " (" + loc + ", " + feeder + ") કટોકટી અગ્રતા ધરાવે છે અને " + status + " સ્થિતિમાં રહે છે.",
      hi: "कार्य आदेश " + woId + " (" + loc + ", " + feeder + ") आपातकालीन प्राथमिकता रखता है और " + status + " स्थिति में है।",
      mr: "वर्क ऑर्डर " + woId + " (" + loc + ", " + feeder + ") कडे तातडीचे प्राधान्य असून ते " + status + " स्थितीत आहे."
    })[lang];
  }

  // 6. Repeated authentication failures detected by Gateway: "{meta}". Resource: {res}.
  const secDescMatch = desc.match(/^Repeated\s+authentication\s+failures\s+detected\s+by\s+Gateway:\s*"([^"]+)"\.\s*Resource:\s*(.+?)\.?$/i);
  if (secDescMatch) {
    const [, meta, res] = secDescMatch;
    return ({
      en: desc,
      gu: "ગેટવે દ્વારા વારંવાર પ્રમાણીકરણ નિષ્ફળતા જણાઈ: \"" + meta + "\". સ્ત્રોત: " + res + ".",
      hi: "गेटवे द्वारा बार-बार प्रमाणीकरण विफलता पहचानी गई: \"" + meta + "\"। संसाधन: " + res + "।",
      mr: "गेटवे द्वारे वारंवार प्रमाणीकरण अपयश आढळले: \"" + meta + "\". स्त्रोत: " + res + "."
    })[lang];
  }

  // 7. Microservice {name} ({cat}) is in {status} state. Latency: {lat}ms. Last Incident: {lastInc}.
  const srvDescMatch = desc.match(/^Microservice\s+(.+?)\s*\((.+?)\)\s+is\s+in\s+([A-Za-z_]+)\s+state\.\s+Latency:\s*(\d+)ms\.\s+Last\s+Incident:\s*(.+?)\.?$/i);
  if (srvDescMatch) {
    const [, name, cat, status, lat, lastInc] = srvDescMatch;
    return ({
      en: desc,
      gu: "માઇક્રોસર્વિસ " + name + " (" + cat + ") " + status + " સ્થિતિમાં છે. વિલંબ: " + lat + "ms. છેલ્લી ઘટના: " + lastInc + ".",
      hi: "माइक्रो-सर्विस " + name + " (" + cat + ") " + status + " स्थिति में है। विलंबता: " + lat + "ms। अंतिम घटना: " + lastInc + "।",
      mr: "मायक्रो-सर्व्हिस " + name + " (" + cat + ") " + status + " स्थितीत आहे. विलंब: " + lat + "ms. शेवटची घटना: " + lastInc + "."
    })[lang];
  }

  // 8. Field Engineer {actor} ({id}) declined assignment on {time}: "{reason}"
  const feDeclineDescMatch = desc.match(/^Field\s+Engineer\s+(.+?)\s+\(([A-Za-z0-9_-]+)\)\s+declined\s+assignment\s+on\s+(.+?):\s*"([^"]+)"/i);
  if (feDeclineDescMatch) {
    const [, actorName, actorId, formattedTime, cleanReason] = feDeclineDescMatch;
    return ({
      en: desc,
      gu: "ફીલ્ડ એન્જિનિયર " + actorName + " (" + actorId + ") એ " + formattedTime + " વાગ્યે સોંપણી નકારી: \"" + cleanReason + "\"",
      hi: "फील्ड इंजीनियर " + actorName + " (" + actorId + ") ने " + formattedTime + " पर आवंटन अस्वीकार किया: \"" + cleanReason + "\"",
      mr: "फील्ड इंजिनिअर " + actorName + " (" + actorId + ") यांनी " + formattedTime + " रोजी नेमणूक नाकारली: \"" + cleanReason + "\""
    })[lang];
  }

  // 9. {remarks} Reported on site by {actor} ({feederId}, {subdivision}).
  const reportedOnSiteMatch = desc.match(/^(.+?)\s+Reported\s+on\s+site\s+by\s+(.+?)\s+\(([^,]+),\s*([^)]+)\)\.$/i);
  if (reportedOnSiteMatch) {
    const [, rawRemarks, actor, feederId, rawSub] = reportedOnSiteMatch;
    const remarksMap: Record<string, Record<LanguageCode, string>> = {
      "Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.": {
        en: "Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.",
        gu: "100kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર પર ઉચ્ચ થર્મલ સિગ્નેચર (>85°C) અને ઓઇલ લીકેજ જોવા મળ્યું.",
        hi: "100kVA वितरण ट्रांसफॉर्मर पर उच्च थર્મल सिग्नेचर (>85°C) और तेल रिसाव देखा गया।",
        mr: "100kVA वितरण ट्रान्सफॉर्मरवर उच्च थર્મल सिग्नेचर (>85°C) आणि ऑईल गळती आढळली."
      }
    };
    const locRemarks = remarksMap[rawRemarks.trim()]?.[lang] || rawRemarks.trim();
    const locSub = localizeSubdivision(rawSub.trim(), lang);
    return ({
      en: desc,
      gu: `${locRemarks} ${actor} દ્વારા સ્થળ પર જાણ કરવામાં આવી (${feederId.trim()}, ${locSub}).`,
      hi: `${locRemarks} ${actor} द्वारा साइट पर रिपोर्ट किया गया (${feederId.trim()}, ${locSub})।`,
      mr: `${locRemarks} ${actor} यांच्याद्वारे साईटवर नोंदवले गेले (${feederId.trim()}, ${locSub}).`
    })[lang];
  }

  return desc;
}

const SOP_ACTION_MAP: Record<string, Record<LanguageCode, string>> = {
  "Isolate faulty 11kV overhead section; switch alternate feed from Mehsana Grid Substation; dispatch emergency repair crew.": {
    en: "Isolate faulty 11kV overhead section; switch alternate feed from Mehsana Grid Substation; dispatch emergency repair crew.",
    gu: "ખામીયુક્ત 11kV ઓવરહેડ સેક્શનને અલગ કરો; મહેસાણા ગ્રીડ સબસ્ટેશનથી વૈકલ્પિક ફીડ ચાલુ કરો; ઇમરજન્સી રિપેર ક્રૂ રવાના કરો.",
    hi: "दोषपूर्ण 11kV ओवरहेड सेक्शन को अलग करें; महेसाणा ग्रिड सबस्टेशन से वैकल्पिक आपूर्ति चालू करें; आपातकालीन मरम्मत दल रवाना करें।",
    mr: "दोषपूर्ण 11kV ओव्हरहेड सेक्शन वेगळा करा; महेसाणा ग्रिड सबस्टेशनवरून पर्यायी वीजपुरवठा सुरू करा; तातडीचे दुरुस्ती पथक पाठवा."
  },
  "Monitor tail-end bus voltage and prepare line balancing work order.": {
    en: "Monitor tail-end bus voltage and prepare line balancing work order.",
    gu: "ટેઇલ-એન્ડ બસ વોલ્ટેજ મોનિટર કરો અને લાઇન બેલેન્સિંગ વર્ક ઓર્ડર તૈયાર કરો.",
    hi: "टेल-एंड बस वोल्टेज की निगरानी करें और लाइन संतुलन कार्य आदेश तैयार करें।",
    mr: "टेल-एंड बस व्होल्टेजवर लक्ष ठेवा आणि लाइन बॅलन्सिंग कार्य आदेश तयार करा."
  },
  "Assign line technician and contact consumer with status update.": {
    en: "Assign line technician and contact consumer with status update.",
    gu: "લાઇન ટેકનિશિયન સોંપો અને ગ્રાહકનો સંપર્ક કરી સ્થિતિ અપડેટ આપો.",
    hi: "लाइन तकनीशियन नियुक्त करें और उपभोक्ता से संपर्क कर स्थिति अपडेट दें।",
    mr: "लाइन तंत्रज्ञ नियुक्त करा आणि ग्राहकाशी संपर्क साधून स्थिती अपडेट द्या."
  },
  "Verify line clearance PTW and ensure technician arrival on site.": {
    en: "Verify line clearance PTW and ensure technician arrival on site.",
    gu: "લાઇન ક્લિયરન્સ PTW ચકાસો અને સાઇટ પર ટેકનિશિયનનું આગમન સુનિશ્ચિત કરો.",
    hi: "लाइन क्लीयरेंस PTW सत्यापित करें और साइट पर तकनीशियन का आगमन सुनिश्चित करें।",
    mr: "लाइन क्लिअरन्स PTW तपासा आणि साइटवर तंत्रज्ञांचे आगमन सुनिश्चित करा."
  },
  "Inspect firewall drop rules, review IP reputation, and enforce session rotation.": {
    en: "Inspect firewall drop rules, review IP reputation, and enforce session rotation.",
    gu: "ફાયરવોલ ડ્રોપ નિયમો તપાસો, IP પ્રતિષ્ઠાની સમીક્ષા કરો અને સત્ર પરિભ્રમણ લાગુ કરો.",
    hi: "फ़ायरवॉल ड्रॉप नियमों का निरीक्षण करें, आईपी प्रतिष्ठा की समीक्षा करें और सत्र रोटेशन लागू करें।",
    mr: "फायरवॉल ड्रॉप नियमांची तपासणी करा, IP प्रतिष्ठा तपासा आणि सत्र रोटेशन लागू करा."
  },
  "Inspect container logs and initiate service cluster health check.": {
    en: "Inspect container logs and initiate service cluster health check.",
    gu: "કન્ટેનર લૉગ્સ તપાસો અને સેવા ક્લસ્ટર હેલ્થ ચેક શરૂ કરો.",
    hi: "कंटेनर लॉग का निरीक्षण करें और सेवा क्लस्टर स्वास्थ्य जांच शुरू करें।",
    mr: "कंटेनर लॉग तपासा आणि सेवा क्लस्टर आरोग्य तपासणी सुरू करा."
  },
  "Inspect 11kV vacuum circuit breaker and isolate faulty section.": {
    en: "Inspect 11kV vacuum circuit breaker and isolate faulty section.",
    gu: "11kV વેક્યુમ સર્કિટ બ્રેકરનું નિરીક્ષણ કરો અને ખામીયુક્ત વિભાગને અલગ કરો.",
    hi: "11kV वैक्यूम सर्किट ब्रेकर का निरीक्षण करें और दोषपूर्ण खंड को अलग करें।",
    mr: "11kV व्हॅक्यूम सर्किट ब्रेकरची तपासणी करा आणि बिघाड असलेला भाग वेगळा करा."
  },
  "Shed non-essential agricultural pump load or switch auxiliary bus coupler.": {
    en: "Shed non-essential agricultural pump load or switch auxiliary bus coupler.",
    gu: "બિન-જરૂરી કૃષિ પંપ લોડ ઘટાડો અથવા સહાયક બસ કપ્લર પર સ્વિચ કરો.",
    hi: "गैर-आवश्यक कृषि पंप लोड बंद करें अथवा सहायक बस कपलर स्विच करें।",
    mr: "અનાવશ્યક કૃષિ પંપ ભાર કમી કરા અથવા સહાયક બસ કપ્લર શરૂ કરા."
  },
  "Dispatch emergency patrol van to inspect insulator flashover on Section B.": {
    en: "Dispatch emergency patrol van to inspect insulator flashover on Section B.",
    gu: "સેક્શન B પર ઇન્સ્યુલેટર ફ્લેશઓવરની તપાસ માટે ઇમરજન્સી પેટ્રોલ વાન રવાના કરો.",
    hi: "सेक्शन B पर इंसुलेटर फ्लैशओवर की जांच हेतु आपातकालीन पेट्रोल वैन भेजें।",
    mr: "सेक्शन B વરીલ ઇન્સ્યુલેટર ફ્લેશઓવ્હર તપાસણ્યાસાઠી તાતડીચે ગસ્તી વાહન પાઠવા."
  },
  "Check transformer T-104 oil temperature and load balance.": {
    en: "Check transformer T-104 oil temperature and load balance.",
    gu: "ટ્રાન્સફોર્મર T-104 નું ઓઇલ ટેમ્પરેચર અને લોડ બેલેન્સ તપાસો.",
    hi: "ट्रांसफॉर्मर T-104 का ऑयल तापमान और लोड संतुलन जांचें।",
    mr: "ट्रान्सफॉर्मर T-104 चे ऑईल तापमान आणि लोड संतुलन तपासा."
  },
  "URGENT: Isolate feeder immediately, secure public safety perimeter, and dispatch emergency line crew.": {
    en: "URGENT: Isolate feeder immediately, secure public safety perimeter, and dispatch emergency line crew.",
    gu: "તાત્કાલિક: ફીડરને તરત જ અલગ કરો, જાહેર સુરક્ષા પરિમિતિ સુરક્ષિત કરો અને કટોકટી લાઇન ટીમને રવાના કરો.",
    hi: "तत्काल: फीडर को तुरंत अलग करें, सार्वजनिक सुरक्षा घेरा सुरक्षित करें और आपातकालीन लाइन टीम भेजें।",
    mr: "तातडीचे: फीडर तात्काळ विलग करा, सार्वजनिक सुरक्षा परिसर सुरक्षित करा आणि आपत्कालीन लाईन पथक रवाना करा."
  },
  "Verify substation bus breaker isolation, inspect DTR thermal state, and dispatch line crew.": {
    en: "Verify substation bus breaker isolation, inspect DTR thermal state, and dispatch line crew.",
    gu: "સબસ્ટેશન બસ બ્રેકર આઇસોલેશન ચકાસો, DTR થર્મલ સ્થિતિનું નિરીક્ષણ કરો અને લાઇન ટીમ રવાના કરો.",
    hi: "सबस्टेशन बस ब्रेकर आइसोलेशन सत्यापित करें, DTR थर्मल स्थिति का निरीक्षण करें और लाइन टीम रवाना करें।",
    mr: "सबस्टेशन बस ब्रेकर आयसोलेशन पडताळा, DTR थर्मल स्थिती तपासा आणि लाईन पथक रवाना करा."
  }
};

export function localizeIncidentSopAction(sop: string | undefined, lang: LanguageCode): string {
  if (!sop) return "";
  if (lang === "en") return sop;
  if (SOP_ACTION_MAP[sop]?.[lang]) {
    return SOP_ACTION_MAP[sop][lang];
  }

  // 1. Initiate peak load shedding or re-route {subdivision} agricultural load to adjacent 11kV line. Inspect DTR thermal oil levels.
  const loadShedMatch = sop.match(/^Initiate\s+peak\s+load\s+shedding\s+or\s+re-route\s+(.+?)\s+agricultural\s+load\s+to\s+adjacent\s+(11kV|66kV|33kV)\s+line\.\s+Inspect\s+DTR\s+thermal\s+oil\s+levels\./i);
  if (loadShedMatch) {
    const [, sub, kv] = loadShedMatch;
    const locSub = localizeSubdivision(sub.trim(), lang);
    return ({
      en: sop,
      gu: "પીક લોડ શેડિંગ શરૂ કરો અથવા " + locSub + " કૃષિ લોડને અડીને આવેલા " + kv + " લાઇન પર વાળો. DTR થર્મલ ઓઇલ સ્તર તપાસો.",
      hi: "पीक लोड शेडिंग आरंभ करें अथवा " + locSub + " कृषि लोड को निकटवर्ती " + kv + " लाइन पर स्थानांतरित करें। DTR थर्मल ऑयल स्तर जांचें।",
      mr: "कमाल भार कमी करा किंवा " + locSub + " कृषी भार लगतच्या " + kv + " लाइनवर वळवा. DTR ऑईल पातळी तपासा."
    })[lang];
  }

  // 2. Escalate to Sub-Divisional Officer and dispatch on-call JE for immediate field resolution at {subdivision}.
  const escalateJeMatch = sop.match(/^Escalate\s+to\s+Sub-Divisional\s+Officer\s+and\s+dispatch\s+on-call\s+JE\s+for\s+immediate\s+field\s+resolution\s+at\s+(.+?)\.?$/i);
  if (escalateJeMatch) {
    const [, sub] = escalateJeMatch;
    const locSub = localizeSubdivision(sub.trim(), lang);
    return ({
      en: sop,
      gu: "પેટા-વિભાગીય અધિકારીને એસ્કેલેટ કરો અને " + locSub + " ખાતે તાત્કાલિક ફીલ્ડ ઉકેલ માટે ઓન-કૉલ JE રવાના કરો.",
      hi: "उप-मंडलीय अधिकारी को अग्रेषित करें और " + locSub + " पर तत्काल फील्ड समाधान हेतु ऑन-कॉल JE को रवाना करें।",
      mr: "उपविभागीय अधिकाऱ्यांकडे पाठवा आणि " + locSub + " येथे तातडीच्या निवारणासाठी ऑन-कॉल जेई पाठवा."
    })[lang];
  }

  return sop;
}

/* ========================================================================= */
/* 3. AUDIT STAGES & SYSTEM AUDIT NOTES                                      */
/* ========================================================================= */

export function localizeIncidentAuditStage(stage: string | undefined, lang: LanguageCode): string {
  if (!stage) return "";
  if (lang === "en") return stage;
  const map: Record<string, Record<LanguageCode, string>> = {
    ANOMALY_DETECTED: {
      en: "Anomaly Detected",
      gu: "વિસંગતતા જણાઈ",
      hi: "विसंगति पहचानी गई",
      mr: "विसंगती आढळली"
    },
    DETECTED: {
      en: "DETECTED",
      gu: "શોધાયેલ",
      hi: "पहचाना गया",
      mr: "आढळले"
    },
    ACKNOWLEDGED: {
      en: "ACKNOWLEDGED",
      gu: "સ્વીકૃત",
      hi: "स्वीकृत",
      mr: "स्वीकारले"
    },
    ASSIGNED: {
      en: "ASSIGNED",
      gu: "સોંપાયેલ",
      hi: "आवंटित",
      mr: "नेमलेले"
    },
    REASSIGNED: {
      en: "REASSIGNED",
      gu: "પુનઃ-સોંપાયેલ",
      hi: "पुनः आवंटित",
      mr: "पुन्हा नेमलेले"
    },
    DECLINED: {
      en: "DECLINED",
      gu: "નકારાયેલ",
      hi: "अस्वीकृत",
      mr: "नाकारले"
    },
    INSPECTION_STARTED: {
      en: "INSPECTION_STARTED",
      gu: "નિરીક્ષણ શરૂ",
      hi: "निरीक्षण प्रारंभ",
      mr: "तपासणी सुरू"
    },
    FINDINGS_SUBMITTED: {
      en: "FINDINGS_SUBMITTED",
      gu: "તારણો સબમિટ",
      hi: "निष्कर्ष प्रस्तुत",
      mr: "निष्कर्ष सादर"
    },
    ASSISTANCE_REQUESTED: {
      en: "ASSISTANCE_REQUESTED",
      gu: "સહાયની વિનંતી",
      hi: "सहायता का अनुरोध",
      mr: "मदतीची विनंती"
    },
    ESCALATED: {
      en: "ESCALATED",
      gu: "એસ્કેલેટ કરેલ",
      hi: "अग्रेषित",
      mr: "वरिष्ठांकडे पाठवले"
    },
    CONCURRENCE_APPROVED: {
      en: "CONCURRENCE_APPROVED",
      gu: "સંમતિ મંજૂર",
      hi: "सहमति स्वीकृत",
      mr: "मंजुरी संमत"
    },
    CONCURRENCE_REJECTED: {
      en: "CONCURRENCE_REJECTED",
      gu: "સંમતિ અસ્વીકૃત",
      hi: "सहमति अस्वीकृत",
      mr: "संमती नाकारली"
    },
    MORE_INFO_REQUESTED: {
      en: "MORE_INFO_REQUESTED",
      gu: "વધુ વિગત માંગવામાં આવી",
      hi: "अधिक जानकारी मांगी गई",
      mr: "अधिक माहिती मागवली"
    },
    RESOLVED: {
      en: "RESOLVED",
      gu: "ઉકેલાયેલ",
      hi: "समाधान हो गया",
      mr: "निवारण झाले"
    },
    CLOSED: {
      en: "CLOSED",
      gu: "બંધ",
      hi: "बंद",
      mr: "બંધ"
    },
    IN_PROGRESS: {
      en: "IN_PROGRESS",
      gu: "પ્રગતિમાં",
      hi: "प्रगति पर",
      mr: "काम सुरू"
    }
  };
  return map[stage.toUpperCase()]?.[lang] || stage;
}

export function localizeAuditTrailNote(note: string | undefined, lang: LanguageCode): string {
  if (!note || lang === "en") return note || "";

  const exactNoteMap: Record<string, Record<LanguageCode, string>> = {
    "Incident acknowledged in Operations Dashboard.": {
      en: "Incident acknowledged in Operations Dashboard.",
      gu: "ઓપરેશન્સ ડેશબોર્ડમાં ઘટના સ્વીકારાઈ.",
      hi: "ऑपरेशंस डैशबोर्ड में घटना स्वीकृत की गई।",
      mr: "ऑपरेशन्स डॅशबोर्डमध्ये घटना स्वीकारली गेली."
    },
    "Incident verified and marked resolved.": {
      en: "Incident verified and marked resolved.",
      gu: "ઘટના ચકાસાયેલ અને ઉકેલાયેલ તરીકે ચિહ્નિત.",
      hi: "घटना सत्यापित एवं समाधानित चिह्नित की गई।",
      mr: "घटना पडताळली आणि निवारण झाले म्हणून चिन्हांकित."
    },
    "Physical inspection and telemetry tests started on site.": {
      en: "Physical inspection and telemetry tests started on site.",
      gu: "સ્થળ પર ભૌતિક નિરીક્ષણ અને ટેલિમેટ્રી પરીક્ષણ શરૂ થયું.",
      hi: "साइट पर भौतिक निरीक्षण एवं टेलीमेट्री परीक्षण प्रारंभ हुआ।",
      mr: "घटनास्थळी प्रत्यक्ष तपासणी आणि टेलिमेट्री चाचण्या सुरू झाल्या."
    },
    "Simulated incident triggered for hackathon demonstration. Not live SCADA telemetry.": {
      en: "Simulated incident triggered for hackathon demonstration. Not live SCADA telemetry.",
      gu: "ડેમો સિમ્યુલેશન ઘટના ટ્રિગર કરવામાં આવી. લાઈવ SCADA ટેલિમેટ્રી નથી.",
      hi: "डेमो सिमुलेशन घटना ट्रिगर की गई। लाइव स्काडा टेलीमेट्री नहीं है।",
      mr: "ડેમો સિમ્યુલેશન ઘટના શરૂ થઈ. થેટ સ્કાડા ટેલિમેટ્રી નથી."
    },
    "Emergency priority work order generated for line squad dispatch.": {
      en: "Emergency priority work order generated for line squad dispatch.",
      gu: "લાઇન સ્ક્વોડ રવાના કરવા માટે કટોકટી અગ્રતા વર્ક ઓર્ડર તૈયાર થયો.",
      hi: "लाइन दस्ते को रवाना करने हेतु आपातकालीन कार्य आदेश तैयार हुआ।",
      mr: "लाईन पथक पाठवण्यासाठी तातडीचे वर्क ऑर्डर तयार झाले."
    },
    "Inspection order created from Document Verification approval.": {
      en: "Inspection order created from Document Verification approval.",
      gu: "દસ્તાવેજ ચકાસણી મંજૂરી પરથી નિરીક્ષણ ઓર્ડર તૈયાર થયો.",
      hi: "दस्तावेज़ सत्यापन स्वीकृति से निरीक्षण आदेश तैयार हुआ।",
      mr: "कागदपत्र पडताळणी मंजुरीवरून तपासणी आदेश तयार झाला."
    },
    "Assigned from complaint triage desk.": {
      en: "Assigned from complaint triage desk.",
      gu: "ફરિયાદ ટ્રાયજ ડેસ્ક પરથી સોંપાયેલ.",
      hi: "शिकायत ट्राइएज डेस्क से आवंटित।",
      mr: "तक्रार निवारण कक्षाकडून नेमणूक केली."
    }
  };

  if (exactNoteMap[note]?.[lang]) {
    return exactNoteMap[note][lang];
  }

  let mInit = note.match(/^Utilization reached\s+(\d+(?:\.\d+)?)%\s+with\s+(\d+)\s+recent tripping events\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `ઉપયોગિતા ${mInit[1]}% સુધી પહોંચી અને તાજેતરમાં ${mInit[2]} ટ્રિપિંગ ઘટનાઓ નોંધાઈ.`,
      hi: `उपयोगिता ${mInit[1]}% तक पहुँची तथा हाल ही में ${mInit[2]} ट्रिपिंग घटनाएँ दर्ज हुईं।`,
      mr: `वापर क्षमता ${mInit[1]}% पर्यंत पोहोचली असून नुकत्याच ${mInit[2]} ट्रिपिंग घटना नोंदवल्या गेल्या.`
    })[lang];
  }

  mInit = note.match(/^Feeder crossed\s+(\d+(?:\.\d+)?)%\s+warning threshold\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `ફીડરે ${mInit[1]}% ચેતવણી મર્યાદા વટાવી.`,
      hi: `फीडर ने ${mInit[1]}% चेतावनी सीमा पार की।`,
      mr: `फिडरने ${mInit[1]}% इशारा मर्यादा ओलांडली.`
    })[lang];
  }

  mInit = note.match(/^Complaint\s+(\S+)\s+exceeded SLA resolution benchmark\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `ફરિયાદ ${mInit[1]} એ SLA નિવારણ સમયમર્યાદા વટાવી.`,
      hi: `शिकायत ${mInit[1]} ने SLA समाधान समयसीमा पार की।`,
      mr: `तक्रार ${mInit[1]} ने SLA निवारण कालमर्यादा ओलांडली.`
    })[lang];
  }

  mInit = note.match(/^High priority complaint\s+(\S+)\s+flagged\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `ઉચ્ચ પ્રાથમિકતા ધરાવતી ફરિયાદ ${mInit[1]} ચિહ્નિત કરવામાં આવી.`,
      hi: `उच्च प्राथमिकता वाली शिकायत ${mInit[1]} चिह्नित की गई।`,
      mr: `उच्च प्राधान्याची तक्रार ${mInit[1]} चिन्हांकित केली.`
    })[lang];
  }

  mInit = note.match(/^Emergency work order\s+(\S+)\s+requires clearance\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `કટોકટી વર્ક ઓર્ડર ${mInit[1]} ને ક્લિયરન્સની જરૂર છે.`,
      hi: `आपातकालीन वर्क ऑर्डर ${mInit[1]} को क्लीयरेंस की आवश्यकता है।`,
      mr: `आपत्कालीन वर्क ऑर्डर ${mInit[1]} साठी क्लिअरन्स आवश्यक आहे.`
    })[lang];
  }

  mInit = note.match(/^Service status changed to\s+(.+)\.$/i);
  if (mInit) {
    return ({
      en: note,
      gu: `સેવાની સ્થિતિ બદલાઈને ${mInit[1]} થઈ.`,
      hi: `सेवा की स्थिति बदलकर ${mInit[1]} हो गई।`,
      mr: `सेवेची स्थिती बदलून ${mInit[1]} झाली.`
    })[lang];
  }

  if (note.toLowerCase().includes("failed password") || note.toLowerCase().includes("brute") || note.toLowerCase().includes("throttled")) {
    return ({
      en: note,
      gu: `સુરક્ષા ગેટવે દ્વારા વારંવાર નિષ્ફળ લોગિન પ્રયાસો રોકવામાં આવ્યા (${note.match(/\d+/)?.[0] || "4"} પ્રયાસો).`,
      hi: `सुरक्षा गेटवे द्वारा बार-बार विफल लॉगिन प्रयासों को नियंत्रित किया गया (${note.match(/\d+/)?.[0] || "4"} प्रयास)।`,
      mr: `सुरक्षा गेटवेद्वारे वारंवार झालेले अयशस्वी लॉगिन प्रयत्न रोखण्यात आले (${note.match(/\d+/)?.[0] || "4"} प्रयत्न).`
    })[lang];
  }

  if (note.includes("Breaker trip recorded")) {
    return ({
      en: note,
      gu: "બ્રેકર ટ્રિપ નોંધાઈ.",
      hi: "ब्रेकर ट्रिप दर्ज की गई।",
      mr: "ब्रेकर ट्रिप नोंदवला गेला."
    })[lang];
  }

  if (note.includes("Acknowledged via urgent alert popup by")) {
    const rolePart = note.split("by")[1]?.trim() || "";
    return ({
      en: note,
      gu: "તાત્કાલિક પોપઅપ ચેતવણી દ્વારા " + rolePart + " દ્વારા સ્વીકૃત",
      hi: "आपातकालीन अलर्ट पॉपअप द्वारा " + rolePart + " द्वारा स्वीकृत",
      mr: "तातडीच्या अलर्ट पॉपअपद्वारे " + rolePart + " द्वारे स्वीकारले"
    })[lang];
  }

  const escMatch = note.match(/^Escalated\s+to\s+([A-Za-z0-9_]+)(?:\s*\(([^)]+)\))?:\s*(.+)$/i);
  if (escMatch) {
    const [, targetRole, targetUser, reason] = escMatch;
    const userDisplay = targetUser ? " (" + targetUser + ")" : "";
    return ({
      en: note,
      gu: targetRole + userDisplay + " ને એસ્કેલેટ કરેલ: " + reason,
      hi: targetRole + userDisplay + " को अग्रेषित: " + reason,
      mr: targetRole + userDisplay + " कडे पाठवले: " + reason
    })[lang];
  }

  const acceptMatch = note.match(/^Field\s+Engineer\s+(.+?)\s+\(([A-Za-z0-9_-]+)\)\s+accepted\s+assignment\s+and\s+mobilized\s+to\s+site\./i);
  if (acceptMatch) {
    const [, actor, id] = acceptMatch;
    return ({
      en: note,
      gu: "ફીલ્ડ એન્જિનિયર " + actor + " (" + id + ") એ સોંપણી સ્વીકારી અને સાઇટ પર રવાના થયા.",
      hi: "फील्ड इंजीनियर " + actor + " (" + id + ") ने कार्य स्वीकार किया और घटनास्थल रवाना हुए।",
      mr: "फील्ड इंजिनिअर " + actor + " (" + id + ") यांनी नेमणूक स्वीकारली आणि घटनास्थळी रवाना झाले."
    })[lang];
  }

  const feDeclineNoteMatch = note.match(/^Field\s+Engineer\s+(.+?)\s+\(([A-Za-z0-9_-]+)\)\s+declined\s+assignment\s+on\s+(.+?):\s*"([^"]+)"/i);
  if (feDeclineNoteMatch) {
    const [, actorName, actorId, formattedTime, cleanReason] = feDeclineNoteMatch;
    return ({
      en: note,
      gu: "ફીલ્ડ એન્જિનિયર " + actorName + " (" + actorId + ") એ " + formattedTime + " વાગ્યે સોંપણી નકારી: \"" + cleanReason + "\"",
      hi: "फील्ड इंजीनियर " + actorName + " (" + actorId + ") ने " + formattedTime + " पर आवंटन अस्वीकार किया: \"" + cleanReason + "\"",
      mr: "फील्ड इंजिनिअर " + actorName + " (" + actorId + ") यांनी " + formattedTime + " रोजी नेमणूक नाकारली: \"" + cleanReason + "\""
    })[lang];
  }

  const findingsMatch = note.match(/^Technical\s+findings\s+recorded:\s*(.+)$/i);
  if (findingsMatch) {
    const [, findings] = findingsMatch;
    return ({
      en: note,
      gu: "તકનીકી તારણો નોંધાયા: " + findings,
      hi: "तकनीकी निष्कर्ष दर्ज किए गए: " + findings,
      mr: "तांत्रिक निष्कर्ष नोंदवले: " + findings
    })[lang];
  }

  const assistMatch = note.match(/^Assistance\s+requested:\s*(.+)$/i);
  if (assistMatch) {
    const [, notes] = assistMatch;
    return ({
      en: note,
      gu: "સહાયની વિનંતી: " + notes,
      hi: "सहायता का अनुरोध: " + notes,
      mr: "मदतीची विनंती: " + notes
    })[lang];
  }

  const resReportMatch = note.match(/^Resolution\s+Report:\s*(.+)$/i);
  if (resReportMatch) {
    const [, report] = resReportMatch;
    return ({
      en: note,
      gu: "ઉકેલ અહેવાલ: " + report,
      hi: "समाधान रिपोर्ट: " + report,
      mr: "निवारण अहवाल: " + report
    })[lang];
  }

  const concGrantedMatch = note.match(/^Executive\s+Concurrence\s+Granted\s+by\s+Management:\s*(.+)$/i);
  if (concGrantedMatch) {
    const [, remarks] = concGrantedMatch;
    return ({
      en: note,
      gu: "કાર્યપાલક સંમતિ મંજૂર કરવામાં આવી: " + remarks,
      hi: "प्रबंधन द्वारा कार्यकारी सहमति स्वीकृत: " + remarks,
      mr: "व्यवस्थापनाने कार्यकारी मंजुरी दिली: " + remarks
    })[lang];
  }

  const escRejMatch = note.match(/^Escalation\s+Rejected\s+by\s+Management:\s*(.+)$/i);
  if (escRejMatch) {
    const [, reason] = escRejMatch;
    return ({
      en: note,
      gu: "કાર્યપાલક દ્વારા એસ્કેલેશન નકારાયું: " + reason,
      hi: "प्रबंधन द्वारा एस्केलेशन अस्वीकृत: " + reason,
      mr: "व्यवस्थापनाने पाठपुरावा नाकारला: " + reason
    })[lang];
  }

  const moreInfoMatch = note.match(/^More\s+Information\s+Requested\s+by\s+Management:\s*(.+)$/i);
  if (moreInfoMatch) {
    const [, question] = moreInfoMatch;
    return ({
      en: note,
      gu: "કાર્યપાલક દ્વારા વધુ વિગત માંગવામાં આવી: " + question,
      hi: "प्रबंधन द्वारा अधिक जानकारी मांगी गई: " + question,
      mr: "व्यवस्थापनाने अधिक माहिती मागवली: " + question
    })[lang];
  }

  const emergencyMatch = note.match(/^\[EMERGENCY\s+OVERRIDE\s+BROADCAST\]\s*(.+)$/i);
  if (emergencyMatch) {
    const [, rawRemarks] = emergencyMatch;
    const locRemarks = localizeAuditTrailNote(rawRemarks.trim(), lang);
    return ({
      en: note,
      gu: "[કટોકટી ઓવરરાઇડ બ્રોડકાસ્ટ] " + locRemarks,
      hi: "[आपातकालीन ओवरराइड प्रसारण] " + locRemarks,
      mr: "[तातडीचे ओव्हरराइड प्रसारण] " + locRemarks
    })[lang];
  }

  if (note.trim() === "Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.") {
    return ({
      en: note,
      gu: "100kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર પર ઉચ્ચ થર્મલ સિગ્નેચર (>85°C) અને ઓઇલ લીકેજ જોવા મળ્યું.",
      hi: "100kVA वितरण ट्रांसफॉर्मर पर उच्च थર્મल सिग्नेचर (>85°C) और तेल रिसाव देखा गया।",
      mr: "100kVA वितरण ट्रान्सफॉर्मरवर उच्च थર્મल सिग्नेचर (>85°C) आणि ऑईल गळती आढळली."
    })[lang];
  }

  const feAckMatch = note.match(/^Assignment\s+acknowledged\s+by\s+Field\s+Engineer\s+(.+?)\.\s*Mobilizing\s+to\s+site\.$/i);
  if (feAckMatch) {
    const [, actor] = feAckMatch;
    return ({
      en: note,
      gu: `ફીલ્ડ એન્જિનિયર ${actor} દ્વારા સોંપણી સ્વીકારવામાં આવી. સાઇટ પર રવાના થઈ રહ્યા છે.`,
      hi: `फील्ड इंजीनियर ${actor} द्वारा असाइनमेंट स्वीकार किया गया। साइट पर रवाना हो रहे हैं।`,
      mr: `फील्ड अभियंता ${actor} यांच्याद्वारे नेमणूक स्वीकारण्यात आली. साईटवर रवाना होत आहेत.`
    })[lang];
  }

  const assignedToByMatch = note.match(/^(Assigned|Reassigned)\s+to\s+(.+?)\s+by\s+(.+?)(?:\.|\s*—\s*(.+))$/i);
  if (assignedToByMatch) {
    const [, actionType, target, actor, extra] = assignedToByMatch;
    const isRe = actionType.toLowerCase() === "reassigned";
    const suffix = extra ? ` — ${extra}` : ".";
    return ({
      en: note,
      gu: `${actor} દ્વારા ${target} ને ${isRe ? "ફરીથી સોંપવામાં આવ્યું" : "સોંપવામાં આવ્યું"}${suffix}`,
      hi: `${actor} द्वारा ${target} को ${isRe ? "पुनः सौंपा गया" : "सौंपा गया"}${suffix}`,
      mr: `${actor} यांच्याद्वारे ${target} यांना ${isRe ? "पुन्हा नेमून दिले" : "नेमून दिले"}${suffix}`
    })[lang];
  }

  return note;
}

/* ========================================================================= */
/* 4. EMERGENCY HAZARD CLASSIFICATION                                        */
/* ========================================================================= */

export function localizeEmergencyClassification(hazard: string | undefined, lang: LanguageCode): string {
  if (!hazard || lang === "en") return hazard || "";
  const map: Record<string, Record<LanguageCode, string>> = {
    "CONFIRMED LIFE THREATENING HAZARD": {
      en: "CONFIRMED LIFE THREATENING HAZARD",
      gu: "પુષ્ટિ થયેલ જીવન-જોખમી સંકટ",
      hi: "पुष्ट जानलेवा आपातकालीन संकट",
      mr: "पुष्टी झालेला जीवघेणा धोका"
    },
    "SUBSTATION STRUCTURAL HAZARD": {
      en: "SUBSTATION STRUCTURAL HAZARD",
      gu: "સબસ્ટેશન માળખાકીય જોખમ",
      hi: "सबस्टेशन संरचनात्मक संकट",
      mr: "सबस्टेशन संरचनात्मक धोका"
    },
    "HIGH VOLTAGE CONDUCTOR SNAP": {
      en: "HIGH VOLTAGE CONDUCTOR SNAP",
      gu: "હાઈ વોલ્ટેજ વીજ તાર તૂટી પડ્યો",
      hi: "हाई वोल्टेज तार टूटने की घटना",
      mr: "उच्च दाबाची वीज तार तुटण्याची घटना"
    },
    "LIVE_WIRE_PUBLIC_HAZARD": {
      en: "LIVE_WIRE_PUBLIC_HAZARD",
      gu: "જીવંત વાયર જાહેર સુરક્ષા જોખમ",
      hi: "लाइव वायर सार्वजनिक सुरक्षा खतरा",
      mr: "जिवंत वायर सार्वजनिक सुरक्षा धोका"
    },
    "TRANSFORMER_EXPLOSION_FIRE": {
      en: "TRANSFORMER_EXPLOSION_FIRE",
      gu: "ટ્રાન્સફોર્મર વિસ્ફોટ / આગ",
      hi: "ट्रांसफॉर्मर विस्फोट / आग",
      mr: "ट्रान्सफॉर्मर स्फोट / आग"
    },
    "SUBSTATION_FIRE_FLOOD": {
      en: "SUBSTATION_FIRE_FLOOD",
      gu: "સબસ્ટેશન આગ / પૂર કટોકટી",
      hi: "सबस्टेशन आग / बाढ़ आपातकाल",
      mr: "सबस्टेशन आग / पूर आणीबाणी"
    },
    "PUBLIC_SAFETY_DANGER": {
      en: "PUBLIC_SAFETY_DANGER",
      gu: "જાહેર જીવન સુરક્ષા જોખમ",
      hi: "सार्वजनिक जीवन सुरक्षा खतरा",
      mr: "सार्वजनिक जीवित सुरक्षा धोका"
    }
  };
  return map[hazard.toUpperCase()]?.[lang] || hazard;
}

/* ========================================================================= */
/* 5. INCIDENT INBOX NOTIFICATIONS                                           */
/* ========================================================================= */

export function localizeIncidentNotification<T extends { title: string; message: string }>(
  notif: T,
  lang: LanguageCode
): T {
  if (lang === "en") {
    return notif;
  }

  let title = notif.title;
  let message = notif.message;

  let m = title.match(/^New\s+Anomaly\s+Detected:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "નવી વિસંગતતા જણાઈ: " + incId,
      hi: "नई विसंगति पहचानी गई: " + incId,
      mr: "नवीन विसंगती आढळली: " + incId
    })[lang];
  }

  m = title.match(/^Assigned\s+Incident:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "સોંપાયેલ ઘટના: " + incId,
      hi: "आवंटित घटना: " + incId,
      mr: "नेमलेली घटना: " + incId
    })[lang];
  }

  m = title.match(/^Reassigned\s+Incident:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "પુનઃ સોંપાયેલ ઘટના: " + incId,
      hi: "पुनः आवंटित घटना: " + incId,
      mr: "पुन्हा नेमलेली घटना: " + incId
    })[lang];
  }

  m = title.match(/^Assignment\s+Declined:\s*#?(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "સોંપણી નકારાઈ: #" + incId,
      hi: "आवंटन अस्वीकृत: #" + incId,
      mr: "नेमणूक नाकारली: #" + incId
    })[lang];
  }

  m = title.match(/^Field\s+Assignment\s+Accepted:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "ફીલ્ડ સોંપણી સ્વીકારાઈ: " + incId,
      hi: "फील्ड आवंटन स्वीकृत: " + incId,
      mr: "फील्ड नेमणूक स्वीकारली: " + incId
    })[lang];
  }

  m = title.match(/^Field\s+Findings\s+Submitted:\s*#?(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "ફીલ્ડ તારણો સબમિટ થયા: " + incId,
      hi: "फील्ड निष्कर्ष प्रस्तुत किए गए: " + incId,
      mr: "फील्ड निष्कर्ष सादर केले: " + incId
    })[lang];
  }

  m = title.match(/^Incident\s+Escalated\s+to\s+Management:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "ઘટના મેનેજમેન્ટને એસ્કેલેટ કરાઈ: " + incId,
      hi: "घटना प्रबंधन को अग्रेषित की गई: " + incId,
      mr: "घटना व्यवस्थापनाकडे पाठवली: " + incId
    })[lang];
  }

  m = title.match(/^Management\s+Concurrence\s+Granted:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "મેનેજમેન્ટ સંમતિ મંજૂર: " + incId,
      hi: "प्रबंधन सहमति स्वीकृत: " + incId,
      mr: "व्यवस्थापन मंजुरी संमत: " + incId
    })[lang];
  }

  m = title.match(/^Management\s+Concurrence\s+Rejected:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "મેનેજમેન્ટ સંમતિ નકારાઈ: " + incId,
      hi: "प्रबंधन सहमति अस्वीकृत: " + incId,
      mr: "व्यवस्थापन मंजुरी नाकारली: " + incId
    })[lang];
  }

  m = title.match(/^Management\s+Requested\s+Information:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "મેનેજમેન્ટે માહિતી માંગી: " + incId,
      hi: "प्रबंधन ने जानकारी मांगी: " + incId,
      mr: "व्यवस्थापनाने माहिती मागवली: " + incId
    })[lang];
  }

  m = title.match(/^Incident\s+Resolved:\s*(INC-[A-Za-z0-9-]+)$/i);
  if (m) {
    const incId = m[1];
    title = ({
      en: title,
      gu: "ઘટના ઉકેલાઈ ગઈ: " + incId,
      hi: "घटना का समाधान हुआ: " + incId,
      mr: "घटनेचे निवारण झाले: " + incId
    })[lang];
  }

  if (title === notif.title) {
    title = localizeIncidentTitle(title, lang);
  }

  const mEmergMsg = message.match(/^Field\s+Engineer\s+(.+?)\s+reported\s+confirmed\s+safety\s+hazard\s+\(([^)]+)\):\s*(.+)$/i);
  if (mEmergMsg) {
    const [, engName, classCode, rawRem] = mEmergMsg;
    const locClass = localizeEmergencyClassification(classCode.trim(), lang);
    const locRem = localizeAuditTrailNote(rawRem.trim(), lang);
    message = ({
      en: message,
      gu: `ફીલ્ડ એન્જિનિયર ${engName} એ પુષ્ટિ થયેલ સુરક્ષા જોખમ (${locClass}) નોંધ્યું: ${locRem}`,
      hi: `फील्ड इंजीनियर ${engName} ने पुष्ट सुरक्षा खतरे (${locClass}) की रिपोर्ट की: ${locRem}`,
      mr: `फील्ड अभियंता ${engName} यांनी पुष्टी केलेल्या सुरक्षा धोक्याची (${locClass}) नोंद केली: ${locRem}`
    })[lang];
  } else {
    const localizedDesc = localizeIncidentDescription(message, lang);
    if (localizedDesc !== message) {
      message = localizedDesc;
    } else {
      const localizedAudit = localizeAuditTrailNote(message, lang);
      if (localizedAudit !== message) {
        message = localizedAudit;
      }
    }
  }

  return {
    ...notif,
    title,
    message
  };
}

/* ========================================================================= */
/* 6. COMPLETE INCIDENT RECORD LOCALIZER                                     */
/* ========================================================================= */

export interface LocalizedIncidentView {
  title: string;
  description: string;
  recommendedAction: string;
  severityLabel: string;
  statusLabel: string;
  subdivisionDisplay: string;
  approvalStatusLabel?: string;
  emergencyClassificationLabel?: string;
}

export function localizeIncident(incident: CriticalIncident, lang: LanguageCode): CriticalIncident & LocalizedIncidentView {
  return {
    ...incident,
    title: localizeIncidentTitle(incident.title, lang),
    description: localizeIncidentDescription(incident.description, lang),
    recommendedAction: localizeIncidentSopAction(incident.recommendedAction, lang),
    severityLabel: localizeIncidentSeverity(incident.severity, lang),
    statusLabel: localizeIncidentStatus(incident.status, lang),
    subdivisionDisplay: incident.subdivision ? localizeSubdivision(incident.subdivision, lang) : "",
    approvalStatusLabel: incident.approvalStatus ? localizeIncidentApprovalDecision(incident.approvalStatus, lang) : undefined,
    emergencyClassificationLabel: incident.emergencyClassification ? localizeEmergencyClassification(incident.emergencyClassification, lang) : undefined
  };
}
