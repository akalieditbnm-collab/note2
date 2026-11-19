/* eslint-disable react-refresh/only-export-components --
   This module is the i18n context itself: the provider, the hooks and the
   imperative helpers intentionally live together so the context value has a
   single owner. */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  interpolate,
  isLocale,
  localeDirection,
  pluralize,
  type Dictionary,
  type Direction,
  type Locale,
  type PluralForms,
} from "./locales";
import { ar } from "./locales/ar";
import { en, type MessageKey } from "./locales/en";

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export type TranslateValues = Record<string, string | number>;

export type TranslateFn = (key: MessageKey, values?: TranslateValues) => string;

/** Plural-aware helper bound to the active locale. */
export type PluralFn = (
  forms: PluralForms,
) => (count: number, values?: TranslateValues) => string;

export type Translate = TranslateFn & {
  plural: PluralFn;
  locale: Locale;
  direction: Direction;
};

export type UseTranslationResult = {
  t: Translate;
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  languageError: string | null;
};

/**
 * Active locale for imperative (non-React) call sites such as hooks that build
 * error strings. Kept in sync by `I18nProvider`.
 */
let activeLocale: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale) {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

/** Imperative translate for code that cannot use the `useTranslation` hook. */
export function tGlobal(key: MessageKey, values?: TranslateValues): string {
  return translate(activeLocale, key, values);
}

/** Translate outside of React (used by non-component error mappers). */
export function translate(
  locale: Locale,
  key: MessageKey,
  values?: TranslateValues,
): string {
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const template = dictionary[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  return interpolate(template, values);
}

type I18nContextValue = {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  /** Set when persisting the language preference failed. */
  languageError: string | null;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  direction: localeDirection[DEFAULT_LOCALE],
  setLocale: () => undefined,
  languageError: null,
});

/**
 * Locale state holder. The `<html>` element is kept in sync (`lang`, `dir`,
 * `data-dir`) so plain CSS selectors such as `[dir="rtl"] .foo` keep working
 * even for portals rendered outside the React tree.
 */
export function I18nProvider({
  children,
  locale: controlledLocale,
  onLocaleChange,
  initialLocale = DEFAULT_LOCALE,
  error = null,
}: {
  children: ReactNode;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  initialLocale?: Locale;
  /** Persistence error reported by the caller's language hook. */
  error?: string | null;
}) {
  const [internalLocale, setInternalLocale] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );
  const locale = controlledLocale ?? internalLocale;
  const direction = localeDirection[locale];

  const setLocale = useCallback(
    (next: Locale) => {
      if (onLocaleChange) onLocaleChange(next);
      else setInternalLocale(next);
    },
    [onLocaleChange],
  );

  useEffect(() => {
    setActiveLocale(locale);
    const root = document.documentElement;
    root.lang = locale;
    root.dir = direction;
    root.dataset.dir = direction;
    root.dataset.locale = locale;
  }, [locale, direction]);

  const contextValue = useMemo(
    () => ({ locale, direction, setLocale, languageError: error }),
    [locale, direction, setLocale, error],
  );

  return createElement(I18nContext.Provider, { value: contextValue }, children);
}

export function useLocaleState() {
  return useContext(I18nContext);
}

export function useDirection(): Direction {
  return useContext(I18nContext).direction;
}

/** The translator hook used by every component. */
export function useTranslation(): UseTranslationResult {
  const { locale, direction, setLocale, languageError } = useContext(I18nContext);

  const t = useMemo(() => {
    const translateFn = ((key: MessageKey, values?: TranslateValues) =>
      translate(locale, key, values)) as Translate;
    translateFn.locale = locale;
    translateFn.direction = direction;
    translateFn.plural = (forms: PluralForms) => (count, values) =>
      pluralize(count, forms, values);
    return translateFn;
  }, [locale, direction]);

  return useMemo(
    () => ({ t, locale, direction, setLocale, languageError }),
    [t, locale, direction, setLocale, languageError],
  );
}

/** Localised transform-option label helper re-exported for convenience. */
export type { Translate as Translator };

/** Maps an unknown thrown value to a readable message (keeps native errors intact). */
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export { I18nContext };
