/**
 * Phase 1 Final Multilingual Content Repair Test Suite
 *
 * Verifies that:
 * 1. Gujarati, Hindi, and Marathi card titles, descriptions, categories,
 *    and summaries display actual non-English localized content.
 * 2. English retains the exact canonical content verbatim.
 * 3. All 8 Historical Timeline milestones are localized.
 * 4. All 4 National Ratings & Achievements are localized.
 * 5. All 4 News, Circulars & Notices are localized.
 * 6. All 7 Media Gallery photo assets are localized.
 * 7. All 6 Infrastructure Facts are localized.
 * 8. NoticeDetailModal "View Original" toggles return canonical English text.
 * 9. Missing translations or unknown IDs do not throw or crash (fallback safely).
 * 10. Language switching is pure and immediately reactive.
 */

import assert from 'node:assert/strict';
import {
  UGVCL_MILESTONES,
  UGVCL_AWARDS,
  UGVCL_NOTICES,
  UGVCL_PHOTO_MANIFEST,
  UGVCL_INFRASTRUCTURE_FACTS
} from '../src/data/ugvclHistoryData';
import {
  getLocalizedMilestone,
  getLocalizedAward,
  getLocalizedNotice,
  getLocalizedPhoto,
  getLocalizedInfraFact,
  LOCALIZED_NOTICE_UI
} from '../src/i18n/contentTranslations';
import { LanguageCode } from '../src/i18n/types';

console.log('Running Phase 1 Multilingual Card Content Repair Tests...\n');

const nonEnglishLanguages: LanguageCode[] = ['gu', 'hi', 'mr'];
const allLanguages: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];

// Helper to check non-ASCII / Indic characters
const hasNonAscii = (str: string) => /[^\x00-\x7F]/.test(str);

/* ========================================================================= */
/* TEST 1: HISTORICAL TIMELINE (8 Milestones)                                */
/* ========================================================================= */
console.log('Testing Section 1: Historical Timeline Milestones (8 Cards)...');
assert.equal(UGVCL_MILESTONES.length, 8, 'There must be exactly 8 milestones');

for (const milestone of UGVCL_MILESTONES) {
  // English verbatim preservation
  const enMilestone = getLocalizedMilestone(milestone, 'en');
  assert.equal(enMilestone.title, milestone.title, `English title for ${milestone.year} must be identical to canonical`);
  assert.equal(enMilestone.category, milestone.category, `English category for ${milestone.year} must be identical to canonical`);
  assert.equal(enMilestone.description, milestone.description, `English description for ${milestone.year} must be identical to canonical`);

  // Localized versions
  for (const lang of nonEnglishLanguages) {
    const loc = getLocalizedMilestone(milestone, lang);
    assert.ok(loc.title && loc.title.length > 5, `${lang} title for ${milestone.year} must be non-empty`);
    assert.ok(loc.description && loc.description.length > 20, `${lang} description for ${milestone.year} must be non-empty`);
    assert.ok(loc.category && loc.category.length > 2, `${lang} category for ${milestone.year} must be non-empty`);
    assert.ok(hasNonAscii(loc.title), `${lang} title for ${milestone.year} must contain localized script`);
    assert.ok(hasNonAscii(loc.description), `${lang} description for ${milestone.year} must contain localized script`);
    assert.ok(hasNonAscii(loc.category), `${lang} category for ${milestone.year} must contain localized script`);
  }
}

// Check specific milestone representative samples
const gu2003 = getLocalizedMilestone(UGVCL_MILESTONES[0], 'gu');
assert.equal(gu2003.title, 'કંપની સ્થાપના અને વીજ ક્ષેત્રનું પુનર્ગઠન');
assert.equal(gu2003.category, 'સંસ્થા સ્થાપના');

const hi2006 = getLocalizedMilestone(UGVCL_MILESTONES[2], 'hi');
assert.equal(hi2006.title, 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण मील का पत्थर');
assert.equal(hi2006.category, 'विद्युतीकरण');

const mr2026 = getLocalizedMilestone(UGVCL_MILESTONES[7], 'mr');
assert.equal(mr2026.title, '१४व्या एकात्मिक डिस्कॉम रेटिंगमध्ये राष्ट्रीय ग्रेड A+ सन्मान');
assert.equal(mr2026.category, 'राष्ट्रीय सन्मान');

console.log('✓ All 8 Historical Timeline milestone cards verified across EN, GU, HI, MR');

/* ========================================================================= */
/* TEST 2: NATIONAL RATINGS & ACHIEVEMENTS (4 Awards)                        */
/* ========================================================================= */
console.log('Testing Section 2: National Ratings & Achievements (4 Cards)...');
assert.equal(UGVCL_AWARDS.length, 4, 'There must be exactly 4 awards');

for (const award of UGVCL_AWARDS) {
  // English verbatim preservation
  const enAward = getLocalizedAward(award, 'en');
  assert.equal(enAward.title, award.title, `English award title for ${award.id} must match canonical`);
  assert.equal(enAward.gradeOrRank, award.gradeOrRank, `English gradeOrRank for ${award.id} must match canonical`);
  assert.equal(enAward.significance, award.significance, `English significance for ${award.id} must match canonical`);

  // Localized versions
  for (const lang of nonEnglishLanguages) {
    const loc = getLocalizedAward(award, lang);
    assert.ok(loc.title && loc.title.length > 5, `${lang} title for ${award.id} must be non-empty`);
    assert.ok(loc.gradeOrRank && loc.gradeOrRank.length > 2, `${lang} gradeOrRank for ${award.id} must be non-empty`);
    assert.ok(loc.significance && loc.significance.length > 20, `${lang} significance for ${award.id} must be non-empty`);
    assert.ok(hasNonAscii(loc.title), `${lang} title for ${award.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.significance), `${lang} significance for ${award.id} must contain localized script`);
  }
}

// Check specific award samples
const guAward14 = getLocalizedAward(UGVCL_AWARDS[0], 'gu');
assert.equal(guAward14.title, 'વીજ વિતરણ કંપનીઓનું ૧૪મું સંકલિત રેટિંગ');
assert.equal(guAward14.gradeOrRank, 'ગ્રેડ A+ (શ્રેષ્ઠ પ્રદર્શન કરતી રાજ્ય ડિસ્કોમ)');

const hiAward12 = getLocalizedAward(UGVCL_AWARDS[1], 'hi');
assert.equal(hiAward12.title, 'डिस्कॉम का १२वां एकीकृत रेटिंग संस्करण');
assert.equal(hiAward12.gradeOrRank, 'देशभर में ५वीं रैंक (ग्रेड A+)');

const mrAwardJyotigram = getLocalizedAward(UGVCL_AWARDS[3], 'mr');
assert.equal(mrAwardJyotigram.title, 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण मानदंड');
assert.equal(mrAwardJyotigram.gradeOrRank, 'राष्ट्रीय सर्वोत्तम कार्यपद्धती मॉडेल');

console.log('✓ All 4 National Ratings & Achievement cards verified across EN, GU, HI, MR');

/* ========================================================================= */
/* TEST 3: NEWS, CIRCULARS & NOTICES (4 Notices)                             */
/* ========================================================================= */
console.log('Testing Section 3: News, Circulars & Announcements (4 Notices)...');
assert.equal(UGVCL_NOTICES.length, 4, 'There must be exactly 4 notices');

for (const notice of UGVCL_NOTICES) {
  // English verbatim preservation
  const enNotice = getLocalizedNotice(notice, 'en');
  assert.equal(enNotice.title, notice.title, `English notice title for ${notice.id} must match canonical`);
  assert.equal(enNotice.summary, notice.summary, `English notice summary for ${notice.id} must match canonical`);
  assert.equal(enNotice.category, notice.category, `English notice category for ${notice.id} must match canonical`);
  assert.equal(enNotice.circle, notice.circle, `English notice circle for ${notice.id} must match canonical`);

  // Localized versions
  for (const lang of nonEnglishLanguages) {
    const loc = getLocalizedNotice(notice, lang);
    assert.ok(loc.title && loc.title.length > 5, `${lang} title for ${notice.id} must be non-empty`);
    assert.ok(loc.summary && loc.summary.length > 20, `${lang} summary for ${notice.id} must be non-empty`);
    assert.ok(loc.category && loc.category.length > 2, `${lang} category for ${notice.id} must be non-empty`);
    assert.ok(loc.circle && loc.circle.length > 2, `${lang} circle for ${notice.id} must be non-empty`);
    assert.ok(hasNonAscii(loc.title), `${lang} title for ${notice.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.summary), `${lang} summary for ${notice.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.category), `${lang} category for ${notice.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.circle), `${lang} circle for ${notice.id} must contain localized script`);
  }
}

// Check specific notice samples
const guNotif04 = getLocalizedNotice(UGVCL_NOTICES[0], 'gu');
assert.equal(guNotif04.title, 'આયોજિત નિવારક ફીડર જાળવણી: ૬૬ કેવી વિસનગર રોડ સબ-સ્ટેશન');
assert.equal(guNotif04.category, 'આયોજિત જાળવણી');
assert.equal(guNotif04.circle, 'મહેસાણા શહેર વિભાગ');

const hiNotif01 = getLocalizedNotice(UGVCL_NOTICES[1], 'hi');
assert.equal(hiNotif01.title, 'किसान सूर्योदय योजना (KSY) रबी मौसम हेतु संशोधित दिनकालीन फीडर रोस्टर');
assert.equal(hiNotif01.category, 'उपभोक्ता परामर्श');
assert.equal(hiNotif01.circle, 'सभी ६ सर्कल');

const mrNotif02 = getLocalizedNotice(UGVCL_NOTICES[2], 'mr');
assert.equal(mrNotif02.title, 'सूर्य गुजरात रूफटॉप सोलर नेट-मीटरिंग अनुदान टप्पा-४ अर्ज मार्गदर्शक तत्त्वे');
assert.equal(mrNotif02.category, 'धोरण आणि दरपत्रक');

console.log('✓ All 4 News and Public Circular notices verified across EN, GU, HI, MR');

/* ========================================================================= */
/* TEST 4: MEDIA GALLERY & PHOTO ASSETS (7 Photos)                           */
/* ========================================================================= */
console.log('Testing Section 4: Media Gallery & Photo Assets (7 Assets)...');
assert.equal(UGVCL_PHOTO_MANIFEST.length, 7, 'There must be exactly 7 photo assets');

for (const photo of UGVCL_PHOTO_MANIFEST) {
  // English verbatim preservation
  const enPhoto = getLocalizedPhoto(photo, 'en');
  assert.equal(enPhoto.title, photo.title, `English photo title for ${photo.id} must match canonical`);
  assert.equal(enPhoto.caption, photo.caption, `English photo caption for ${photo.id} must match canonical`);
  assert.equal(enPhoto.category, photo.category, `English photo category for ${photo.id} must match canonical`);
  assert.equal(enPhoto.subject, photo.subject, `English photo subject for ${photo.id} must match canonical`);
  assert.equal(enPhoto.location, photo.location, `English photo location for ${photo.id} must match canonical`);

  // Localized versions
  for (const lang of nonEnglishLanguages) {
    const loc = getLocalizedPhoto(photo, lang);
    assert.ok(loc.title && loc.title.length > 5, `${lang} title for ${photo.id} must be non-empty`);
    assert.ok(loc.caption && loc.caption.length > 15, `${lang} caption for ${photo.id} must be non-empty`);
    assert.ok(loc.category && loc.category.length > 2, `${lang} category for ${photo.id} must be non-empty`);
    assert.ok(loc.subject && loc.subject.length > 5, `${lang} subject for ${photo.id} must be non-empty`);
    assert.ok(loc.location && loc.location.length > 5, `${lang} location for ${photo.id} must be non-empty`);
    assert.ok(hasNonAscii(loc.title), `${lang} title for ${photo.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.caption), `${lang} caption for ${photo.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.category), `${lang} category for ${photo.id} must contain localized script`);
    assert.ok(hasNonAscii(loc.location), `${lang} location for ${photo.id} must contain localized script`);
  }
}

// Check specific photo samples
const guPhotoMap = getLocalizedPhoto(UGVCL_PHOTO_MANIFEST[0], 'gu');
assert.equal(guPhotoMap.title, 'UGVCL સત્તાવાર ભૌગોલિક અધિકારક્ષેત્ર નકશો');
assert.equal(guPhotoMap.category, 'અધિકારક્ષેત્ર');

const hiPhotoSolar = getLocalizedPhoto(UGVCL_PHOTO_MANIFEST[1], 'hi');
assert.equal(hiPhotoSolar.title, 'चारणका सोलर पार्क, पाटन (UGVCL सेवा क्षेत्र)');
assert.equal(hiPhotoSolar.category, 'सौर एवं हरित ऊर्जा');

const mrPhotoHq = getLocalizedPhoto(UGVCL_PHOTO_MANIFEST[6], 'mr');
assert.equal(mrPhotoHq.title, 'UGVCL कॉर्पोरेट मुख्यालय (विसनगर रोड, मेहसाणा)');
assert.equal(mrPhotoHq.category, 'कॉर्पोरेट मुख्यालय');

console.log('✓ All 7 Media Gallery photo assets verified across EN, GU, HI, MR');

/* ========================================================================= */
/* TEST 5: INFRASTRUCTURE FACTS (6 Facts)                                    */
/* ========================================================================= */
console.log('Testing Section 5: Infrastructure Facts (6 Facts)...');
assert.equal(UGVCL_INFRASTRUCTURE_FACTS.length, 6, 'There must be exactly 6 facts');

for (const fact of UGVCL_INFRASTRUCTURE_FACTS) {
  // English verbatim preservation
  const enFact = getLocalizedInfraFact(fact, 'en');
  assert.equal(enFact.label, fact.label, `English fact label for ${fact.label} must match canonical`);
  assert.equal(enFact.note, fact.note, `English fact note for ${fact.label} must match canonical`);

  // Localized versions
  for (const lang of nonEnglishLanguages) {
    const loc = getLocalizedInfraFact(fact, lang);
    assert.ok(loc.label && loc.label.length > 2, `${lang} label for ${fact.label} must be non-empty`);
    assert.ok(loc.note && loc.note.length > 5, `${lang} note for ${fact.label} must be non-empty`);
    assert.ok(hasNonAscii(loc.label), `${lang} label for ${fact.label} must contain localized script`);
    assert.ok(hasNonAscii(loc.note), `${lang} note for ${fact.label} must contain localized script`);
  }
}

console.log('✓ All 6 Infrastructure facts verified across EN, GU, HI, MR');

/* ========================================================================= */
/* TEST 6: NOTICE DETAIL MODAL "VIEW ORIGINAL" TOGGLE                        */
/* ========================================================================= */
console.log('Testing Section 6: Notice Detail Modal View Original Toggle UI Labels...');
for (const lang of allLanguages) {
  assert.ok(LOCALIZED_NOTICE_UI.viewOriginalOrder[lang], `Must have viewOriginalOrder for ${lang}`);
  assert.ok(LOCALIZED_NOTICE_UI.viewLocalizedOrder[lang], `Must have viewLocalizedOrder for ${lang}`);
  assert.ok(LOCALIZED_NOTICE_UI.originalBadge[lang], `Must have originalBadge for ${lang}`);
  assert.ok(LOCALIZED_NOTICE_UI.translatedBadge[lang], `Must have translatedBadge for ${lang}`);
}
assert.equal(LOCALIZED_NOTICE_UI.viewOriginalOrder.en, 'View Original Order (English)');
assert.equal(LOCALIZED_NOTICE_UI.viewOriginalOrder.gu, 'મૂળ સત્તાવાર આદેશ જુઓ (અંગ્રેજી)');
assert.equal(LOCALIZED_NOTICE_UI.viewOriginalOrder.hi, 'मूल आधिकारिक आदेश देखें (अंग्रेजी)');
assert.equal(LOCALIZED_NOTICE_UI.viewOriginalOrder.mr, 'मूळ अधिकृत आदेश पहा (इंग्रजी)');
console.log('✓ Notice Detail Modal View Original toggle UI strings verified across all 4 languages');

/* ========================================================================= */
/* TEST 7: SAFE RESILIENCE & FALLBACK PROTECTION                             */
/* ========================================================================= */
console.log('Testing Section 7: Fallback Resilience & Crash Protection...');

// Unknown milestone year
const unknownMilestone = {
  year: '1999',
  title: 'Legacy Power Station',
  category: 'Infrastructure' as const,
  description: 'Built during early power development in Gujarat.',
  verifiedSource: 'Historical Archive'
};
const fallbackMilestone = getLocalizedMilestone(unknownMilestone, 'gu');
assert.equal(fallbackMilestone.title, 'Legacy Power Station', 'Must fallback cleanly to canonical title');
assert.equal(fallbackMilestone.category, 'Infrastructure', 'Must fallback cleanly to canonical category');

// Unknown award ID
const unknownAward = {
  id: 'award-unknown',
  title: 'Special Recognition',
  awardingBody: 'National Board',
  year: '2021',
  gradeOrRank: 'First Class',
  significance: 'Excellence in distribution.',
  officialReport: 'Board Records'
};
const fallbackAward = getLocalizedAward(unknownAward, 'hi');
assert.equal(fallbackAward.title, 'Special Recognition', 'Must fallback cleanly to canonical award title');
assert.equal(fallbackAward.gradeOrRank, 'First Class', 'Must fallback cleanly to canonical grade');

// Unknown notice ID
const unknownNotice = {
  id: 'notif-unknown',
  refNo: 'UGVCL/DEMO/999',
  date: '01-Jan-2026',
  category: 'Consumer Advisory' as const,
  title: 'Urgent Advisory',
  summary: 'Important public announcement.',
  circle: 'All Circles',
  isSampleDemo: false
};
const fallbackNotice = getLocalizedNotice(unknownNotice, 'mr');
assert.equal(fallbackNotice.title, 'Urgent Advisory', 'Must fallback cleanly to canonical notice title');

// Unknown photo asset ID
const unknownPhoto = {
  id: 'photo-unknown',
  title: 'Custom Substation',
  caption: 'Substation switchyard visual.',
  category: 'Substations' as const,
  fallbackUrl: 'https://example.com/sub.jpg',
  subject: '33kV Substation',
  location: 'Patan',
  license: 'Public Domain' as const,
  attribution: 'Public Domain',
  originalSourceUrl: 'https://example.com',
  isAuthentic: true,
  statusNotes: 'Verified'
};
const fallbackPhoto = getLocalizedPhoto(unknownPhoto, 'gu');
assert.equal(fallbackPhoto.title, 'Custom Substation', 'Must fallback cleanly to canonical photo title');

console.log('✓ Fallback resilience verified: Unregistered items return canonical values without throwing');

/* ========================================================================= */
/* TEST 8: PURE & INSTANT REACTIVITY (Zero Page Refresh Needed)              */
/* ========================================================================= */
console.log('Testing Section 8: Reactive Translation Resolution (Pure Functions)...');

const sampleNotice = UGVCL_NOTICES[0];
const enResult = getLocalizedNotice(sampleNotice, 'en');
const guResult = getLocalizedNotice(sampleNotice, 'gu');
const hiResult = getLocalizedNotice(sampleNotice, 'hi');
const mrResult = getLocalizedNotice(sampleNotice, 'mr');

assert.notEqual(enResult.title, guResult.title, 'EN and GU titles must differ');
assert.notEqual(guResult.title, hiResult.title, 'GU and HI titles must differ');
assert.notEqual(hiResult.title, mrResult.title, 'HI and MR titles must differ');

// Switch back to EN immediately
const recheckEn = getLocalizedNotice(sampleNotice, 'en');
assert.equal(recheckEn.title, enResult.title, 'Switching back to EN immediately yields original canonical English text');

console.log('✓ Immediate language reactivity verified across all 4 languages');

console.log('\n🎉 ALL Phase 1 Multilingual Card Content Repair tests PASSED perfectly!');
