declare module 'astro-i18n-aut' {
  export function getLocale(url: URL): string;
  export function getLocaleUrlList(url: URL): Record<string, string>;
  export function getLocaleUrl(locale: string, url: URL): string;
  export function useTranslations(locale: string): (key: string, params?: Record<string, string>) => string;
  export function useTranslatedPath(locale: string): (path: string) => string;
}
