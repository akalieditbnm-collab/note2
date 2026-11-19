import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";
import type { Page } from "../pages/types";
import { PageTree } from "./PageTree";
import { SidebarPageList } from "./SidebarPageList";
import { SidebarSection } from "./SidebarSection";
import { NewNoteButton } from "./NewNoteButton";
import { SearchBox } from "./SearchBox";
import { SidebarFooter } from "./SidebarFooter";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type SidebarProps = {
  pages: Page[];
  favoritePages: Page[];
  activePageId: string | null;
  error: string | null;
  clearError: () => void;
  createPage: (parentId?: string | null) => Promise<Page | null>;
  selectPage: (id: string) => Promise<boolean>;
  onOpenSearch: () => void;
  renamePage: (id: string, title: string) => Promise<boolean>;
  movePage: (
    id: string,
    parentId: string | null,
    position: number,
  ) => Promise<boolean>;
  setFavorite: (id: string, isFavorite: boolean) => Promise<boolean>;
  deletePage: (id: string) => Promise<boolean>;
  settingsTriggerRef: RefObject<HTMLButtonElement | null>;
  onOpenSettings: () => void;
  onOpenTrash?: () => void;
  trashCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onResizerPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizerDoubleClick?: () => void;
};

export function Sidebar({
  pages,
  favoritePages,
  activePageId,
  error,
  clearError,
  createPage,
  selectPage,
  onOpenSearch,
  renamePage,
  movePage,
  setFavorite,
  deletePage,
  settingsTriggerRef,
  onOpenSettings,
  onOpenTrash,
  trashCount = 0,
  isCollapsed,
  onToggleCollapse,
  onResizerPointerDown,
  onResizerDoubleClick,
}: SidebarProps) {
  const { t } = useTranslation();

  if (isCollapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" aria-label={t("sidebar.navigation")}>
        <div className="sidebar__scroll-area sidebar__scroll-area--collapsed">
          <img className="sidebar__product-icon" src="/app-icon.svg" width="32" height="32" alt={t("app.name")} />
          <button
            type="button"
            className="sidebar__icon-button"
            aria-label={t("sidebar.expand")}
            title={`${t("sidebar.expand")} (Ctrl+\\)`}
            onClick={onToggleCollapse}
          >
            <Icon name="sidebar" />
          </button>

          <button
            type="button"
            className="sidebar__icon-button"
            aria-label={t("sidebar.newPage")}
            title={`${t("sidebar.newPage")} (Ctrl+N)`}
            onClick={() => void createPage()}
          >
            <Icon name="plus" />
          </button>

          <button
            type="button"
            className="sidebar__icon-button"
            aria-label={t("sidebar.searchNotes")}
            title={`${t("sidebar.searchNotes")} (Ctrl+P)`}
            onClick={onOpenSearch}
          >
            <Icon name="search" />
          </button>
        </div>

        <SidebarFooter
          settingsTriggerRef={settingsTriggerRef}
          onOpenSettings={onOpenSettings}
          onOpenTrash={onOpenTrash}
          trashCount={trashCount}
          isCollapsed={true}
        />

        <div
          className="sidebar__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("sidebar.resizeHandle")}
          title={t("sidebar.resizeHint")}
          onPointerDown={onResizerPointerDown}
          onDoubleClick={onResizerDoubleClick}
        />
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label={t("sidebar.navigation")}>
      <div className="sidebar__scroll-area">
        <div className="sidebar__product">
          <img src="/app-icon.svg" width="32" height="32" alt="" />
          <span>{t("app.name")}</span>
        </div>
        {/* Top header row: New Note Button + Collapse Toggle */}
        <div className="sidebar__header-row">
          <NewNoteButton onClick={() => void createPage()} />
          <button
            type="button"
            className="sidebar__collapse-button"
            aria-label={t("sidebar.collapse")}
            title={`${t("sidebar.collapse")} (Ctrl+\\)`}
            onClick={onToggleCollapse}
          >
            <Icon name="sidebar" />
          </button>
        </div>

        {/* Compact Search Box */}
        <div className="sidebar__search-row">
          <SearchBox onClick={onOpenSearch} />
        </div>

        {/* Favorites Section */}
        <SidebarSection id="favorites" title={t("sidebar.favorites")}>
          <SidebarPageList
            pages={favoritePages}
            activePageId={activePageId}
            emptyMessage={t("sidebar.noFavorites")}
            onSelect={selectPage}
          />
        </SidebarSection>

        {/* Pages Tree Section */}
        <SidebarSection id="pages" title={t("sidebar.pages")}>
          <PageTree
            pages={pages}
            activePageId={activePageId}
            onSelect={selectPage}
            onCreate={(parentId) => createPage(parentId)}
            onRename={renamePage}
            onMove={movePage}
            onSetFavorite={setFavorite}
            onDelete={deletePage}
          />
        </SidebarSection>

        {error && (
          <div className="sidebar__error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>{t("common.dismiss")}</button>
          </div>
        )}
      </div>

      <SidebarFooter
        settingsTriggerRef={settingsTriggerRef}
        onOpenSettings={onOpenSettings}
        onOpenTrash={onOpenTrash}
        trashCount={trashCount}
        pageCount={pages.length}
      />

      <div
        className="sidebar__resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={t("sidebar.resizeHandle")}
        title={t("sidebar.resizeHint")}
        onPointerDown={onResizerPointerDown}
        onDoubleClick={onResizerDoubleClick}
      />
    </aside>
  );
}
