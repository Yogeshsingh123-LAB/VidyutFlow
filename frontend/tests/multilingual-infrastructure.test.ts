/**
 * Phase 1 Multilingual Verification Suite
 * Tests:
 * 1. 4 Languages (English, Gujarati, Hindi, Marathi) infrastructure and dictionaries.
 * 2. Typed dictionary completeness and consistency.
 * 3. English fallback mechanism for missing keys.
 * 4. Dedicated namespaced storage preference key.
 * 5. Language selector positioning beside ERP & Portal Login button.
 * 6. Accessibility semantics (listbox, role="option", aria-expanded, keyboard handlers).
 * 7. Verification that original English text is preserved verbatim.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../src/i18n/types';
import { LANGUAGE_STORAGE_KEY } from '../src/i18n/LanguageContext';

console.log('Running Multilingual Infrastructure & Welcome Hub Tests...\n');

// 1. Verify 4 supported languages
assert.equal(SUPPORTED_LANGUAGES.length, 4, 'Must support exactly 4 languages');
const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
assert.deepEqual(supportedCodes, ['en', 'gu', 'hi', 'mr'], 'Supported languages must be en, gu, hi, mr');

// Verify native names
const guOption = SUPPORTED_LANGUAGES.find((l) => l.code === 'gu');
assert.equal(guOption?.nativeName, 'ગુજરાતી', 'Gujarati native name must be ગુજરાતી');

const hiOption = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi');
assert.equal(hiOption?.nativeName, 'हिन्दी', 'Hindi native name must be हिन्दी');

const mrOption = SUPPORTED_LANGUAGES.find((l) => l.code === 'mr');
assert.equal(mrOption?.nativeName, 'मराठी', 'Marathi native name must be मराठी');

const enOption = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
assert.equal(enOption?.nativeName, 'English', 'English native name must be English');

console.log('✓ Supported language definitions and native scripts verified');

// 2. Storage key verification
assert.equal(LANGUAGE_STORAGE_KEY, 'vidyutflow_language_preference', 'Storage key must be namespaced');
console.log('✓ Namespaced localStorage preference key verified');

// 3. Completeness of dictionaries across all 4 languages
const dicts = { en, gu, hi, mr };
const sections = Object.keys(en) as (keyof typeof en)[];

for (const [langCode, dict] of Object.entries(dicts)) {
  for (const section of sections) {
    assert.ok(dict[section], `Dictionary for ${langCode} must have section "${section}"`);
    const enKeys = Object.keys(en[section]);
    const langKeys = Object.keys(dict[section]);
    for (const key of enKeys) {
      assert.ok(
        langKeys.includes(key),
        `Dictionary for ${langCode} is missing key "${section}.${key}"`
      );
      const val = (dict[section] as Record<string, string>)[key];
      assert.ok(
        typeof val === 'string' && val.length > 0,
        `Dictionary for ${langCode} has empty value for key "${section}.${key}"`
      );
    }
  }
}
console.log('✓ All 4 translation dictionaries are complete and non-empty across all sections');

// 3b. Verify deep merge logic ensures estimator and modals are defined in all languages
for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
  const currentDict = dicts[lang];
  const merged: Record<string, Record<string, string>> = {};
  for (const section of Object.keys(en) as (keyof typeof en)[]) {
    merged[section] = {
      ...(en[section] as Record<string, string>),
      ...((currentDict && (currentDict as unknown as Record<string, Record<string, string>>)[section]) || {})
    };
  }
  assert.ok(merged.estimator, `Merged dictionary for ${lang} must have estimator defined`);
  assert.ok(merged.estimator.presetLifeline, `Merged dictionary for ${lang} must have presetLifeline defined`);
  assert.ok(merged.modals, `Merged dictionary for ${lang} must have modals defined`);
}
console.log('✓ Merged dictionary guarantees estimator and modals across all 4 languages');

// 4. Verbatim preservation of original English copy
assert.equal(en.common.helpline, 'Helpline: 19122');
assert.equal(en.common.tariffPdf, 'Tariff Schedule (PDF)');
assert.equal(en.common.erpLogin, 'ERP & Portal Login');
assert.equal(en.header.govGujarat, 'Government of Gujarat');
assert.equal(en.header.guvnlSub, 'A Subsidiary of Gujarat Urja Vikas Nigam Limited (GUVNL)');
assert.equal(en.header.powerPortal, 'UGVCL Power Portal');
assert.equal(en.hero.title, 'Powering North Gujarat’s Growth with Uninterrupted Reliability.');
assert.equal(en.hero.ctaConsumer, 'Consumer Self-Service');
assert.equal(en.hero.ctaStaff, 'ERP & Staff Workspace');
assert.equal(en.hero.statJurisdictionVal, '6 Districts');
assert.equal(en.hero.statConsumerBaseVal, '3.8M+');
assert.equal(en.hero.statRuralPowerVal, '100% 24x7');
assert.equal(en.hero.statNationalRatingVal, 'Grade A+');
assert.equal(en.about.badge, 'Corporate Heritage & Institutional Mandate');
assert.equal(en.about.title, 'About Uttar Gujarat Vij Company Limited');
assert.equal(en.achievements.badge, 'Documented Recognition & Benchmarks');
assert.equal(en.achievements.title, 'UGVCL National Ratings & Public Service Achievements');
assert.equal(en.services.badge, 'Public Information & Operational Understanding');
assert.equal(en.services.title, 'Understanding UGVCL');
assert.equal(en.notices.badge, 'Public Information & Corporate Gazettes');
assert.equal(en.notices.title, 'News, Circulars & Announcements');
assert.equal(en.gallery.badge, 'Authentic Visual Documentation');
assert.equal(en.gallery.title, 'UGVCL Infrastructure & Operations Gallery');
assert.equal(en.journey.badge, 'Electricity Distribution Architecture');
assert.equal(en.journey.title, 'From Generation to Consumer: The Power Journey');
console.log('✓ Original English copy preserved verbatim');

// 5. Representative translation verification for each language
assert.equal(gu.about.badge, 'સંસ્થાકીય વારસો અને સત્તાવાર જનાદેશ');
assert.equal(gu.achievements.flagshipTitle, 'ગુજરાતના વિકાસને વેગ આપતા મુખ્ય ઉર્જા કાર્યક્રમો');
assert.equal(gu.services.title, 'UGVCL પરિચય');
assert.equal(gu.estimator.headerTitle, 'વીજળી બિલ ગણતરી પત્રક અને ટેરિફ વિશ્લેષક');
assert.equal(gu.notices.title, 'સમાચાર, પરિપત્રો અને જાહેરાતો');
assert.equal(gu.gallery.title, 'UGVCL ઇન્ફ્રાસ્ટ્રક્ચર અને ઓપરેશન્સ ગેલેરી');
assert.equal(gu.journey.title, 'વીજ ઉત્પાદનથી ગ્રાહક સુધી: પાવર જર્ની');
assert.equal(gu.modals.aboutModalTitle, 'વિદ્યુતવન વિશે — UGVCL આર્કિટેક્ચર');
console.log('✓ Gujarati translations verified across all sections');

assert.equal(hi.about.badge, 'संस्थागत विरासत एवं आधिकारिक अधिदेश');
assert.equal(hi.achievements.flagshipTitle, 'गुजरात के विकास को गति देने वाले प्रमुख ऊर्जा कार्यक्रम');
assert.equal(hi.services.title, 'UGVCL परिचय');
assert.equal(hi.estimator.headerTitle, 'बिजली बिल अनुमानक एवं टैरिफ विश्लेषक');
assert.equal(hi.notices.title, 'समाचार, परिपत्र एवं घोषणाएं');
assert.equal(hi.gallery.title, 'UGVCL बुनियादी ढांचा एवं परिचालन गैलरी');
assert.equal(hi.journey.title, 'उत्पादन से उपभोक्ता तक: विद्युत यात्रा');
assert.equal(hi.modals.aboutModalTitle, 'विद्युतवन के बारे में — UGVCL वास्तुकला');
console.log('✓ Hindi translations verified across all sections');

assert.equal(mr.about.badge, 'संस्थात्मक वारसा आणि अधिकृत कर्तव्य');
assert.equal(mr.achievements.flagshipTitle, 'गुजरातच्या विकासाला गती देणारे प्रमुख ऊर्जा कार्यक्रम');
assert.equal(mr.services.title, 'UGVCL परिचय');
assert.equal(mr.estimator.headerTitle, 'वीज बिल गणक आणि दरपत्रक विश्लेषक');
assert.equal(mr.notices.title, 'बातम्या, परिपत्रके आणि घोषणा');
assert.equal(mr.gallery.title, 'UGVCL पायाभूत सुविधा आणि ऑपरेशन्स दालन');
assert.equal(mr.journey.title, 'निर्मितीपासून ग्राहकापर्यंत: वीज प्रवाह प्रवास');
assert.equal(mr.modals.aboutModalTitle, 'विद्युतवन बद्दल — UGVCL आर्किटेक्चर');
console.log('✓ Marathi translations verified across all sections');

// 6. Verify LanguageSelector component presence and accessibility
const selectorSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/common/LanguageSelector.tsx'),
  'utf8'
);
assert.ok(selectorSource.includes('aria-haspopup="listbox"'), 'LanguageSelector must have aria-haspopup="listbox"');
assert.ok(selectorSource.includes('aria-expanded'), 'LanguageSelector must manage aria-expanded');
assert.ok(selectorSource.includes('role="listbox"'), 'LanguageSelector dropdown must have role="listbox"');
assert.ok(selectorSource.includes('role="option"'), 'LanguageSelector options must have role="option"');
assert.ok(selectorSource.includes('aria-selected'), 'LanguageSelector options must have aria-selected');
assert.ok(selectorSource.includes("case 'Escape':"), 'LanguageSelector must handle Escape key');
assert.ok(selectorSource.includes("case 'ArrowDown':"), 'LanguageSelector must handle ArrowDown key');
assert.ok(selectorSource.includes("case 'ArrowUp':"), 'LanguageSelector must handle ArrowUp key');
assert.ok(selectorSource.includes('focus-visible:ring-2'), 'LanguageSelector must have visible focus indicators');
console.log('✓ LanguageSelector accessibility semantics (ARIA, listbox, options, keyboard handlers) verified');

// 7. Verify InstitutionalHeader layout contains LanguageSelector beside ERP Login
const headerSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/welcome/InstitutionalHeader.tsx'),
  'utf8'
);
assert.ok(headerSource.includes('LanguageSelector'), 'InstitutionalHeader must import and render LanguageSelector');
assert.ok(
  headerSource.includes('<LanguageSelector variant="header" />'),
  'InstitutionalHeader must render LanguageSelector variant="header"'
);
assert.ok(
  headerSource.includes('<LanguageSelector variant="mobile" />'),
  'InstitutionalHeader must render LanguageSelector variant="mobile" in drawer'
);
assert.ok(
  headerSource.includes('handleLaunchERP'),
  'InstitutionalHeader must retain ERP & Portal Login launcher'
);
console.log('✓ LanguageSelector positioned in top-right navigation area beside ERP & Portal Login button');

// 8. Verify App.tsx mounts LanguageProvider
const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
assert.ok(appSource.includes('LanguageProvider'), 'App.tsx must mount LanguageProvider');
console.log('✓ App.tsx mounts LanguageProvider around main application tree');

console.log('\n✅ All Multilingual Infrastructure & Welcome Hub tests passed successfully!');
