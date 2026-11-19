/**
 * Locale primitives for LocalNote.
 *
 * The app ships two fully reviewed UI locales. Adding a third language only
 * requires adding a dictionary object below plus its direction in
 * `localeDirection`.
 */

export type Locale = "en" | "ar";

export type Direction = "ltr" | "rtl";

export const SUPPORTED_LOCALES: Locale[] = ["en", "ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export const localeDirection: Record<Locale, Direction> = {
  en: "ltr",
  ar: "rtl",
};

export const DEFAULT_LOCALE: Locale = "en";

/** Keys that may contain `{placeholders}` interpolated at call time. */
export type TranslationKey = string;

export type Dictionary = Record<TranslationKey, string>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

/**
 * Very small interpolation helper: `format(str, { count: 3 })` replaces every
 * `{count}` occurrence. Missing placeholders are left untouched so a typo in a
 * translation degrades gracefully instead of throwing.
 */
export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type PluralForms = { one: string; other: string; zero?: string };

export function pluralize(
  count: number,
  forms: PluralForms,
  values: Record<string, string | number> = {},
): string {
  const template =
    count === 0 && forms.zero ? forms.zero : count === 1 ? forms.one : forms.other;
  return interpolate(template, { count, ...values });
}
