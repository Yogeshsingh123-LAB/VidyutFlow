import { LanguageCode, TranslationDictionary } from '../types';
import { en } from './en';
import { gu } from './gu';
import { hi } from './hi';
import { mr } from './mr';

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  gu,
  hi,
  mr
};

export { en, gu, hi, mr };
