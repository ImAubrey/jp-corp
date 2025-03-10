import { getLocale } from "astro-i18n-aut";
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

// Cache for translations
const translationsCache: Record<string, any> = {};

/**
 * Load translations for a specific locale
 */
function loadTranslations(locale: string) {
  if (translationsCache[locale]) {
    return translationsCache[locale];
  }
  
  try {
    const filePath = join(process.cwd(), 'src', 'i18n', `${locale}.yaml`);
    const fileContent = readFileSync(filePath, 'utf8');
    const translations = parse(fileContent);
    translationsCache[locale] = translations;
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
    return {};
  }
}

/**
 * Get translation for a key with nested support (e.g., "common.home")
 */
export function t(key: string, locale: string): string {
  const translations = loadTranslations(locale);
  const keys = key.split('.');
  
  let result = translations;
  for (const k of keys) {
    if (!result || typeof result !== 'object') {
      return key; // Return the key if translation not found
    }
    result = result[k];
  }
  
  return typeof result === 'string' ? result : key;
}

/**
 * Helper function to use in components
 */
export function useTranslations(url: URL) {
  const locale = getLocale(url);
  return (key: string) => t(key, locale);
}

/**
 * Get all available locales
 */
export function getAvailableLocales() {
  return ['en', 'ja', 'zh'];
}

/**
 * Get locale name for display
 */
export function getLocaleName(locale: string): string {
  const names = {
    en: 'English',
    ja: '日本語',
    zh: '简体中文'
  };
  return names[locale as keyof typeof names] || locale;
}
