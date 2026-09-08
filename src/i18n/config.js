export const locales = ["en", "ja"];
export const defaultLocale = "en";

export function isLocale(value) {
  return locales.includes(value);
}

export function localePath(locale, path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return normalized;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}
