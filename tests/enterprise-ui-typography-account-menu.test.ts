import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FONT_STACKS,
  LANGUAGE_TYPOGRAPHY_PROFILES,
  TYPOGRAPHY_ROLE_TOKENS,
  getLanguageTypographyProfile,
  getTypographyRoleClasses,
  isIndicScriptLanguage,
  truncateAtWordBoundary,
  type TypographyRole,
} from '../src/utils/typographyTokens';
import {
  buildEnterpriseAccountMenuViewModel,
  getAccountMenuLabels,
} from '../src/components/common/EnterpriseAccountMenu';
import { getCanonicalDemoAccountsByRole } from '../src/data/demoAuthData';
import {
  UGVCL_CORPORATE_PROFILE,
  UGVCL_MILESTONES,
  UGVCL_AWARDS,
} from '../src/data/ugvclHistoryData';
import {
  getLocalizedMilestone,
  getLocalizedAward,
} from '../src/i18n/contentTranslations';
import { translations } from '../src/i18n/translations';
import type { LanguageCode } from '../src/i18n/types';
import type { UserRole } from '../src/types';

console.log('Running Phase 4 Step 4.5 — Enterprise UI Consistency, Multilingual Typography & Account Menu Tests...');

const LANGUAGES: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
const ROLES: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

// ============================================================================
// 12.1 MULTILINGUAL TYPOGRAPHY SYSTEM TESTS
// ============================================================================
{
  // Verify font stacks include dedicated Latin, Gujarati, Devanagari, and Monospace fonts
  assert.ok(
    FONT_STACKS.en.includes("'Plus Jakarta Sans'"),
    'English font stack must prioritize Plus Jakarta Sans'
  );
  assert.ok(
    FONT_STACKS.gu.startsWith("'Noto Sans Gujarati'"),
    'Gujarati font stack must prioritize Noto Sans Gujarati'
  );
  assert.ok(
    FONT_STACKS.hi.startsWith("'Noto Sans Devanagari'"),
    'Hindi font stack must prioritize Noto Sans Devanagari'
  );
  assert.ok(
    FONT_STACKS.mr.startsWith("'Noto Sans Devanagari'"),
    'Marathi font stack must prioritize Noto Sans Devanagari'
  );
  assert.ok(
    FONT_STACKS.mono.startsWith("'JetBrains Mono'"),
    'Monospace font stack must prioritize JetBrains Mono'
  );

  // Verify script family classification and language typography profiles
  assert.equal(getLanguageTypographyProfile('en').script, 'latin');
  assert.equal(getLanguageTypographyProfile('gu').script, 'gujarati');
  assert.equal(getLanguageTypographyProfile('hi').script, 'devanagari');
  assert.equal(getLanguageTypographyProfile('mr').script, 'devanagari');

  assert.equal(isIndicScriptLanguage('en'), false);
  assert.equal(isIndicScriptLanguage('gu'), true);
  assert.equal(isIndicScriptLanguage('hi'), true);
  assert.equal(isIndicScriptLanguage('mr'), true);

  for (const lang of ['gu', 'hi', 'mr'] as LanguageCode[]) {
    const profile = LANGUAGE_TYPOGRAPHY_PROFILES[lang];
    assert.equal(
      profile.allowSyntheticItalic,
      false,
      `${lang} profile must disable synthetic italic distortion`
    );
    assert.equal(
      profile.letterSpacingPolicy,
      'indic-normal',
      `${lang} profile must normalize letter-spacing so conjuncts/matras do not separate`
    );
  }

  // Verify all 13 required typography roles exist and return non-empty classes for all 4 languages
  const requiredRoles: TypographyRole[] = [
    'displayHeading',
    'heroHeading',
    'pageTitle',
    'sectionHeading',
    'cardHeading',
    'bodyText',
    'supportingText',
    'captionMetadata',
    'buttonLabel',
    'navigationLabel',
    'tableHeading',
    'badgeChip',
    'formLabelInput',
  ];

  for (const role of requiredRoles) {
    assert.ok(TYPOGRAPHY_ROLE_TOKENS[role], `Typography role token '${role}' must be defined`);
    for (const lang of LANGUAGES) {
      const classes = getTypographyRoleClasses(role, lang);
      assert.ok(
        typeof classes === 'string' && classes.trim().length > 0,
        `Typography role '${role}' must resolve valid classes for '${lang}'`
      );
      if (lang !== 'en') {
        assert.ok(
          !classes.includes('tracking-widest') && !classes.includes('tracking-wider'),
          `Indic typography role '${role}' in '${lang}' must not apply wide Latin letter-spacing`
        );
      }
    }
  }

  // Verify word-boundary-safe truncation never cuts mid-word or corrupts Indic scripts
  const englishSample =
    'UGVCL achieved Top Performers status in the National Smart Grid Mission (NSGM) utilities assessment for robust digital consumer service.';
  const gujaratiSample =
    'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ (UGVCL) ઉત્તર ગુજરાતના 6 જિલ્લાઓમાં 40 લાખથી વધુ ગ્રાહકોને વિશ્વસનીય વીજ પુરવઠો પૂરો પાડે છે.';
  const hindiSample =
    'उत्तर गुजरात विज कंपनी लिमिटेड (UGVCL) उत्तर गुजरात के 6 जिलों में 40 लाख से अधिक उपभोक्ताओं को विश्वसनीय बिजली आपूर्ति प्रदान करती है।';
  const marathiSample =
    'उत्तर गुजरात वीज कंपनी लिमिटेड (UGVCL) उत्तर गुजरातमधील 6 जिल्ह्यांमध्ये 40 लाखांहून अधिक ग्राहकांना विश्वासार्ह वीज पुरवठा करते.';

  for (const sample of [englishSample, gujaratiSample, hindiSample, marathiSample]) {
    const result = truncateAtWordBoundary(sample, 80);
    assert.equal(result.isTruncated, true);
    assert.ok(result.truncatedText.endsWith('…'), 'Truncated string must end with ellipsis');
    assert.ok(result.truncatedText.length <= 82, 'Truncated string must respect maxChars bound');
    const withoutEllipsis = result.truncatedText.slice(0, -1);
    assert.ok(
      sample.startsWith(withoutEllipsis),
      'Truncated prefix must be an exact prefix of original text without corrupted characters'
    );
  }
  const shortResult = truncateAtWordBoundary('Short text', 80);
  assert.equal(shortResult.isTruncated, false);
  assert.equal(
    shortResult.truncatedText,
    'Short text',
    'Strings shorter than maxChars must not be truncated'
  );

  // Verify global CSS and LanguageContext document-level synchronization
  const indexCss = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
  assert.ok(
    indexCss.includes("'Noto Sans Gujarati'") && indexCss.includes("'Noto Sans Devanagari'"),
    'src/index.css must include Noto Sans Gujarati and Noto Sans Devanagari in font stacks'
  );
  assert.ok(
    indexCss.includes('html[lang="gu"]') &&
      indexCss.includes('html[lang="hi"]') &&
      indexCss.includes('html[lang="mr"]'),
    'src/index.css must define language-specific font and matra-safe line-height rules for gu, hi, and mr'
  );

  const languageContextSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/i18n/LanguageContext.tsx'),
    'utf8'
  );
  assert.ok(
    languageContextSource.includes('document.documentElement.lang = language') &&
      languageContextSource.includes('document.documentElement.dataset.script'),
    'LanguageContext must synchronize document.documentElement.lang and dataset.script'
  );

  console.log('✓ 12.1 Multilingual Typography System tests passed');
}

// ============================================================================
// 12.2 ENTERPRISE ACCOUNT MENU REDESIGN TESTS
// ============================================================================
{
  // Verify localized labels exist across all 4 languages
  for (const lang of LANGUAGES) {
    const labels = getAccountMenuLabels(lang);
    assert.ok(labels.triggerAriaLabel.length > 0);
    assert.ok(labels.menuAriaLabel.length > 0);
    assert.ok(labels.currentSessionHeader.length > 0);
    assert.ok(labels.canonicalIdLabel.length > 0);
    assert.ok(labels.unitLabel.length > 0);
    assert.ok(labels.demoSwitcherHeader.length > 0);
    assert.ok(labels.activeAccountBadge.length > 0);
    assert.ok(labels.sessionActionsHeader.length > 0);
    assert.ok(labels.cautionZoneHeader.length > 0);
    assert.ok(labels.resetConfirmPrompt.length > 0);
    assert.ok(labels.resetConfirmAction.length > 0);
    assert.ok(labels.resetCancelAction.length > 0);
  }

  // Verify view model across all 5 portals and all 4 languages
  for (const role of ROLES) {
    const expectedRoleUsers = getCanonicalDemoAccountsByRole(role);
    assert.ok(expectedRoleUsers.length >= 1, `Role '${role}' must have canonical demo accounts`);
    const activeIdentity = expectedRoleUsers[0];

    for (const lang of LANGUAGES) {
      const vm = buildEnterpriseAccountMenuViewModel({
        currentRole: role,
        localizedRoleLabel: `${role.toUpperCase()} (${lang})`,
        activeUser: {
          id: activeIdentity.id,
          name: activeIdentity.name,
          email: activeIdentity.email,
          initials: activeIdentity.avatarInitials,
          designation: activeIdentity.designation,
          subdivision: activeIdentity.subdivision,
        },
        dataMode: 'DEMO',
      });

      // Section A: Current authenticated session
      assert.equal(vm.sectionA.canonicalId, activeIdentity.id);
      assert.equal(vm.sectionA.fullName, activeIdentity.name);
      assert.equal(vm.sectionA.role, role);
      assert.ok(vm.sectionA.initials.length >= 1 && vm.sectionA.initials.length <= 2);
      assert.ok(vm.sectionA.roleLabel.length > 0);
      assert.ok(vm.sectionA.subdivision.length > 0);
      assert.ok(vm.sectionA.designation.length > 0);

      // Section B: Permitted DEMO account switching
      assert.equal(
        vm.sectionB.accounts.length,
        expectedRoleUsers.length,
        `Role '${role}' must expose all ${expectedRoleUsers.length} permitted DEMO accounts`
      );
      const activeEntries = vm.sectionB.accounts.filter(a => a.isCurrent);
      assert.equal(activeEntries.length, 1, 'Exactly one DEMO account must be marked current');
      assert.equal(activeEntries[0].id, activeIdentity.id);

      // Ensure role isolation: no cross-role DEMO accounts leak into Section B
      for (const account of vm.sectionB.accounts) {
        const matched = expectedRoleUsers.find(u => u.id === account.id);
        assert.ok(matched, `Account ${account.id} must belong to role ${role}`);
      }

      // Section C: Navigation & session actions with two-step confirmation safeguard
      assert.equal(vm.sectionC.hasWelcomePortalAction, true);
      assert.equal(vm.sectionC.hasResetDemoAction, true);
      assert.equal(vm.sectionC.requiresResetConfirmation, true);
      assert.equal(vm.sectionC.hasSignOutAction, true);
    }
  }

  // Specifically verify all 4 Field Engineer DEMO accounts are preserved in Section B
  const fieldAccounts = getCanonicalDemoAccountsByRole('field');
  const fieldVm = buildEnterpriseAccountMenuViewModel({
    currentRole: 'field',
    localizedRoleLabel: 'Field Engineer',
    activeUser: {
      id: fieldAccounts[0].id,
      name: fieldAccounts[0].name,
      email: fieldAccounts[0].email,
      initials: fieldAccounts[0].avatarInitials,
      designation: fieldAccounts[0].designation,
      subdivision: fieldAccounts[0].subdivision,
    },
    dataMode: 'DEMO',
  });
  const fieldIds = fieldVm.sectionB.accounts.map(a => a.id);
  assert.deepEqual(
    fieldIds,
    ['FLD-UG-201', 'FLD-UG-204', 'FLD-UG-209', 'FLD-UG-212'],
    'All 4 Field Engineer DEMO accounts must be preserved in order'
  );

  // Verify EnterpriseAccountMenu component implements Escape key, outside click, and two-step Reset confirmation
  const menuSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/EnterpriseAccountMenu.tsx'),
    'utf8'
  );
  assert.ok(
    menuSource.includes("event.key === 'Escape'") &&
      menuSource.includes('triggerRef.current?.focus()'),
    'EnterpriseAccountMenu must close on Escape and restore focus to the trigger button'
  );
  assert.ok(
    menuSource.includes("document.addEventListener('mousedown', handleOutsideClick)"),
    'EnterpriseAccountMenu must close on outside click'
  );
  assert.ok(
    menuSource.includes('isConfirmingReset') &&
      menuSource.includes('data-testid="account-menu-reset-confirm"') &&
      menuSource.includes('data-testid="account-menu-reset-cancel"'),
    'EnterpriseAccountMenu must require a two-step inline confirmation before Reset Demo Records executes'
  );

  console.log('✓ 12.2 Enterprise Account Menu Redesign tests passed');
}

// ============================================================================
// 12.3 PUBLIC HOMEPAGE, TIMELINE, FIVE PORTALS & PROTECTED UGVCL CONTENT TESTS
// ============================================================================
{
  // Verify WelcomeHero, AboutUgvclSection, AchievementsSection, and ConsumerPortal structural safeguards
  const heroSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/welcome/WelcomeHero.tsx'),
    'utf8'
  );
  assert.ok(
    heroSource.includes("getTypographyRoleClasses('heroHeading', language)"),
    'WelcomeHero must apply script-aware heroHeading typography tokens'
  );
  assert.ok(
    heroSource.includes('min-h-[164px]') && heroSource.includes('items-stretch'),
    'WelcomeHero quick-service cards must enforce equal-height grid alignment'
  );

  const aboutSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/welcome/AboutUgvclSection.tsx'),
    'utf8'
  );
  assert.ok(
    aboutSource.includes('truncateAtWordBoundary') && !aboutSource.includes('.slice(0, 125)'),
    'AboutUgvclSection must use word-boundary-safe truncation instead of raw UTF-16 character slicing'
  );
  assert.ok(
    aboutSource.includes('role="tablist"') && aboutSource.includes('role="tab"'),
    'AboutUgvclSection historical timeline filter tabs must expose accessible tablist/tab semantics'
  );

  const achievementsSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/welcome/AchievementsSection.tsx'),
    'utf8'
  );
  assert.ok(
    achievementsSource.includes('truncateAtWordBoundary') && !achievementsSource.includes('.slice(0, 125)'),
    'AchievementsSection must use word-boundary-safe truncation'
  );

  const consumerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
    'utf8'
  );
  assert.ok(
    consumerSource.includes('data-testid="consumer-kpi-cards-grid"') &&
      consumerSource.includes('items-stretch'),
    'ConsumerPortal primary KPI cards must use equal-height stretch grid alignment'
  );

  // Verify protected UGVCL text, milestones, facts, and citations remain intact across all 4 languages
  assert.equal(UGVCL_CORPORATE_PROFILE.legalName, 'Uttar Gujarat Vij Company Limited');
  assert.equal(UGVCL_CORPORATE_PROFILE.cin, 'U40102GJ2003SGC042906');
  assert.equal(UGVCL_CORPORATE_PROFILE.jurisdictionDistricts.length, 6);
  assert.equal(UGVCL_MILESTONES.length, 8);
  assert.equal(UGVCL_AWARDS.length, 4);

  const milestoneYears = UGVCL_MILESTONES.map(m => m.year);
  assert.deepEqual(
    milestoneYears,
    ['2003', '2005', '2006', '2012', '2018', '2020', '2024', '2026'],
    'Historical milestone years must remain verbatim'
  );

  for (const lang of LANGUAGES) {
    for (const milestone of UGVCL_MILESTONES) {
      const localized = getLocalizedMilestone(milestone, lang);
      assert.ok(localized.title.length > 0, `Milestone ${milestone.year} title must exist in ${lang}`);
      assert.ok(
        localized.description.length > 0,
        `Milestone ${milestone.year} description must exist in ${lang}`
      );
      assert.ok(
        localized.verifiedSource.length > 0,
        `Milestone ${milestone.year} verifiedSource must exist in ${lang}`
      );
    }

    for (const award of UGVCL_AWARDS) {
      const localized = getLocalizedAward(award, lang);
      assert.ok(localized.title.length > 0, `Award ${award.id} title must exist in ${lang}`);
      assert.ok(
        localized.significance.length > 0,
        `Award ${award.id} significance must exist in ${lang}`
      );
    }

    const t = translations[lang];
    assert.ok(t.hero.title.length > 0);
    assert.ok(t.hero.description.length > 0);
    assert.ok(t.header.independentDisclaimer.length > 0);
  }

  console.log('✓ 12.3 Homepage, Historical Timeline, Consumer KPI Cards & Protected UGVCL Content tests passed');
}

console.log('All Phase 4 Step 4.5 Enterprise UI, Typography & Account Menu tests passed!');
