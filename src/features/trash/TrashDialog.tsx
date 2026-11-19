import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useTranslation } from "../../i18n";
import type { Page } from "../pages/types";

type TrashDialogProps = {
  open: boolean;
  trashPages: Page[];
  loading: boolean;
  onClose: () => void;
  onRestore: (id: string) => Promise<boolean>;
  onDeletePermanently: (id: string) => Promise<boolean>;
  onEmptyTrash: () => Promise<boolean>;
};

function formatDeletionDate(isoString: string | null | undefined, locale: string): string {
  if (!isoString) {
    return "";
  }
  try {
    const date = new Date(isoString);
    // `ar-EG` gives Arabic month names while keeping Western digits readable;
    // the browser falls back gracefully if the locale is unavailable.
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function TrashDialog({
  open,
  trashPages,
  loading,
  onClose,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}: TrashDialogProps) {
  const { t, locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<Page | null>(null);
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setPendingPermanentDelete(null);
      setConfirmEmptyOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingPermanentDelete) {
          setPendingPermanentDelete(null);
        } else if (confirmEmptyOpen) {
          setConfirmEmptyOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [open, onClose, pendingPermanentDelete, confirmEmptyOpen]);

  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return trashPages;
    }
    return trashPages.filter((p) => p.title.toLowerCase().includes(query));
  }, [trashPages, searchQuery]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="trash-dialog-backdrop"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="trash-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-dialog-title"
        >
          <div className="trash-dialog__header">
            <div className="trash-dialog__title-wrap">
              <Icon name="trash" className="trash-dialog__header-icon" />
              <h2 id="trash-dialog-title" className="trash-dialog__title">
                {t("trash.title")}
              </h2>
              {trashPages.length > 0 && (
                <span className="trash-dialog__count-badge">
                  {trashPages.length}
                </span>
              )}
            </div>

            <div className="trash-dialog__header-actions">
              {trashPages.length > 0 && (
                <button
                  type="button"
                  className="trash-dialog__empty-btn"
                  onClick={() => setConfirmEmptyOpen(true)}
                  title={t("trash.emptyHint")}
                >
                  {t("trash.emptyAction")}
                </button>
              )}
              <button
                type="button"
                className="trash-dialog__close-btn"
                onClick={onClose}
                aria-label={t("trash.close")}
              >
                <Icon name="x" />
              </button>
            </div>
          </div>

          {trashPages.length > 0 && (
            <div className="trash-dialog__search-wrap">
              <Icon name="search" className="trash-dialog__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="trash-dialog__search-input"
                placeholder={t("trash.filterPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="trash-dialog__search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label={t("trash.clearFilter")}
                >
                  <Icon name="x" />
                </button>
              )}
            </div>
          )}

          <div className="trash-dialog__content">
            {loading && trashPages.length === 0 ? (
              <div className="trash-dialog__state">{t("trash.loading")}</div>
            ) : trashPages.length === 0 ? (
              <div className="trash-dialog__empty-state">
                <div className="trash-dialog__empty-icon-wrap">
                  <Icon name="trash" className="trash-dialog__empty-icon" />
                </div>
                <p className="trash-dialog__empty-title">{t("trash.emptyTitle")}</p>
                <p className="trash-dialog__empty-desc">
                  {t("trash.emptyDescription")}
                </p>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="trash-dialog__empty-state">
                <p className="trash-dialog__empty-title">{t("trash.noMatches")}</p>
                <p className="trash-dialog__empty-desc">
                  {t("trash.noMatchesBody", { query: searchQuery })}
                </p>
              </div>
            ) : (
              <ul className="trash-dialog__list" role="list">
                {filteredPages.map((page) => (
                  <li key={page.id} className="trash-dialog__item">
                    <div className="trash-dialog__item-info">
                      <Icon
                        name="document"
                        className="trash-dialog__item-icon"
                      />
                      <span className="trash-dialog__item-title">
                        {page.title.trim() || t("common.untitled")}
                      </span>
                      {page.deletedAt && (
                        <span className="trash-dialog__item-date">
                          {formatDeletionDate(page.deletedAt, locale)}
                        </span>
                      )}
                    </div>

                    <div className="trash-dialog__item-actions">
                      <button
                        type="button"
                        className="trash-dialog__action-btn trash-dialog__action-btn--restore"
                        onClick={() => void onRestore(page.id)}
                        title={t("trash.restoreTitle")}
                        aria-label={t("trash.restoreAria", { title: page.title })}
                      >
                        <Icon name="rotate-ccw" />
                        <span>{t("trash.restore")}</span>
                      </button>
                      <button
                        type="button"
                        className="trash-dialog__action-btn trash-dialog__action-btn--delete"
                        onClick={() => setPendingPermanentDelete(page)}
                        title={t("trash.deleteTitle")}
                        aria-label={t("trash.deleteAria", { title: page.title })}
                      >
                        <Icon name="trash" />
                        <span>{t("common.delete")}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingPermanentDelete)}
        title={t("trash.confirmDeleteTitle")}
        message={t("trash.confirmDeleteMessage", {
          title: pendingPermanentDelete?.title?.trim() || t("common.untitled"),
        })}
        confirmLabel={t("trash.confirmDeleteAction")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={async () => {
          if (pendingPermanentDelete) {
            const pageToDelete = pendingPermanentDelete;
            setPendingPermanentDelete(null);
            await onDeletePermanently(pageToDelete.id);
          }
        }}
        onCancel={() => setPendingPermanentDelete(null)}
      />

      <ConfirmDialog
        open={confirmEmptyOpen}
        title={t("trash.confirmEmptyTitle")}
        message={t("trash.confirmEmptyMessage", { count: trashPages.length })}
        confirmLabel={t("trash.emptyAction")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={async () => {
          setConfirmEmptyOpen(false);
          await onEmptyTrash();
        }}
        onCancel={() => setConfirmEmptyOpen(false)}
      />
    </>
  );
}
