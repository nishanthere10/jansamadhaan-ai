/**
 * Jan Samadhan — Supported Languages Configuration
 * Each language entry provides metadata for UI rendering and Speech API integration.
 */

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string; // BCP-47 tag for Web Speech API
  flag: string; // Short label for compact display
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English',  nativeName: 'English',  speechCode: 'en-IN', flag: 'EN' },
  { code: 'hi', name: 'Hindi',    nativeName: 'हिन्दी',     speechCode: 'hi-IN', flag: 'हिं' },
  { code: 'ta', name: 'Tamil',    nativeName: 'தமிழ்',      speechCode: 'ta-IN', flag: 'த' },
  { code: 'te', name: 'Telugu',   nativeName: 'తెలుగు',     speechCode: 'te-IN', flag: 'తె' },
  { code: 'mr', name: 'Marathi',  nativeName: 'मराठी',      speechCode: 'mr-IN', flag: 'म' },
  { code: 'bn', name: 'Bengali',  nativeName: 'বাংলা',      speechCode: 'bn-IN', flag: 'বা' },
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageByCode(code: string): Language {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}
