import { useCallback, useEffect, useState } from "react";
import { spellcheckApi, type SpellcheckPreference } from "./api";

export type SpellcheckErrorCode = "load" | "save";

export function useSpellcheck() {
  const [preference, setPreference] = useState<SpellcheckPreference>("system");
  const [error, setError] = useState<SpellcheckErrorCode | null>(null);

  useEffect(() => {
    let active = true;
    void spellcheckApi.get().then(
      (stored) => {
        if (active) setPreference(stored);
      },
      () => {
        if (active) setError("load");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const setSpellcheck = useCallback(async (next: SpellcheckPreference) => {
    const previous = preference;
    setPreference(next);
    setError(null);
    try {
      await spellcheckApi.set(next);
    } catch {
      setPreference(previous);
      setError("save");
    }
  }, [preference]);

  return { preference, error, setSpellcheck };
}
