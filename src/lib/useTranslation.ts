import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from './translations';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from './languages';

/**
 * useTranslation — Core i18n Hook for Jan Samadhan
 * 
 * Usage:
 *   const { t, lang, setLang, languages, currentLanguage } = useTranslation();
 *   <h1>{t('citizen.title')}</h1>
 * 
 * Fallback: If a key is missing in the selected language, returns the English value.
 *           If missing in English too, returns the key itself (never blank).
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = (key: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) return dict[key];
    // Fallback to English
    if (translations.en[key]) return translations.en[key];
    // Last resort: return the key itself
    return key;
  };

  return {
    t,
    lang: language,
    setLang: setLanguage,
    languages: SUPPORTED_LANGUAGES,
    currentLanguage: getLanguageByCode(language),
  };
}
