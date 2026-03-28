import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, getLocale } from "@utils/locale";

// Cache for translations
const translationsCache: Record<string, { data: any; mtimeMs: number }> = {};

/**
 * Load translations for a specific locale
 */
function loadTranslations(locale: string) {
  const filePath = join(process.cwd(), 'src', 'i18n', `${locale}.yaml`);

  try {
    const mtimeMs = statSync(filePath).mtimeMs;
    const cached = translationsCache[locale];

    // In production, cache hit is always safe.
    // In development, refresh cache when YAML file changes.
    if (cached && (process.env.NODE_ENV === "production" || cached.mtimeMs === mtimeMs)) {
      return cached.data;
    }

    const fileContent = readFileSync(filePath, 'utf8');
    const data = parse(fileContent) ?? {};
    translationsCache[locale] = { data, mtimeMs };
    return data;
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
    return {};
  }
}

function getNestedTranslation(translations: any, key: string): string | undefined {
  const keys = key.split('.');
  let result = translations;

  for (const k of keys) {
    if (!result || typeof result !== "object") {
      return undefined;
    }
    result = result[k];
  }

  return typeof result === "string" ? result : undefined;
}

/**
 * Get translation for a key with nested support (e.g., "common.home")
 */
export function t(key: string, locale: string): string {
  const primary = getNestedTranslation(loadTranslations(locale), key);
  if (primary) {
    return primary;
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = getNestedTranslation(loadTranslations(DEFAULT_LOCALE), key);
    if (fallback) {
      return fallback;
    }
  }

  // As a last resort, return the key for visibility.
  return key;
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
  return [...AVAILABLE_LOCALES];
}

/**
 * Get locale name for display
 */
export function getLocaleName(locale: string): string {
  return LOCALE_NAMES[locale as keyof typeof LOCALE_NAMES] || locale;
}
