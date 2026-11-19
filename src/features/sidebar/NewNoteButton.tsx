import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";

type NewNoteButtonProps = {
  onClick: () => void;
  className?: string;
};

export function NewNoteButton({ onClick, className = "" }: NewNoteButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`sidebar-new-note-btn ${className}`.trim()}
      aria-label={t("sidebar.newPage")}
      title={`${t("sidebar.newPage")} (Ctrl+N)`}
      onClick={onClick}
    >
      <div className="sidebar-new-note-btn__left">
        <Icon name="plus" className="sidebar-new-note-btn__icon" />
        <span className="sidebar-new-note-btn__label">{t("sidebar.newNote")}</span>
      </div>
      <span className="sidebar-shortcut-badge" aria-hidden="true">
        {t("sidebar.shortcutNew")}
      </span>
    </button>
  );
}
