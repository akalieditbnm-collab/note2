import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../../i18n/locales";
import { isLocale } from "../../i18n/locales";
import { languageApi } from "../theme/api";

const STORAGE_MIRROR_KEY = "localnote.locale";

function readMirror(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_MIRROR_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeMirror(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_MIRROR_KEY, locale);
  } catch {
    // localStorage may be unavailable; the SQLite setting is authoritative.
  }
}

/**
 * Language preference.
 *
 * SQLite (`settings` table) is the source of truth; a localStorage mirror is
 * written as well so the very first paint — before the Tauri IPC round-trip
 * finishes — already renders in the right language and direction without a
 * flash of the wrong layout.
 */
export function useLanguage() {
  const [preference, setPreference] = useState<Locale>(() => readMirror() ?? "en");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void languageApi.get().then(
      (stored) => {
        if (!active) return;
        if (isLocale(stored)) {
          setPreference(stored);
          writeMirror(stored);
        }
      },
      () => {
        // Keep the mirrored value; the UI already rendered with it.
        if (active && !readMirror()) setError("language");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(
    async (next: Locale): Promise<boolean> => {
      const previous = preference;
      setPreference(next);
      writeMirror(next);
      setError(null);
      try {
        await languageApi.set(next);
        return true;
      } catch {
        setPreference(previous);
        writeMirror(previous);
        setError("language");
        return false;
      }
    },
    [preference],
  );

  return { preference, error, setLanguage };
}
