import { LanguageCode } from '../i18n/types';

export type ScriptFamily = 'latin' | 'gujarati' | 'devanagari';

export type TypographyRole =
  | 'displayHeading'
  | 'heroHeading'
  | 'pageTitle'
  | 'sectionHeading'
  | 'cardHeading'
  | 'bodyText'
  | 'supportingText'
  | 'captionMetadata'
  | 'buttonLabel'
  | 'navigationLabel'
  | 'tableHeading'
  | 'badgeChip'
  | 'formLabelInput';

export interface LanguageTypographyProfile {
  language: LanguageCode;
  script: ScriptFamily;
  isIndic: boolean;
  fontFamilyCss: string;
  monoFontFamilyCss: string;
  baseLineHeight: number;
  headingLineHeight: number;
  letterSpacingPolicy: 'latin-standard' | 'indic-normal';
  allowSyntheticItalic: boolean;
  allowAllCapsTracking: boolean;
}

export const FONT_STACKS = {
  en: "'Plus Jakarta Sans', 'Noto Sans Gujarati', 'Noto Sans Devanagari', system-ui, -apple-system, sans-serif",
  gu: "'Noto Sans Gujarati', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  hi: "'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  mr: "'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
} as const;

export const LANGUAGE_TYPOGRAPHY_PROFILES: Record<LanguageCode, LanguageTypographyProfile> = {
  en: {
    language: 'en',
    script: 'latin',
    isIndic: false,
    fontFamilyCss: FONT_STACKS.en,
    monoFontFamilyCss: FONT_STACKS.mono,
    baseLineHeight: 1.55,
    headingLineHeight: 1.18,
    letterSpacingPolicy: 'latin-standard',
    allowSyntheticItalic: true,
    allowAllCapsTracking: true
  },
  gu: {
    language: 'gu',
    script: 'gujarati',
    isIndic: true,
    fontFamilyCss: FONT_STACKS.gu,
    monoFontFamilyCss: FONT_STACKS.mono,
    baseLineHeight: 1.68,
    headingLineHeight: 1.32,
    letterSpacingPolicy: 'indic-normal',
    allowSyntheticItalic: false,
    allowAllCapsTracking: false
  },
  hi: {
    language: 'hi',
    script: 'devanagari',
    isIndic: true,
    fontFamilyCss: FONT_STACKS.hi,
    monoFontFamilyCss: FONT_STACKS.mono,
    baseLineHeight: 1.68,
    headingLineHeight: 1.32,
    letterSpacingPolicy: 'indic-normal',
    allowSyntheticItalic: false,
    allowAllCapsTracking: false
  },
  mr: {
    language: 'mr',
    script: 'devanagari',
    isIndic: true,
    fontFamilyCss: FONT_STACKS.mr,
    monoFontFamilyCss: FONT_STACKS.mono,
    baseLineHeight: 1.68,
    headingLineHeight: 1.32,
    letterSpacingPolicy: 'indic-normal',
    allowSyntheticItalic: false,
    allowAllCapsTracking: false
  }
};

export function isIndicScriptLanguage(language: LanguageCode): boolean {
  return LANGUAGE_TYPOGRAPHY_PROFILES[language]?.isIndic ?? false;
}

export function getLanguageTypographyProfile(language: LanguageCode): LanguageTypographyProfile {
  return LANGUAGE_TYPOGRAPHY_PROFILES[language] || LANGUAGE_TYPOGRAPHY_PROFILES.en;
}

/**
 * Standardized enterprise typography token classes across all 13 UI hierarchy levels.
 * Automatically adapts line-height, tracking, and sizing for Gujarati, Hindi, and Marathi.
 */
export const TYPOGRAPHY_ROLE_TOKENS: Record<
  TypographyRole,
  {
    latin: string;
    indic: string;
    description: string;
  }
> = {
  displayHeading: {
    latin: 'text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.14]',
    indic: 'text-2xl sm:text-4xl lg:text-[44px] font-extrabold tracking-normal leading-[1.32]',
    description: 'Primary display and masthead headline'
  },
  heroHeading: {
    latin: 'text-2xl sm:text-4xl lg:text-[48px] font-black tracking-tight leading-[1.15]',
    indic: 'text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-normal leading-[1.32]',
    description: 'Public portal hero banner headline'
  },
  pageTitle: {
    latin: 'text-lg sm:text-xl lg:text-2xl font-bold tracking-tight leading-snug',
    indic: 'text-lg sm:text-xl lg:text-2xl font-bold tracking-normal leading-[1.38]',
    description: 'Portal workspace top-level title'
  },
  sectionHeading: {
    latin: 'text-2xl sm:text-3xl lg:text-[36px] font-black tracking-tight leading-[1.2]',
    indic: 'text-xl sm:text-3xl lg:text-[34px] font-extrabold tracking-normal leading-[1.35]',
    description: 'Major section heading'
  },
  cardHeading: {
    latin: 'text-base sm:text-lg font-bold tracking-tight leading-snug',
    indic: 'text-base sm:text-lg font-bold tracking-normal leading-[1.42]',
    description: 'Card, panel, and milestone title'
  },
  bodyText: {
    latin: 'text-sm sm:text-base font-normal leading-relaxed',
    indic: 'text-sm sm:text-base font-normal tracking-normal leading-[1.68]',
    description: 'Primary reading and narrative paragraph text'
  },
  supportingText: {
    latin: 'text-xs sm:text-sm font-normal leading-relaxed',
    indic: 'text-xs sm:text-sm font-normal tracking-normal leading-[1.62]',
    description: 'Secondary descriptive and contextual copy'
  },
  captionMetadata: {
    latin: 'text-[11px] sm:text-xs font-medium leading-normal',
    indic: 'text-xs font-medium tracking-normal leading-[1.52]',
    description: 'Timestamps, citations, and auxiliary metadata'
  },
  buttonLabel: {
    latin: 'text-xs sm:text-sm font-semibold tracking-normal leading-snug',
    indic: 'text-xs sm:text-sm font-semibold tracking-normal leading-[1.4]',
    description: 'Interactive button and CTA label'
  },
  navigationLabel: {
    latin: 'text-xs sm:text-[13px] font-semibold tracking-normal leading-snug',
    indic: 'text-xs sm:text-[13px] font-semibold tracking-normal leading-[1.42]',
    description: 'Sidebar, header, and tab navigation label'
  },
  tableHeading: {
    latin: 'text-[11px] font-bold uppercase tracking-wider leading-snug',
    indic: 'text-xs font-bold tracking-normal leading-[1.45]',
    description: 'Data table column header'
  },
  badgeChip: {
    latin: 'text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-snug',
    indic: 'text-[11px] sm:text-xs font-bold tracking-normal leading-[1.4]',
    description: 'Status pill, category tag, and classification chip'
  },
  formLabelInput: {
    latin: 'text-xs sm:text-sm font-medium leading-normal',
    indic: 'text-xs sm:text-sm font-medium tracking-normal leading-[1.5]',
    description: 'Form field label, input, and select control'
  }
};

export function getTypographyRoleClasses(
  role: TypographyRole,
  language: LanguageCode = 'en'
): string {
  const token = TYPOGRAPHY_ROLE_TOKENS[role];
  if (!token) return '';
  return isIndicScriptLanguage(language) ? token.indic : token.latin;
}

/**
 * Truncates text at the nearest whole-word boundary without splitting
 * Indic combining vowel signs (matras), viramas, or words.
 */
export function truncateAtWordBoundary(text: string, maxLength: number): {
  truncatedText: string;
  isTruncated: boolean;
} {
  if (!text || text.length <= maxLength) {
    return { truncatedText: text, isTruncated: false };
  }

  const sliceCandidate = text.slice(0, maxLength);
  const lastSpaceIndex = sliceCandidate.lastIndexOf(' ');
  const safeCut =
    lastSpaceIndex > Math.floor(maxLength * 0.65)
      ? sliceCandidate.slice(0, lastSpaceIndex).trim()
      : sliceCandidate.trim();

  return {
    truncatedText: `${safeCut}…`,
    isTruncated: true
  };
}
