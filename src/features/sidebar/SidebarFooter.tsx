import type { RefObject } from "react";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";

type SidebarFooterProps = {
  settingsTriggerRef: RefObject<HTMLButtonElement | null>;
  onOpenSettings: () => void;
  onOpenTrash?: () => void;
  trashCount?: number;
  pageCount?: number;
  isCollapsed?: boolean;
};

export function SidebarFooter({
  settingsTriggerRef,
  onOpenSettings,
  onOpenTrash,
  trashCount = 0,
  pageCount,
  isCollapsed = false,
}: SidebarFooterProps) {
  const { t } = useTranslation();

  if (isCollapsed) {
    return (
      <footer className="sidebar-footer sidebar-footer--collapsed">
        {onOpenTrash && (
          <button
            type="button"
            className="sidebar-icon-btn sidebar-icon-btn--trash"
            aria-label={t("sidebar.openTrash")}
            title={`${t("sidebar.trash")}${trashCount > 0 ? ` (${trashCount})` : ""}`}
            onClick={onOpenTrash}
          >
            <Icon name="trash" />
            {trashCount > 0 && (
              <span className="sidebar-footer__collapsed-badge" />
            )}
          </button>
        )}
        <button
          ref={settingsTriggerRef}
          type="button"
          className="sidebar-icon-btn"
          aria-label={t("sidebar.openSettings")}
          title={t("sidebar.settings")}
          onClick={onOpenSettings}
        >
          <Icon name="settings" />
        </button>
      </footer>
    );
  }

  return (
    <footer className="sidebar-footer">
      {onOpenTrash && (
        <div className="sidebar-footer__row sidebar-footer__row--trash">
          <button
            type="button"
            className="sidebar-footer__btn"
            aria-label={t("sidebar.openTrash")}
            title={t("sidebar.trash")}
            onClick={onOpenTrash}
          >
            <Icon name="trash" className="sidebar-footer__icon" />
            <span>{t("sidebar.trash")}</span>
            {trashCount > 0 && (
              <span className="sidebar-footer__badge">{trashCount}</span>
            )}
          </button>
        </div>
      )}

      <div className="sidebar-footer__row">
        <button
          ref={settingsTriggerRef}
          type="button"
          className="sidebar-footer__btn"
          aria-label={t("sidebar.openSettings")}
          title={t("sidebar.settings")}
          onClick={onOpenSettings}
        >
          <Icon name="settings" className="sidebar-footer__icon" />
          <span>{t("sidebar.settings")}</span>
          {pageCount !== undefined && pageCount > 0 && (
            <span
              className="sidebar-footer__stats"
              title={t("sidebar.notesStoredOther", { count: pageCount })}
            >
              {pageCount === 1
                ? t("sidebar.notesStoredOne")
                : t("sidebar.notesStoredOther", { count: pageCount })}
            </span>
          )}
        </button>
      </div>
    </footer>
  );
}
