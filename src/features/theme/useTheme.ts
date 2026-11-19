import { useCallback, useEffect, useState } from "react";
import { themeApi, type ThemePreference } from "./api";

/** Error codes are resolved to localised text by the settings dialog. */
export type ThemeErrorCode = "load" | "save";

function applyTheme(preference: ThemePreference) {
  if (preference === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [error, setError] = useState<ThemeErrorCode | null>(null);

  useEffect(() => {
    let active = true;
    void themeApi.get().then(
      (stored) => {
        if (!active) return;
        setPreference(stored);
        applyTheme(stored);
      },
      () => {
        if (active) setError("load");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    const previous = preference;
    applyTheme(next);
    setPreference(next);
    setError(null);
    try {
      await themeApi.set(next);
    } catch {
      applyTheme(previous);
      setPreference(previous);
      setError("save");
    }
  }, [preference]);

  return { preference, error, setTheme };
}
