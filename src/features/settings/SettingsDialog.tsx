import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Icon } from "../../components/Icon";
import { errorText, useTranslation } from "../../i18n";
import { APP_VERSION } from "../../version";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "../../i18n/locales";
import type { BackupProgress, BackupStatus } from "../export/useNotesBackup";
import type { MarkdownImportStatus } from "../export/useMarkdownImport";
import { ACCENT_PRESETS, isValidHex, normalizeHex } from "../theme/accent";
import type { ThemePreference } from "../theme/api";
import { storageApi, type SpellcheckPreference, type StorageInfo } from "./api";

type SettingsDialogProps = {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  theme: ThemePreference;
  themeError: string | null;
  accentColor: string;
  accentColorError: string | null;
  spellcheck: SpellcheckPreference;
  spellcheckError: string | null;
  language: Locale;
  languageError: string | null;
  backupStatus: BackupStatus;
  backupProgress: BackupProgress;
  backupDestination: string | null;
  backupExportedCount: number;
  backupError: string | null;
  importStatus: MarkdownImportStatus;
  importCount: number;
  importError: string | null;
  onThemeChange: (preference: ThemePreference) => void;
  onAccentColorChange: (hex: string) => void;
  onSpellcheckChange: (preference: SpellcheckPreference) => void;
  onLanguageChange: (locale: Locale) => void;
  onStartBackup: () => void;
  onOpenBackupFolder: () => void;
  onResetBackup: () => void;
  onStartMarkdownImport: () => void;
  onResetMarkdownImport: () => void;
  onClose: () => void;
};

export function SettingsDialog({
  open,
  triggerRef,
  theme,
  themeError,
  accentColor,
  accentColorError,
  spellcheck,
  spellcheckError,
  language,
  languageError,
  backupStatus,
  backupProgress,
  backupDestination,
  backupExportedCount,
  backupError,
  importStatus,
  importCount,
  importError,
  onThemeChange,
  onAccentColorChange,
  onSpellcheckChange,
  onLanguageChange,
  onStartBackup,
  onOpenBackupFolder,
  onResetBackup,
  onStartMarkdownImport,
  onResetMarkdownImport,
  onClose,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [hexInput, setHexInput] = useState(accentColor.toUpperCase());
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storageFeedback, setStorageFeedback] = useState<{
    target: "data" | "backup";
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];

  const spellcheckOptions: Array<{ value: SpellcheckPreference; label: string }> = [
    { value: "system", label: t("settings.spellcheckSystem") },
    { value: "off", label: t("settings.spellcheckOff") },
  ];

  useEffect(() => {
    setHexInput(accentColor.toUpperCase());
  }, [accentColor]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setStorageError(null);
    setStorageFeedback(null);
    void storageApi.getInfo().then(
      (info) => {
        if (active) setStorageInfo(info);
      },
      (reason: unknown) => {
        if (active) {
          setStorageInfo(null);
          setStorageError(t("settings.storageLoadFailed", { reason: errorText(reason) }));
        }
      },
    );
    return () => {
      active = false;
    };
    // Re-read storage locations every time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
      } else if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        const active = document.activeElement as HTMLElement | null;
        if (!active || !focusable.includes(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }
        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  const close = () => {
    onClose();
    triggerRef.current?.focus();
  };

  const copyStoragePath = async (target: "data" | "backup", path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setStorageFeedback({ target, kind: "success", message: t("settings.pathCopied") });
    } catch (reason) {
      setStorageFeedback({
        target,
        kind: "error",
        message: t("settings.pathCopyFailed", { reason: errorText(reason) }),
      });
    }
  };

  const openStorageFolder = async (target: "data" | "backup") => {
    try {
      await (target === "data"
        ? storageApi.openDataFolder()
        : storageApi.openBackupFolder());
      setStorageFeedback({ target, kind: "success", message: t("settings.folderOpened") });
    } catch (reason) {
      setStorageFeedback({
        target,
        kind: "error",
        message: t("settings.folderOpenFailed", { reason: errorText(reason) }),
      });
    }
  };

  return (
    <div className="settings" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <div
        ref={dialogRef}
        className="settings__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <header className="settings__header">
          <h1 id="settings-title">{t("settings.title")}</h1>
          <button type="button" aria-label={t("settings.close")} onClick={close}>
            <Icon name="x" />
          </button>
        </header>

        <div className="settings__body">
          <section className="settings__section settings__about" aria-labelledby="settings-about">
            <h2 id="settings-about">{t("settings.about")}</h2>
            <div className="settings__about-product">
              <img src="/app-icon.svg" width="96" height="96" alt="" />
              <div>
                <strong>{t("app.name")}</strong>
                <span>{t("settings.version", { version: APP_VERSION })}</span>
                <p>{t("app.tagline")}</p>
              </div>
            </div>
          </section>

          <section className="settings__section" aria-labelledby="settings-appearance">
            <h2 id="settings-appearance">{t("settings.appearance")}</h2>
            <fieldset>
              <legend>{t("settings.theme")}</legend>
              <p className="settings__field-description">{t("settings.themeDescription")}</p>
              <div className="settings__options">
                {themeOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={theme === option.value}
                      onChange={() => onThemeChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {themeError && <p className="settings__error" role="alert">{themeError}</p>}

            <fieldset className="settings__language-fieldset">
              <legend>{t("settings.language")}</legend>
              <p className="settings__field-description">
                {t("settings.languageDescription")}
              </p>
              <div className="settings__options settings__options--language">
                {SUPPORTED_LOCALES.map((option) => (
                  <label
                    key={option}
                    className="settings__language-option"
                    dir={option === "ar" ? "rtl" : "ltr"}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={option}
                      checked={language === option}
                      onChange={() => onLanguageChange(option)}
                    />
                    <span>{LOCALE_LABELS[option]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {languageError && (
              <p className="settings__error" role="alert">{t("settings.languageSaveFailed")}</p>
            )}

            <fieldset className="settings__accent-fieldset">
              <legend>{t("settings.accentColor")}</legend>
              <p className="settings__field-description">
                {t("settings.accentDescription")}
              </p>
              <div className="settings__accent-presets" role="radiogroup" aria-label={t("settings.accentPresets")}>
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected = normalizeHex(accentColor) === normalizeHex(preset.hex);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={preset.name}
                      title={`${preset.name} (${preset.hex})`}
                      className={`settings__accent-swatch${isSelected ? " settings__accent-swatch--active" : ""}`}
                      style={{ "--swatch-color": preset.hex } as React.CSSProperties}
                      onClick={() => {
                        onAccentColorChange(preset.hex);
                        setHexInput(preset.hex.toUpperCase());
                      }}
                    >
                      {isSelected && (
                        <svg
                          className="settings__accent-check"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            d="M3.5 8.5L6.5 11.5L12.5 4.5"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="settings__accent-custom">
                <label
                  className="settings__accent-picker-button"
                  title={t("settings.accentPickerTitle")}
                >
                  <input
                    type="color"
                    value={isValidHex(accentColor) ? normalizeHex(accentColor) : "#3b6fe5"}
                    onChange={(e) => {
                      onAccentColorChange(e.target.value);
                      setHexInput(e.target.value.toUpperCase());
                    }}
                    aria-label={t("settings.colorPicker")}
                  />
                  <span
                    className="settings__accent-picker-preview"
                    style={{
                      backgroundColor: isValidHex(accentColor)
                        ? normalizeHex(accentColor)
                        : "#3b6fe5",
                    }}
                  />
                </label>
                <input
                  type="text"
                  className="settings__accent-hex-input"
                  value={hexInput}
                  placeholder="#3B6FE5"
                  maxLength={7}
                  spellCheck={false}
                  dir="ltr"
                  onChange={(e) => {
                    const val = e.target.value;
                    setHexInput(val.toUpperCase());
                    if (isValidHex(val)) {
                      onAccentColorChange(val);
                    }
                  }}
                  onBlur={() => {
                    if (!isValidHex(hexInput)) {
                      setHexInput(accentColor.toUpperCase());
                    } else {
                      setHexInput(normalizeHex(hexInput).toUpperCase());
                    }
                  }}
                  aria-label={t("settings.hexLabel")}
                />
              </div>
            </fieldset>
            {accentColorError && <p className="settings__error" role="alert">{accentColorError}</p>}
          </section>

          <section className="settings__section" aria-labelledby="settings-editor">
            <h2 id="settings-editor">{t("settings.editor")}</h2>
            <fieldset>
              <legend>{t("settings.spellcheck")}</legend>
              <p className="settings__field-description">
                {t("settings.spellcheckDescription")}
              </p>
              <div className="settings__options">
                {spellcheckOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="spellcheck"
                      value={option.value}
                      checked={spellcheck === option.value}
                      onChange={() => onSpellcheckChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {spellcheckError && <p className="settings__error" role="alert">{spellcheckError}</p>}
          </section>

          <section className="settings__section" aria-labelledby="settings-storage">
            <h2 id="settings-storage">{t("settings.storage")}</h2>
            <p className="settings__field-description">
              {t("settings.storageDescription")}
            </p>

            {storageInfo ? (
              <div className="settings__storage-locations">
                <article className="settings__storage-card">
                  <div className="settings__storage-heading">
                    <div>
                      <strong>{t("settings.liveData")}</strong>
                      <span>{t("settings.liveDataSubtitle")}</span>
                    </div>
                    <span className="settings__storage-badge">{t("settings.badgeLocal")}</span>
                  </div>
                  <code className="settings__storage-path" dir="ltr" title={storageInfo.dataRoot}>
                    {storageInfo.dataRoot}
                  </code>
                  <dl className="settings__storage-details">
                    <div>
                      <dt>{t("settings.database")}</dt>
                      <dd dir="ltr" title={storageInfo.databasePath}>{storageInfo.databasePath}</dd>
                    </div>
                    <div>
                      <dt>{t("settings.webview")}</dt>
                      <dd dir="ltr" title={storageInfo.webviewDataPath}>{storageInfo.webviewDataPath}</dd>
                    </div>
                  </dl>
                  <p className="settings__storage-note">
                    {t("settings.webviewNote")}
                  </p>
                  <div className="settings__storage-actions">
                    <button
                      type="button"
                      className="settings__button settings__button--secondary"
                      aria-label={t("settings.openDataFolder")}
                      onClick={() => void openStorageFolder("data")}
                    >
                      <Icon name="folder-plus" />
                      {t("common.openFolder")}
                    </button>
                    <button
                      type="button"
                      className="settings__button settings__button--secondary"
                      aria-label={t("settings.copyDataPath")}
                      onClick={() => void copyStoragePath("data", storageInfo.dataRoot)}
                    >
                      <Icon name="copy" />
                      {t("common.copyPath")}
                    </button>
                  </div>
                  {storageFeedback?.target === "data" && (
                    <p
                      className={`settings__storage-feedback settings__storage-feedback--${storageFeedback.kind}`}
                      role={storageFeedback.kind === "error" ? "alert" : "status"}
                    >
                      {storageFeedback.message}
                    </p>
                  )}
                </article>

                <article className="settings__storage-card">
                  <div className="settings__storage-heading">
                    <div>
                      <strong>{t("settings.markdownBackups")}</strong>
                      <span>{t("settings.markdownBackupsSubtitle")}</span>
                    </div>
                    <span className="settings__storage-badge settings__storage-badge--backup">
                      {t("settings.badgeDocuments")}
                    </span>
                  </div>
                  <code className="settings__storage-path" dir="ltr" title={storageInfo.backupPath}>
                    {storageInfo.backupPath}
                  </code>
                  <div className="settings__storage-actions">
                    <button
                      type="button"
                      className="settings__button settings__button--secondary"
                      aria-label={t("settings.openBackupFolder")}
                      onClick={() => void openStorageFolder("backup")}
                    >
                      <Icon name="folder-plus" />
                      {t("common.openFolder")}
                    </button>
                    <button
                      type="button"
                      className="settings__button settings__button--secondary"
                      aria-label={t("settings.copyBackupPath")}
                      onClick={() => void copyStoragePath("backup", storageInfo.backupPath)}
                    >
                      <Icon name="copy" />
                      {t("common.copyPath")}
                    </button>
                  </div>
                  {storageFeedback?.target === "backup" && (
                    <p
                      className={`settings__storage-feedback settings__storage-feedback--${storageFeedback.kind}`}
                      role={storageFeedback.kind === "error" ? "alert" : "status"}
                    >
                      {storageFeedback.message}
                    </p>
                  )}
                </article>
              </div>
            ) : storageError ? (
              <p className="settings__error" role="alert">{storageError}</p>
            ) : (
              <p className="settings__storage-loading" role="status">{t("settings.storageLoading")}</p>
            )}
          </section>

          <section className="settings__section" aria-labelledby="settings-backup">
            <h2 id="settings-backup">{t("settings.backup")}</h2>
            <p className="settings__field-description">
              {t("settings.backupDescription")}{" "}
              <code>Documents/LocalNote Backups</code>{" "}
              {t("settings.backupDescriptionTail")}
            </p>

            {backupStatus === "idle" && (
              <div className="settings__backup-action">
                <button
                  type="button"
                  className="settings__button settings__button--primary"
                  onClick={onStartBackup}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 2v8M4.5 7.5L8 11l3.5-3.5M2.5 13.5h11" />
                  </svg>
                  <span>{t("settings.backupAll")}</span>
                </button>
              </div>
            )}

            {backupStatus === "in_progress" && (
              <div className="settings__backup-progress" role="status" aria-live="polite">
                <div className="settings__backup-progress-header">
                  <span className="settings__backup-spinner" aria-hidden="true" />
                  <div className="settings__backup-progress-text">
                    <strong>
                      {backupProgress.total > 0
                        ? t("settings.backupProgress", {
                            current: backupProgress.current,
                            total: backupProgress.total,
                          })
                        : t("settings.backupPreparing")}
                    </strong>
                    <span className="settings__backup-note-title" title={backupProgress.noteTitle}>
                      {backupProgress.noteTitle}
                    </span>
                  </div>
                </div>
                <div
                  className="settings__progress-bar"
                  role="progressbar"
                  aria-valuenow={backupProgress.total > 0 ? Math.round((backupProgress.current / backupProgress.total) * 100) : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="settings__progress-fill"
                    style={{
                      width: `${backupProgress.total > 0 ? Math.max(5, Math.round((backupProgress.current / backupProgress.total) * 100)) : 10}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {backupStatus === "success" && (
              <div className="settings__backup-success" role="status" aria-live="polite">
                <div className="settings__backup-success-header">
                  <div className="settings__backup-success-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                    </svg>
                  </div>
                  <div className="settings__backup-success-details">
                    <strong>{t("settings.backupComplete")}</strong>
                    <p>
                      {backupExportedCount === 1
                        ? t("settings.backupExportedOne")
                        : t("settings.backupExportedOther", { count: backupExportedCount })}
                    </p>
                    {backupDestination && (
                      <code className="settings__backup-path" dir="ltr" title={backupDestination}>
                        {backupDestination}
                      </code>
                    )}
                  </div>
                </div>
                <div className="settings__backup-success-actions">
                  <button
                    type="button"
                    className="settings__button settings__button--primary"
                    onClick={onOpenBackupFolder}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1.5 3.5h4l1.5 2h7.5v8H1.5z" />
                    </svg>
                    <span>{t("settings.backupOpenFolder")}</span>
                  </button>
                  <button
                    type="button"
                    className="settings__button settings__button--secondary"
                    onClick={onResetBackup}
                  >
                    {t("settings.backupAgain")}
                  </button>
                </div>
              </div>
            )}

            {backupStatus === "error" && (
              <div className="settings__backup-error" role="alert">
                <p className="settings__error">{backupError}</p>
                <button
                  type="button"
                  className="settings__button settings__button--primary"
                  onClick={onStartBackup}
                >
                  {t("settings.backupRetry")}
                </button>
              </div>
            )}

            <div className="settings__import-markdown">
              <h3>{t("settings.importMarkdown")}</h3>
              <p className="settings__field-description">
                {t("settings.importDescription")}
              </p>
              {importStatus === "success" ? (
                <div className="settings__backup-success settings__import-feedback" role="status" aria-live="polite">
                  <div className="settings__backup-success-details">
                    <strong>{t("settings.importComplete")}</strong>
                    <p>
                      {importCount === 1
                        ? t("settings.importedOne")
                        : t("settings.importedOther", { count: importCount })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="settings__button settings__button--secondary"
                    onClick={onResetMarkdownImport}
                  >
                    {t("settings.importMore")}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="settings__button settings__button--secondary"
                    onClick={onStartMarkdownImport}
                    disabled={importStatus === "in_progress"}
                  >
                    {importStatus === "in_progress" && <span className="settings__backup-spinner" aria-hidden="true" />}
                    <span>{importStatus === "in_progress" ? t("settings.importing") : t("settings.importMarkdown")}</span>
                  </button>
                  {importStatus === "error" && (
                    <div className="settings__backup-error settings__import-feedback" role="alert">
                      <p className="settings__error">{importError}</p>
                      <button
                        type="button"
                        className="settings__button settings__button--secondary"
                        onClick={onStartMarkdownImport}
                      >
                        {t("settings.importRetry")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

        </div>
        <footer className="settings__footer">
          <span className="settings__maker-credit">{t("settings.makerCredit")}</span>
          <button type="button" className="settings__button settings__button--primary" onClick={close}>
            {t("common.close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
