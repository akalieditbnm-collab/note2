import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach } from "vitest";
import { I18nProvider, useTranslation } from "./index";

function Probe() {
  const { t, locale, direction, languageError } = useTranslation();
  return (
    <div>
      <span data-testid="label">{t("sidebar.pages")}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="error">{languageError ?? "none"}</span>
    </div>
  );
}

describe("I18nProvider", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    delete document.documentElement.dataset.locale;
    delete document.documentElement.dataset.dir;
  });

  it("renders English by default and syncs the html element", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("label")).toHaveTextContent("Pages");
    expect(screen.getByTestId("direction")).toHaveTextContent("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.dataset.locale).toBe("en");
  });

  it("switches to Arabic, flips direction and exposes the error slot", () => {
    const onLocaleChange = vi.fn();
    render(
      <I18nProvider locale="ar" onLocaleChange={onLocaleChange} error="save-failed">
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("label")).toHaveTextContent("الصفحات");
    expect(screen.getByTestId("locale")).toHaveTextContent("ar");
    expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.dataset.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(screen.getByTestId("error")).toHaveTextContent("save-failed");
  });

  it("can be switched at runtime without a full reload", () => {
    function Switcher() {
      const { setLocale } = useTranslation();
      return (
        <button type="button" onClick={() => setLocale("ar")}>
          switch
        </button>
      );
    }

    render(
      <I18nProvider>
        <Switcher />
        <Probe />
      </I18nProvider>,
    );

    act(() => screen.getByRole("button", { name: "switch" }).click());

    expect(screen.getByTestId("label")).toHaveTextContent("الصفحات");
    expect(document.documentElement.dir).toBe("rtl");
  });
});
