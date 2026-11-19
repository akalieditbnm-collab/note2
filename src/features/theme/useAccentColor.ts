import { useCallback, useEffect, useState } from "react";
import { applyAccentColor, DEFAULT_ACCENT_COLOR, isValidHex, normalizeHex } from "./accent";
import { themeApi } from "./api";

export type AccentErrorCode = "invalid" | "save";

export function useAccentColor() {
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [error, setError] = useState<AccentErrorCode | null>(null);

  useEffect(() => {
    let active = true;
    void themeApi.getAccentColor().then(
      (stored) => {
        if (!active) return;
        const color = isValidHex(stored) ? normalizeHex(stored) : DEFAULT_ACCENT_COLOR;
        setAccentColorState(color);
        applyAccentColor(color);
      },
      () => {
        if (!active) return;
        applyAccentColor(DEFAULT_ACCENT_COLOR);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const setAccentColor = useCallback(
    async (next: string) => {
      if (!isValidHex(next)) {
        setError("invalid");
        return;
      }
      const normalized = normalizeHex(next);
      const previous = accentColor;
      applyAccentColor(normalized);
      setAccentColorState(normalized);
      setError(null);
      try {
        await themeApi.setAccentColor(normalized);
      } catch {
        applyAccentColor(previous);
        setAccentColorState(previous);
        setError("save");
      }
    },
    [accentColor],
  );

  return { accentColor, error, setAccentColor };
}
