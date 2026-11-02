import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageCode, LanguageOption, SUPPORTED_LANGUAGES, TranslationDictionary } from './types';
import { translations, en } from './translations';

export const LANGUAGE_STORAGE_KEY = 'vidyutflow_language_preference';

export type TranslationAccessor = ((path: string, fallback?: string) => string) & TranslationDictionary;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  supportedLanguages: LanguageOption[];
  currentLanguageOption: LanguageOption;
  t: TranslationAccessor;
  dict: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Safe helper to read from localStorage
const getSavedLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'gu' || saved === 'hi' || saved === 'mr')) {
      return saved;
    }
  } catch {
    // Storage access restricted or disabled
  }
  return 'en';
};

// Safe helper to save to localStorage
const persistLanguage = (lang: LanguageCode): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage access restricted or disabled
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => getSavedLanguage());

  // Keep HTML lang attribute in sync with state
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    persistLanguage(newLang);
  }, []);

  const currentLanguageOption = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((opt) => opt.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  // Merged dictionary: guarantees that every key in English is present even if a translation is missing
  const dict = useMemo<TranslationDictionary>(() => {
    const currentDict = translations[language] || en;
    if (language === 'en') return en;

    // Deep merge currentDict over en fallback for all dictionary sections
    const merged: Record<string, Record<string, string>> = {};
    for (const section of Object.keys(en) as (keyof TranslationDictionary)[]) {
      merged[section] = {
        ...(en[section] as Record<string, string>),
        ...((currentDict && (currentDict as unknown as Record<string, Record<string, string>>)[section]) || {})
      };
    }
    return merged as unknown as TranslationDictionary;
  }, [language]);

  /**
   * Translates a dot-notated key path (e.g. 'common.helpline' or 'hero.title')
   * with automatic fallback to English and optional custom fallback, while also
   * exposing typed dictionary sections directly (e.g. t.erp.dashboard).
   */
  const t = useMemo<TranslationAccessor>(() => {
    const translateFn = (path: string, fallback?: string): string => {
      const parts = path.split('.');
      if (parts.length === 2) {
        const [section, key] = parts;
        const targetSection = (dict as unknown as Record<string, Record<string, string>>)[section];
        if (targetSection && targetSection[key] !== undefined && targetSection[key] !== '') {
          return targetSection[key];
        }

        // Check English fallback directly
        const enSection = (en as unknown as Record<string, Record<string, string>>)[section];
        if (enSection && enSection[key] !== undefined && enSection[key] !== '') {
          return enSection[key];
        }
      }

      return fallback ?? path;
    };

    return Object.assign(translateFn, dict);
  }, [dict]);

  const contextValue = useMemo<LanguageContextType>(() => ({
    language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLanguageOption,
    t,
    dict
  }), [language, setLanguage, currentLanguageOption, t, dict]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Convenient alias
export const useTranslation = useLanguage;
