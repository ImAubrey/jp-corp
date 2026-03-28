export const DEFAULT_LOCALE = "en";
export const AVAILABLE_LOCALES = ["en", "ja", "zh"] as const;

export type Locale = (typeof AVAILABLE_LOCALES)[number];

const localeSet = new Set<string>(AVAILABLE_LOCALES);

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  zh: "简体中文",
};

export function isLocale(value: string): value is Locale {
  return localeSet.has(value);
}

export function stripLocaleFromPathname(pathname: string): string {
  return pathname.replace(/^\/(en|ja|zh)(?=\/|$)/, "") || "/";
}

export function getLocale(url: URL): Locale {
  const [segment = ""] = url.pathname.split("/").filter(Boolean);
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export function getLocaleUrl(locale: Locale, url: URL): string {
  const normalizedPath = stripLocaleFromPathname(url.pathname).replace(/\/$/, "") || "/";

  if (locale === DEFAULT_LOCALE) {
    return normalizedPath === "/" ? "/" : `${normalizedPath}/`;
  }

  return normalizedPath === "/" ? `/${locale}/` : `/${locale}${normalizedPath}/`;
}

export function getLocaleUrlList(url: URL): Record<Locale, string> {
  return Object.fromEntries(
    AVAILABLE_LOCALES.map((locale) => [locale, getLocaleUrl(locale, url)]),
  ) as Record<Locale, string>;
}
