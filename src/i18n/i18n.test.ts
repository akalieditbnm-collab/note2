import { describe, expect, it } from "vitest";

// The specifier is relative to the file system so the dictionary wiring is
// checked even if the alias `@tauri-apps/api` is unavailable.
import fs from "node:fs";
import path from "node:path";
import { translate } from "./index";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  interpolate,
  isLocale,
  localeDirection,
  pluralize,
} from "./locales";

const localesDir = path.join(process.cwd(), "src", "i18n", "locales");

function keysOf(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort();
}

describe("i18n dictionaries", () => {
  it("keeps Arabic in sync with English", () => {
    expect(keysOf(ar as unknown as Record<string, string>)).toEqual(
      keysOf(en as unknown as Record<string, string>),
    );
  });

  it("never ships an empty translation", () => {
    for (const [key, value] of Object.entries({ ...en, ...ar })) {
      expect(value, key).toMatch(/\S/);
    }
  });

  it("preserves placeholders in every Arabic translation", () => {
    const placeholders = (value: string) =>
      (value.match(/\{\w+\}/g) ?? []).sort();
    for (const [key, english] of Object.entries(en)) {
      const arabic = (ar as unknown as Record<string, string>)[key];
      expect(placeholders(arabic), key).toEqual(placeholders(english));
    }
  });

  it("only ships reviewed locale files", () => {
    const shipped = fs
      .readdirSync(localesDir)
      .filter((file) => file.endsWith(".ts") && file !== "index.ts")
      .map((file) => file.replace(/\.ts$/, ""))
      .sort();
    expect(shipped).toEqual(["ar", "en"]);
  });
});

describe("locale primitives", () => {
  it("marks Arabic as right-to-left and English as left-to-right", () => {
    expect(localeDirection.ar).toBe("rtl");
    expect(localeDirection.en).toBe("ltr");
    expect(SUPPORTED_LOCALES).toEqual(["en", "ar"]);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("validates locale tags", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar-EG")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("interpolates placeholders and leaves unknown ones intact", () => {
    expect(interpolate("Move “{title}” to Trash", { title: "Alpha" })).toBe(
      "Move “Alpha” to Trash",
    );
    expect(interpolate("{count} notes", { count: 3 })).toBe("3 notes");
    expect(interpolate("{missing} here")).toBe("{missing} here");
  });

  it("selects plural forms", () => {
    const forms = { one: "{count} word", other: "{count} words", zero: "no words" };
    expect(pluralize(0, forms)).toBe("no words");
    expect(pluralize(1, forms)).toBe("1 word");
    expect(pluralize(7, forms)).toBe("7 words");
  });

  it("translates through the dictionaries and falls back safely", () => {
    expect(translate("ar", "sidebar.pages")).toBe("الصفحات");
    expect(translate("en", "sidebar.pages")).toBe("Pages");
    expect(translate("ar", "page.deleteMessage", { title: "ألفا" })).toContain(
      "ألفا",
    );
  });
});
