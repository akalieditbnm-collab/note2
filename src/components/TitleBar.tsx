import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "../i18n";

export function TitleBar() {
  const { t } = useTranslation();

  return (
    <header className="titlebar" aria-label={t("titleBar.application")}>
      <div
        className="titlebar__drag-region"
        data-tauri-drag-region
        onDoubleClick={() => void getCurrentWindow().toggleMaximize()}
      >
        <img className="titlebar__mark" src="/app-icon.svg" alt="" />
        <span className="titlebar__title">{t("app.name")}</span>
      </div>
      <div className="titlebar__controls">
        <button type="button" aria-label={t("titleBar.minimize")} onClick={() => void getCurrentWindow().minimize()}>
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5.5h8" /></svg>
        </button>
        <button type="button" aria-label={t("titleBar.maximize")} onClick={() => void getCurrentWindow().toggleMaximize()}>
          <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" /></svg>
        </button>
        <button className="titlebar__close" type="button" aria-label={t("titleBar.close")} onClick={() => void getCurrentWindow().close()}>
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="m1.5 1.5 7 7m0-7-7 7" /></svg>
        </button>
      </div>
    </header>
  );
}
