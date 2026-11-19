import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";

type SearchBoxProps = {
  onClick: () => void;
  className?: string;
};

export function SearchBox({ onClick, className = "" }: SearchBoxProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`sidebar-search-box ${className}`.trim()}
      aria-label={t("sidebar.searchNotes")}
      title={`${t("sidebar.searchNotes")} (Ctrl+P)`}
      onClick={onClick}
    >
      <div className="sidebar-search-box__left">
        <Icon name="search" className="sidebar-search-box__icon" />
        <span className="sidebar-search-box__placeholder">{t("sidebar.search")}</span>
      </div>
      <span className="sidebar-shortcut-badge" aria-hidden="true">
        {t("sidebar.shortcutSearch")}
      </span>
    </button>
  );
}
