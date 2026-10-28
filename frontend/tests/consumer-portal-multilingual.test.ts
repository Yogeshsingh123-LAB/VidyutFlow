import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import {
  localizeTariffCategory,
  localizeConnectionStatus,
  localizePhase,
  localizeSubdivision,
  localizeFeederName,
  localizeConsumerAddress,
  localizeBillMonth,
  localizeBillStatus,
  localizePaymentMethod,
  localizePaymentStatus,
  localizeApplicationStatus,
  localizeDocumentName,
  localizeApplicationNote,
  localizeComplaintCategory,
  localizeComplaintStatus,
  localizeComplaintDescription,
  localizeComplaintResolution,
  localizeConsumerTimelineStage,
  localizeConsumerTimelineActor,
  localizeConsumerTimelineRemark,
  localizeConsumerNotification,
  localizeNotificationStatusBadge,
  localizeNotificationTimestamp,
  localizeConsumptionMonth,
  localizeLinkConnectionError,
} from '../src/i18n/consumerContentTranslations';
import { sanitizeConsumerTimelineEntry } from '../src/components/common/CaseDetailDrawer';
import {
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  CONSUMPTION_HISTORY,
} from '../src/data/mockData';

console.log('Running Phase 2, Step 2: Complete Consumer Portal Multilingual Localization Tests...');

const languages = { en, gu, hi, mr } as const;
const langCodes = ['en', 'gu', 'hi', 'mr'] as const;

// 1. Dictionary Completeness & Parity across en, gu, hi, mr
{
  const enConsumerKeys = Object.keys(en.consumer).sort();
  assert.ok(enConsumerKeys.length >= 300, `Expected at least 300 consumer translation keys, found ${enConsumerKeys.length}`);

  for (const lang of langCodes) {
    const dict = languages[lang];
    assert.ok(dict.consumer, `Missing consumer namespace in ${lang}`);
    const langKeys = Object.keys(dict.consumer).sort();
    assert.deepEqual(langKeys, enConsumerKeys, `Key parity mismatch in ${lang}.consumer`);

    for (const key of enConsumerKeys) {
      const val = (dict.consumer as Record<string, string>)[key];
      assert.equal(typeof val, 'string', `${lang}.consumer.${key} must be a string`);
      assert.ok(val.trim().length > 0, `${lang}.consumer.${key} must not be empty`);
      assert.ok(!val.includes('undefined'), `${lang}.consumer.${key} must not contain 'undefined'`);
    }
  }
  console.log('✓ Test 1 passed: All 4 languages (en, gu, hi, mr) have complete, non-empty consumer dictionaries with 100% key parity');
}

// 2. Native Script Verification for Gujarati, Hindi, and Marathi
{
  const guRegex = /[\u0A80-\u0AFF]/;
  const devaRegex = /[\u0900-\u097F]/;

  const sampleKeys: (keyof typeof en.consumer)[] = [
    'currentElectricityBill',
    'connectedFeeder',
    'serviceTracking',
    'quickConsumerServices',
    'consumptionTrendTitle',
    'myRegisteredConnectionsTitle',
    'myApplicationsTitle',
    'newConnFormTitle',
    'billsTitle',
    'paymentHistoryTitle',
    'registerFaultTitle',
    'selfServiceRequestsTitle',
    'notifCenterTitle',
    'simulatedBillPaymentTitle',
    'officialPaymentReceiptTitle',
    'linkConnectionModalTitle',
    'drawerAppTrackerTitle',
    'drawerGrievanceTrackerTitle',
  ];

  for (const key of sampleKeys) {
    assert.ok(guRegex.test(gu.consumer[key]), `Expected Gujarati script in gu.consumer.${key}, got "${gu.consumer[key]}"`);
    assert.ok(devaRegex.test(hi.consumer[key]), `Expected Devanagari script in hi.consumer.${key}, got "${hi.consumer[key]}"`);
    assert.ok(devaRegex.test(mr.consumer[key]), `Expected Devanagari script in mr.consumer.${key}, got "${mr.consumer[key]}"`);
  }
  console.log('✓ Test 2 passed: Gujarati, Hindi, and Marathi consumer translations use authentic native scripts across all subviews and modals');
}

// 3. Static Data-Driven Content Localization Helpers (Cards, Badges, Statuses, Categories, Notifications, Timeline)
{
  // Tariff categories
  for (const cat of ['Residential (RGPU)', 'Commercial (NRGP)', 'Industrial (LTMD)', 'Agricultural (AG)'] as const) {
    assert.equal(localizeTariffCategory(cat, 'en'), cat);
    assert.notEqual(localizeTariffCategory(cat, 'gu'), cat);
    assert.notEqual(localizeTariffCategory(cat, 'hi'), cat);
    assert.notEqual(localizeTariffCategory(cat, 'mr'), cat);
  }

  // Connection statuses
  for (const status of ['Active', 'Disconnected', 'PendingMeter']) {
    assert.equal(localizeConnectionStatus(status, 'en'), status);
    assert.notEqual(localizeConnectionStatus(status, 'gu'), status);
    assert.notEqual(localizeConnectionStatus(status, 'hi'), status);
    assert.notEqual(localizeConnectionStatus(status, 'mr'), status);
  }

  // Phases & Subdivisions
  for (const phase of ['1-Phase', '3-Phase']) {
    assert.equal(localizePhase(phase, 'en'), phase);
    assert.notEqual(localizePhase(phase, 'gu'), phase);
    assert.notEqual(localizePhase(phase, 'hi'), phase);
    assert.notEqual(localizePhase(phase, 'mr'), phase);
  }

  for (const sub of ['Mehsana City North', 'Mehsana City South', 'Gandhinagar Sub-Division 2', 'Visnagar Division', 'Kalol Sub-Division']) {
    assert.equal(localizeSubdivision(sub, 'en'), sub);
    assert.notEqual(localizeSubdivision(sub, 'gu'), sub);
    assert.notEqual(localizeSubdivision(sub, 'hi'), sub);
    assert.notEqual(localizeSubdivision(sub, 'mr'), sub);
  }

  // Feeder names & Consumer addresses
  assert.equal(localizeFeederName('11kV Visnagar Road Feeder', 'en'), '11kV Visnagar Road Feeder');
  assert.notEqual(localizeFeederName('11kV Visnagar Road Feeder', 'gu'), '11kV Visnagar Road Feeder');
  assert.equal(
    localizeConsumerAddress('14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002', 'en'),
    '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002'
  );
  assert.notEqual(
    localizeConsumerAddress('14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002', 'gu'),
    '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002'
  );

  // Bill months & statuses
  assert.equal(localizeBillMonth('September 2026', 'en'), 'September 2026');
  assert.ok(localizeBillMonth('September 2026', 'gu').includes('2026'));
  assert.notEqual(localizeBillMonth('September 2026', 'gu'), 'September 2026');
  assert.notEqual(localizeBillMonth('September 2026', 'hi'), 'September 2026');
  assert.notEqual(localizeBillMonth('September 2026', 'mr'), 'September 2026');

  for (const bStatus of ['Unpaid', 'Paid', 'Overdue']) {
    assert.equal(localizeBillStatus(bStatus, 'en'), bStatus);
    assert.notEqual(localizeBillStatus(bStatus, 'gu'), bStatus);
  }

  // Payment methods & statuses
  for (const method of ['Net Banking', 'Debit Card']) {
    assert.equal(localizePaymentMethod(method, 'en'), method);
    assert.notEqual(localizePaymentMethod(method, 'gu'), method);
    assert.notEqual(localizePaymentMethod(method, 'hi'), method);
    assert.notEqual(localizePaymentMethod(method, 'mr'), method);
  }

  for (const pStatus of ['Successful', 'Pending', 'Failed']) {
    assert.equal(localizePaymentStatus(pStatus, 'en'), pStatus);
    assert.notEqual(localizePaymentStatus(pStatus, 'gu'), pStatus);
  }

  // Application statuses, documents, notes
  for (const appStatus of ['Submitted', 'Document Verification', 'Site Inspection', 'Sanction Approval', 'Meter Installed', 'Rejected']) {
    assert.equal(localizeApplicationStatus(appStatus, 'en'), appStatus);
    assert.notEqual(localizeApplicationStatus(appStatus, 'gu'), appStatus);
    assert.notEqual(localizeApplicationStatus(appStatus, 'hi'), appStatus);
    assert.notEqual(localizeApplicationStatus(appStatus, 'mr'), appStatus);
  }

  for (const doc of ['Aadhaar Card (PDF, 420 KB)', 'Registered Ownership Deed / Index-II (PDF, 1.2 MB)', 'Aadhaar Card', '7/12 Land Record', 'GST Certificate']) {
    assert.equal(localizeDocumentName(doc, 'en'), doc);
    assert.notEqual(localizeDocumentName(doc, 'gu'), doc);
    assert.notEqual(localizeDocumentName(doc, 'hi'), doc);
    assert.notEqual(localizeDocumentName(doc, 'mr'), doc);
  }

  assert.notEqual(
    localizeApplicationNote('Application filed online with documents.', 'gu'),
    'Application filed online with documents.'
  );

  // Complaint categories, statuses, descriptions, resolutions
  for (const cmpCat of ['Voltage Fluctuation', 'Power Outage', 'Meter Fault', 'Billing Dispute', 'Sparking / Hazardous Wire']) {
    assert.equal(localizeComplaintCategory(cmpCat, 'en'), cmpCat);
    assert.notEqual(localizeComplaintCategory(cmpCat, 'gu'), cmpCat);
    assert.notEqual(localizeComplaintCategory(cmpCat, 'hi'), cmpCat);
    assert.notEqual(localizeComplaintCategory(cmpCat, 'mr'), cmpCat);
  }

  for (const cmpStatus of ['Registered', 'In Review', 'Dispatched', 'In Progress', 'Resolved', 'Closed']) {
    assert.equal(localizeComplaintStatus(cmpStatus, 'en'), cmpStatus);
    assert.notEqual(localizeComplaintStatus(cmpStatus, 'gu'), cmpStatus);
  }

  assert.notEqual(
    localizeComplaintDescription('CMP-8821', INITIAL_COMPLAINTS[0].description, 'gu'),
    INITIAL_COMPLAINTS[0].description
  );
  assert.notEqual(
    localizeComplaintResolution('CMP-8815', 'Blown HT fuse on 200kVA Distribution Transformer replaced and phase load balanced.', 'gu'),
    'Blown HT fuse on 200kVA Distribution Transformer replaced and phase load balanced.'
  );

  // Timeline stage, actor, remark helpers
  assert.notEqual(localizeConsumerTimelineStage('Dispatched', 'gu'), 'Dispatched');
  assert.notEqual(localizeConsumerTimelineActor('UGVCL Sub-Divisional Office', 'gu'), 'UGVCL Sub-Divisional Office');
  assert.notEqual(
    localizeConsumerTimelineRemark('Complaint logged with smart meter voltage anomaly flag.', 'gu'),
    'Complaint logged with smart meter voltage anomaly flag.'
  );

  // Notifications
  const notif02 = INITIAL_NOTIFICATIONS.find((n) => n.id === 'NOTIF-02');
  assert.ok(notif02, 'Expected NOTIF-02 in INITIAL_NOTIFICATIONS');
  const enNotif = localizeConsumerNotification(notif02, 'en');
  const guNotif = localizeConsumerNotification(notif02, 'gu');
  const hiNotif = localizeConsumerNotification(notif02, 'hi');
  const mrNotif = localizeConsumerNotification(notif02, 'mr');

  assert.equal(enNotif.title, notif02.title);
  assert.equal(enNotif.message, notif02.message);
  assert.notEqual(guNotif.title, notif02.title);
  assert.notEqual(guNotif.message, notif02.message);
  assert.notEqual(hiNotif.title, notif02.title);
  assert.notEqual(mrNotif.title, notif02.title);

  // Consumption chart months
  for (const item of CONSUMPTION_HISTORY) {
    assert.equal(localizeConsumptionMonth(item.month, 'en'), item.month);
    assert.notEqual(localizeConsumptionMonth(item.month, 'gu'), item.month);
    assert.notEqual(localizeConsumptionMonth(item.month, 'hi'), item.month);
    assert.notEqual(localizeConsumptionMonth(item.month, 'mr'), item.month);
  }

  // Link connection error messages
  const sampleErr = 'Consumer number 04281-99231 is already linked to your account.';
  assert.equal(localizeLinkConnectionError(sampleErr, 'en'), sampleErr);
  assert.notEqual(localizeLinkConnectionError(sampleErr, 'gu'), sampleErr);
  assert.ok(localizeLinkConnectionError(sampleErr, 'gu').includes('04281-99231'), 'Consumer number in error message must remain intact');

  console.log('✓ Test 3 passed: Static data-driven card descriptions, badges, categories, notifications, and chart labels localize accurately across en, gu, hi, mr');
}

// 4. CaseDetailDrawer Consumer Sanitization & Multilingual Timeline Support
{
  const sampleEntry = {
    time: '10 Oct 2026, 11:30 AM',
    stage: 'In Review',
    actor: 'Rajesh V. Trivedi (AE Ops)',
    remark: 'Assigned to field engineer JE Solanki. Work Order: WO-4401.',
  };

  // Default 1-arg call preserves English for security test compatibility
  const sanitizedDefault = sanitizeConsumerTimelineEntry(sampleEntry);
  assert.equal(sanitizedDefault.actorLabel, 'UGVCL Sub-Divisional Office');
  assert.equal(sanitizedDefault.stage, 'In Review');
  assert.equal(sanitizedDefault.remark, 'Field technical team dispatched for on-site inspection.');

  // Localized calls in gu, hi, mr
  const sanitizedGu = sanitizeConsumerTimelineEntry(sampleEntry, 'gu');
  const sanitizedHi = sanitizeConsumerTimelineEntry(sampleEntry, 'hi');
  const sanitizedMr = sanitizeConsumerTimelineEntry(sampleEntry, 'mr');

  assert.notEqual(sanitizedGu.actorLabel, sanitizedDefault.actorLabel);
  assert.notEqual(sanitizedGu.stage, sanitizedDefault.stage);
  assert.notEqual(sanitizedGu.remark, sanitizedDefault.remark);

  assert.notEqual(sanitizedHi.actorLabel, sanitizedDefault.actorLabel);
  assert.notEqual(sanitizedHi.stage, sanitizedDefault.stage);

  assert.notEqual(sanitizedMr.actorLabel, sanitizedDefault.actorLabel);
  assert.notEqual(sanitizedMr.stage, sanitizedDefault.stage);

  console.log('✓ Test 4 passed: CaseDetailDrawer consumer timeline entries are both security-sanitized and localized across en, gu, hi, mr');
}

// 5. Authoritative Data & Canonical Records Integrity
{
  assert.equal(INITIAL_CONNECTIONS[0].consumerNo, '04281-99231');
  assert.equal(INITIAL_CONNECTIONS[0].meterNo, 'MTR-2024-884102');
  assert.equal(INITIAL_CONNECTIONS[0].tariffCategory, 'Residential (RGPU)');
  assert.equal(INITIAL_CONNECTIONS[0].status, 'Active');
  assert.equal(INITIAL_BILLS[0].billNo, 'BILL-UG-2026-10-8821');
  assert.equal(INITIAL_PAYMENTS[0].txId, 'TXN-UPI-9921448102');
  assert.equal(INITIAL_APPLICATIONS[0].id, 'APP-2026-0842');
  assert.equal(INITIAL_COMPLAINTS[0].id, 'CMP-8821');

  console.log('✓ Test 5 passed: Authoritative identifiers, Consumer IDs, meter numbers, bill numbers, transaction IDs, and canonical mockData records remain untouched');
}

// 6. ConsumerPortal & CaseDetailDrawer Wiring & Preserved Form Option Canonical Values
{
  const consumerPortalSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
    'utf-8'
  );
  const caseDrawerSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/CaseDetailDrawer.tsx'),
    'utf-8'
  );

  // Verify ConsumerPortal imports useLanguage and consumerContentTranslations helpers
  assert.ok(consumerPortalSrc.includes('useLanguage'), 'ConsumerPortal must use useLanguage()');
  assert.ok(consumerPortalSrc.includes('const tc = t.consumer'), 'ConsumerPortal must bind tc = t.consumer');
  assert.ok(consumerPortalSrc.includes('localizeTariffCategory'), 'ConsumerPortal must use localizeTariffCategory');
  assert.ok(consumerPortalSrc.includes('localizeBillMonth'), 'ConsumerPortal must use localizeBillMonth');
  assert.ok(consumerPortalSrc.includes('localizeConsumerNotification'), 'ConsumerPortal must use localizeConsumerNotification');

  // Verify CaseDetailDrawer imports useLanguage
  assert.ok(caseDrawerSrc.includes('useLanguage'), 'CaseDetailDrawer must use useLanguage()');
  assert.ok(caseDrawerSrc.includes('const tc = t.consumer'), 'CaseDetailDrawer must bind tc = t.consumer');

  // Verify form option and state values retain canonical English enum values
  assert.ok(consumerPortalSrc.includes('value="Residential (RGPU)"'));
  assert.ok(consumerPortalSrc.includes('value="Commercial (NRGP)"'));
  assert.ok(consumerPortalSrc.includes('value="Industrial (LTMD)"'));
  assert.ok(consumerPortalSrc.includes('value="Agricultural (AG)"'));
  assert.ok(consumerPortalSrc.includes("setPhase('1-Phase')"));
  assert.ok(consumerPortalSrc.includes("setPhase('3-Phase')"));
  assert.ok(consumerPortalSrc.includes('value="Owned"'));
  assert.ok(consumerPortalSrc.includes('value="Mehsana City North"'));
  assert.ok(consumerPortalSrc.includes('value="Voltage Fluctuation"'));
  assert.ok(consumerPortalSrc.includes('value="Power Outage"'));

  console.log('✓ Test 6 passed: ConsumerPortal and CaseDetailDrawer are wired to useLanguage() while preserving canonical form option values');
}

// 7. Unknown/User-Entered Content Fallback Resilience
{
  const customNote = 'Custom applicant note entered during live session';
  assert.equal(localizeApplicationNote(customNote, 'gu'), customNote);
  assert.equal(localizeApplicationNote(customNote, 'hi'), customNote);
  assert.equal(localizeApplicationNote(customNote, 'mr'), customNote);

  const customAddress = 'Plot 99, Custom Industrial Park, Mehsana';
  assert.equal(localizeConsumerAddress(customAddress, 'gu'), customAddress);

  console.log('✓ Test 7 passed: Unknown or user-entered strings safely fall back to their original text without throwing or returning undefined');
}

// 8. Complete Four-Language Notification Localization (Confirmed Defect Regression Suite)
{
  // Exact reported bug notification record: APP-2026-0849 (44kW Residential (RGPU) at Mehsana City North)
  const reportedAppApprovedNotif = {
    id: 'NOTIF-APP-CNS-APP-2026-0849-Meter Installed',
    title: 'Application Approved: APP-2026-0849',
    message: 'Your 44kW Residential (RGPU) connection application has been approved and smart meter installed.',
    time: 'Just now',
    category: 'Approval',
    eventType: 'APPLICATION_APPROVED',
    subdivision: 'Mehsana City North',
  };

  // English must preserve exact original strings
  const enApproved = localizeConsumerNotification(reportedAppApprovedNotif, 'en');
  assert.equal(enApproved.title, 'Application Approved: APP-2026-0849');
  assert.equal(
    enApproved.message,
    'Your 44kW Residential (RGPU) connection application has been approved and smart meter installed.'
  );
  assert.equal(enApproved.time, 'Just now');
  assert.equal(localizeNotificationStatusBadge('Approved', 'en'), 'Approved');
  assert.equal(en.erp.filterUnread, 'Unread');
  assert.equal(en.erp.readBadge, 'Read');
  assert.equal(`${en.erp.subdivisionPrefix} ${localizeSubdivision('Mehsana City North', 'en')}`, 'Subdivision: Mehsana City North');
  assert.equal(`${en.erp.openApplicationPrefix} APP-2026-0849`, 'Open Application APP-2026-0849');

  // Gujarati, Hindi, and Marathi must translate all presentation text while preserving APP-2026-0849, 44kW, and RGPU
  for (const lang of ['gu', 'hi', 'mr'] as const) {
    const loc = localizeConsumerNotification(reportedAppApprovedNotif, lang);
    assert.notEqual(loc.title, reportedAppApprovedNotif.title, `Title must be translated in ${lang}`);
    assert.ok(loc.title.includes('APP-2026-0849'), `Application ID APP-2026-0849 must be preserved in ${lang} title`);

    assert.notEqual(loc.message, reportedAppApprovedNotif.message, `Message must be translated in ${lang}`);
    assert.ok(loc.message.includes('44kW'), `Sanctioned load 44kW must be preserved in ${lang} message`);
    assert.ok(loc.message.includes('RGPU'), `Tariff code RGPU must be preserved in ${lang} message`);
    assert.ok(!loc.message.includes('Your 44kW Residential'), `English sentence must not remain in ${lang} message`);

    assert.notEqual(loc.time, 'Just now', `Relative timestamp must be translated in ${lang}`);

    const statusBadge = localizeNotificationStatusBadge('Approved', lang);
    assert.notEqual(statusBadge, 'Approved', `Status badge Approved must be translated in ${lang}`);

    const unreadLabel = languages[lang].erp.filterUnread;
    const readLabel = languages[lang].erp.readBadge;
    assert.notEqual(unreadLabel, 'Unread', `Unread indicator must be translated in ${lang}`);
    assert.notEqual(readLabel, 'Read', `Read indicator must be translated in ${lang}`);

    const subLabel = `${languages[lang].erp.subdivisionPrefix} ${localizeSubdivision('Mehsana City North', lang)}`;
    assert.notEqual(subLabel, 'Subdivision: Mehsana City North', `Subdivision line must be translated in ${lang}`);
    assert.ok(!subLabel.includes('Subdivision:'), `English prefix 'Subdivision:' must not appear in ${lang}`);
    assert.ok(!subLabel.includes('Mehsana City North'), `English subdivision name must be localized in ${lang}`);

    const openActionLabel = `${languages[lang].erp.openApplicationPrefix} APP-2026-0849`;
    assert.notEqual(openActionLabel, 'Open Application APP-2026-0849', `Open Application link must be translated in ${lang}`);
    assert.ok(openActionLabel.includes('APP-2026-0849'), `Application ID must be preserved in ${lang} action button`);
    assert.ok(!openActionLabel.includes('Open Application'), `English 'Open Application' must not remain in ${lang}`);
  }

  // Verify all static notifications (NOTIF-01 to NOTIF-05) and dynamic lifecycle notifications localize across en, gu, hi, mr
  const dynamicSamples = [
    ...INITIAL_NOTIFICATIONS,
    {
      id: 'DYN-1',
      title: 'Application Submitted: APP-2026-0850',
      message: 'Your 5kW Residential (RGPU) connection application has been submitted and is awaiting verification.',
      time: '15 mins ago',
      category: 'Approval',
    },
    {
      id: 'DYN-2',
      title: 'Clarification Required: APP-2026-0851',
      message: 'Subdivision officer requested additional information: Please upload clearer Index-II copy.',
      time: '1 hour ago',
      category: 'Approval',
      eventType: 'CLARIFICATION_REQUESTED',
    },
    {
      id: 'DYN-3',
      title: 'Document Verification In Progress: APP-2026-0842',
      message: 'Subdivision office is verifying your uploaded identity and property documents for 3kW connection.',
      time: '2 hours ago',
      category: 'Approval',
    },
    {
      id: 'DYN-4',
      title: 'Site Inspection Scheduled: APP-2026-0843',
      message: 'Field Engineer has been assigned to inspect site feasibility for your 15kW connection.',
      time: '3 hours ago',
      category: 'Inspection',
    },
    {
      id: 'DYN-5',
      title: 'Awaiting Final Sanction: APP-2026-0844',
      message: 'Site inspection completed. Your 10kW application is awaiting final sanction approval.',
      time: '5 hours ago',
      category: 'Approval',
    },
    {
      id: 'DYN-6',
      title: 'Application Rejected: APP-2026-0845',
      message: 'Your connection application could not be approved. Reason: Technical load limit exceeded',
      time: 'Recent',
      category: 'Approval',
      eventType: 'APPLICATION_REJECTED',
    },
    {
      id: 'DYN-7',
      title: 'Bill Payment Confirmed: BILL-UG-2026-10-8821',
      message: 'Payment of ₹2,185 via UPI received. Transaction Ref: TXN-UPI-9921448102.',
      time: 'Just now',
      category: 'Billing',
    },
    {
      id: 'DYN-8',
      title: 'Connection Linked: 04281-99231',
      message: 'Electricity connection 04281-99231 (Meter MTR-2024-884102) is now linked to your account.',
      time: 'Just now',
      category: 'Approval',
    },
    {
      id: 'DYN-9',
      title: 'Field Team Dispatched: #CMP-8821',
      message: 'Your complaint regarding "Voltage Fluctuation" has been assigned to JE Solanki. Work Order WO-4401 is now in progress.',
      time: '15 mins ago',
      category: 'Outage',
    },
    {
      id: 'DYN-10',
      title: 'Grievance #CMP-8815 Resolved',
      message: 'Field engineer JE Solanki has resolved your "Power Outage" complaint. Remarks: Blown HT fuse replaced.',
      time: '2 hours ago',
      category: 'Outage',
    },
  ];

  for (const sample of dynamicSamples) {
    const enRes = localizeConsumerNotification(sample, 'en');
    assert.equal(enRes.title, sample.title);
    assert.equal(enRes.message, sample.message);

    for (const lang of ['gu', 'hi', 'mr'] as const) {
      const locRes = localizeConsumerNotification(sample, lang);
      assert.notEqual(locRes.title, sample.title, `Expected translated title for ${sample.id} in ${lang}`);
      assert.notEqual(locRes.message, sample.message, `Expected translated message for ${sample.id} in ${lang}`);
      assert.notEqual(locRes.time, sample.time, `Expected translated timestamp for ${sample.id} in ${lang}`);
    }
  }

  for (const badge of [
    'Approved',
    'Rejected',
    'Clarification Requested',
    'Clarification Required',
    'Awaiting Approval',
    'Document Verification',
    'Site Inspection',
    'In Progress',
    'New Submission',
    'Field Assignment',
    'Executive Escalation',
    'Billing',
    'Approval',
    'Outage',
    'Inspection',
    'Security',
  ]) {
    assert.equal(localizeNotificationStatusBadge(badge, 'en'), badge);
    for (const lang of ['gu', 'hi', 'mr'] as const) {
      assert.notEqual(localizeNotificationStatusBadge(badge, lang), badge, `Badge '${badge}' must be localized in ${lang}`);
    }
  }

  assert.notEqual(localizeNotificationTimestamp('10 mins ago', 'hi'), '10 mins ago');
  assert.notEqual(localizeNotificationTimestamp('4 hours ago', 'gu'), '4 hours ago');
  assert.notEqual(localizeNotificationTimestamp('2 days ago', 'mr'), '2 days ago');

  console.log('✓ Test 8 passed: Complete four-language notification localization verified for APP-2026-0849 and all static/dynamic notification categories');
}

// 9. NotificationDrawer Component Wiring Verification
{
  const notifDrawerSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/NotificationDrawer.tsx'),
    'utf-8'
  );

  assert.ok(notifDrawerSrc.includes('const { language, t } = useLanguage()'), 'NotificationDrawer must destructure both language and t from useLanguage()');
  assert.ok(notifDrawerSrc.includes('localizeConsumerNotification(item, language)'), 'NotificationDrawer must localize each notification record via localizeConsumerNotification(item, language)');
  assert.ok(notifDrawerSrc.includes('localizeNotificationStatusBadge(rawLabel, language)'), 'NotificationDrawer must localize status badges via localizeNotificationStatusBadge');
  assert.ok(notifDrawerSrc.includes('localizeSubdivision(rawSubdivision, language)'), 'NotificationDrawer must localize subdivision names via localizeSubdivision');
  assert.ok(notifDrawerSrc.includes('{localizedNotif.title}'), 'NotificationDrawer must render localizedNotif.title');
  assert.ok(notifDrawerSrc.includes('{localizedNotif.message}'), 'NotificationDrawer must render localizedNotif.message');
  assert.ok(notifDrawerSrc.includes('{t.erp.filterUnread}'), 'NotificationDrawer must render localized Unread badge');
  assert.ok(notifDrawerSrc.includes('{t.erp.readBadge}'), 'NotificationDrawer must render localized Read badge');
  assert.ok(notifDrawerSrc.includes('{t.erp.subdivisionPrefix} {displaySubdivision}'), 'NotificationDrawer must render localized Subdivision prefix and name');
  assert.ok(notifDrawerSrc.includes('{t.erp.openApplicationPrefix} {appId}'), 'NotificationDrawer must render localized Open Application link');

  console.log('✓ Test 9 passed: NotificationDrawer.tsx is wired to reactive four-language localization helpers for all card elements');
}

console.log('All Phase 2, Step 2 Consumer Portal & Notification Drawer Multilingual Localization tests passed!');
