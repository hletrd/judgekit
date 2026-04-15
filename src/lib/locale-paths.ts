import { DEFAULT_LOCALE, LOCALE_QUERY_PARAM, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/constants";

export function normalizeMetadataPath(path: string) {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeSupportedLocale(locale: SupportedLocale | string | null | undefined): SupportedLocale {
  return (locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale))
    ? locale as SupportedLocale
    : DEFAULT_LOCALE;
}

export function buildLocalePath(path: string, locale: SupportedLocale | string) {
  const normalizedLocale = normalizeSupportedLocale(locale);
  const normalizedPath = normalizeMetadataPath(path);
  const [pathname, queryString] = normalizedPath.split("?");
  const params = new URLSearchParams(queryString ?? "");

  if (normalizedLocale === DEFAULT_LOCALE) {
    params.delete(LOCALE_QUERY_PARAM);
  } else {
    params.set(LOCALE_QUERY_PARAM, normalizedLocale);
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function buildLocalizedHref(href: string, locale: SupportedLocale | string) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  return buildLocalePath(href, locale);
}
