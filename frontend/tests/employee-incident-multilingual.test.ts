/**
 * Automated Verification Suite for Employee Critical Incident Multilingual Localization
 * Part 2 of 3: Comprehensive testing across en, gu, hi, and mr
 */

import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import {
  localizeIncident,
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSopAction,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeIncidentApprovalDecision,
  localizeEmergencyClassification
} from '../src/i18n/incidentLocalization';
import { CriticalIncident } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL: " + message);
    process.exit(1);
  } else {
    console.log("PASS: " + message);
  }
}

console.log("=== Employee Critical Incident Multilingual Verification ===");

// TEST 1: Dictionary Key Parity
console.log("\n--- TEST 1: Dictionary Key Parity Across 4 Languages ---");
const enKeys = Object.keys(en.incident).sort();
const guKeys = Object.keys(gu.incident).sort();
const hiKeys = Object.keys(hi.incident).sort();
const mrKeys = Object.keys(mr.incident).sort();

assert(enKeys.length === 123, `Expected 123 keys in en.incident, found ${enKeys.length}`);
assert(guKeys.length === 123, `Expected 123 keys in gu.incident, found ${guKeys.length}`);
assert(hiKeys.length === 123, `Expected 123 keys in hi.incident, found ${hiKeys.length}`);
assert(mrKeys.length === 123, `Expected 123 keys in mr.incident, found ${mrKeys.length}`);

// Check each key exists and is non-empty
for (const key of enKeys) {
  assert(Boolean((gu.incident as any)[key]), `Key ${key} is present and non-empty in Gujarati`);
  assert(Boolean((hi.incident as any)[key]), `Key ${key} is present and non-empty in Hindi`);
  assert(Boolean((mr.incident as any)[key]), `Key ${key} is present and non-empty in Marathi`);
}

// TEST 2: Native Script Verification
console.log("\n--- TEST 2: Native Script Validation ---");
const guScriptRegex = /[\u0A80-\u0AFF]/;
const hiScriptRegex = /[\u0900-\u097F]/;
const mrScriptRegex = /[\u0900-\u097F]/;

assert(guScriptRegex.test(gu.incident.controlDeskTitle), "Gujarati title contains Gujarati script");
assert(guScriptRegex.test(gu.incident.controlDeskDescription), "Gujarati description contains Gujarati script");
assert(hiScriptRegex.test(hi.incident.controlDeskTitle), "Hindi title contains Devanagari script");
assert(hiScriptRegex.test(hi.incident.controlDeskDescription), "Hindi description contains Devanagari script");
assert(mrScriptRegex.test(mr.incident.controlDeskTitle), "Marathi title contains Devanagari script");
assert(mrScriptRegex.test(mr.incident.controlDeskDescription), "Marathi description contains Devanagari script");

// TEST 3: Canonical ID & Technical Code Preservation
console.log("\n--- TEST 3: Canonical ID & Technical Code Preservation ---");
const sampleIncident: CriticalIncident = {
  id: "INC-2026-0849",
  title: "11kV Mehsana Feeder 2 Breaker Trip & Overcurrent",
  description: "Phase-to-phase fault on 11kV Feeder 2 overhead line near Radhanpur crossroads. Overcurrent relay tripped circuit breaker. 1,420 consumers unserved.",
  severity: "CRITICAL",
  status: "DETECTED",
  timestamp: "2026-03-20T10:00:00.000Z",
  module: "Distribution & SCADA",
  subdivision: "Mehsana City North",
  entityId: "FDR-MEH-11KV-02",
  entityType: "feeder",
  recommendedAction: "Isolate faulty 11kV overhead section; switch alternate feed from Mehsana Grid Substation; dispatch emergency repair crew.",
  responsibleRoles: ["employee", "field", "management"],
  history: [
    {
      timestamp: "2026-03-20T10:00:00.000Z",
      stage: "DETECTED",
      actor: "Sentinel SCADA Telemetry",
      notes: "Breaker trip signal confirmed via RTU-209."
    }
  ]
};

for (const lang of ["en", "gu", "hi", "mr"] as const) {
  const loc = localizeIncident(sampleIncident, lang);
  assert(loc.id === "INC-2026-0849", `[${lang}] ID INC-2026-0849 preserved verbatim`);
  assert(loc.entityId === "FDR-MEH-11KV-02", `[${lang}] Feeder FDR-MEH-11KV-02 preserved verbatim`);
  assert(loc.timestamp === "2026-03-20T10:00:00.000Z", `[${lang}] Raw timestamp preserved verbatim`);
}

// TEST 4: Dynamic Incident Content Localization
console.log("\n--- TEST 4: Dynamic Incident Content Localization ---");
const locGu = localizeIncident(sampleIncident, "gu");
const locHi = localizeIncident(sampleIncident, "hi");
const locMr = localizeIncident(sampleIncident, "mr");
const locEn = localizeIncident(sampleIncident, "en");

assert(locEn.title === sampleIncident.title, "English title preserved verbatim");
assert(locGu.title.includes("11kV"), "Gujarati title preserves technical voltage 11kV");
assert(guScriptRegex.test(locGu.title), "Gujarati title rendered in authentic Gujarati script");
assert(hiScriptRegex.test(locHi.title), "Hindi title rendered in authentic Devanagari script");
assert(mrScriptRegex.test(locMr.title), "Marathi title rendered in authentic Devanagari script");

// SOP Action localization
assert(guScriptRegex.test(locGu.recommendedAction), "Gujarati SOP action rendered in authentic Gujarati script");
assert(hiScriptRegex.test(locHi.recommendedAction), "Hindi SOP action rendered in authentic Hindi script");
assert(mrScriptRegex.test(locMr.recommendedAction), "Marathi SOP action rendered in authentic Marathi script");

// Severity & Status labels
assert(guScriptRegex.test(localizeIncidentSeverity("CRITICAL", "gu")), "Gujarati CRITICAL severity contains Gujarati script");
assert(hiScriptRegex.test(localizeIncidentSeverity("CRITICAL", "hi")), "Hindi CRITICAL severity contains Devanagari script");
assert(mrScriptRegex.test(localizeIncidentSeverity("CRITICAL", "mr")), "Marathi CRITICAL severity contains Devanagari script");
assert(guScriptRegex.test(localizeIncidentStatus("DETECTED", "gu")), "Gujarati DETECTED status contains Gujarati script");
assert(hiScriptRegex.test(localizeIncidentStatus("DETECTED", "hi")), "Hindi DETECTED status contains Devanagari script");
assert(mrScriptRegex.test(localizeIncidentStatus("DETECTED", "mr")), "Marathi DETECTED status contains Devanagari script");

// Audit Stage localization
assert(localizeIncidentAuditStage("ANOMALY_DETECTED", "gu") === "વિસંગતતા જણાઈ", "Gujarati audit stage translated");
assert(localizeIncidentAuditStage("ANOMALY_DETECTED", "hi") === "विसंगति पहचानी गई", "Hindi audit stage translated");
assert(localizeIncidentAuditStage("ANOMALY_DETECTED", "mr") === "विसंगती आढळली", "Marathi audit stage translated");

// TEST 5: Authority Options & Modals
console.log("\n--- TEST 5: Modal & Authority String Localization ---");
assert(gu.incident.modalAuthoritySolanki.includes("આર. કે. સોલંકી"), "Gujarati Solanki authority localized");
assert(hi.incident.modalAuthoritySolanki.includes("आर. के. सोलंकी"), "Hindi Solanki authority localized");
assert(mr.incident.modalAuthoritySolanki.includes("आर. के. सोलंकी"), "Marathi Solanki authority localized");

console.log("\n=== ALL MULTILINGUAL INCIDENT TESTS PASSED SUCCESSFULLY! ===");
