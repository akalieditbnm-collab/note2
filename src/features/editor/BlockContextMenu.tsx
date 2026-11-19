import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockNoteEditor } from "@blocknote/core";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";
import {
  transformBlock,
  transformOptionLabel,
  transformOptions,
  type TransformOption,
} from "./blockTransform";
import { duplicateBlock } from "./clipboard";

type BlockContextMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  targetBlock: Block | null;
  editor: BlockNoteEditor;
  onClose: () => void;
};

export function BlockContextMenu({
  isOpen,
  position,
  targetBlock,
  editor,
  onClose,
}: BlockContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !position) {
      setAdjustedPos(null);
      return;
    }

    const menu = menuRef.current;
    const width = menu?.offsetWidth || 230;
    const height = menu?.offsetHeight || 320;
    const padding = 8;

    let left = position.x;
    let top = position.y;

    if (left + width > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - width - padding);
    }
    if (top + height > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - height - padding);
    }

    setAdjustedPos({ top, left });
  }, [isOpen, position, showSubmenu]);

  useEffect(() => {
    if (!isOpen) {
      setShowSubmenu(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const handleScroll = () => onClose();

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position || !targetBlock) return null;

  const handleTransform = (option: TransformOption) => {
    transformBlock(editor, targetBlock.id, option.type, option.props);
    onClose();
    editor.focus?.();
  };

  const handleDuplicate = () => {
    duplicateBlock(editor, targetBlock);
    onClose();
    editor.focus?.();
  };

  const handleDelete = () => {
    try {
      editor.removeBlocks([targetBlock.id]);
    } catch {
      // Ignore
    }
    onClose();
    editor.focus?.();
  };

  const handleCopy = async () => {
    try {
      const text = typeof editor.blocksToMarkdownLossy === "function"
        ? await editor.blocksToMarkdownLossy([targetBlock])
        : JSON.stringify(targetBlock);
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    onClose();
  };

  const handleCut = async () => {
    await handleCopy();
    handleDelete();
  };

  const style: CSSProperties = {
    top: adjustedPos?.top ?? position.y,
    left: adjustedPos?.left ?? position.x,
    visibility: adjustedPos ? "visible" : "hidden",
  };

  const currentTypeLabel = (() => {
    const match = transformOptions.find(
      (opt) =>
        opt.type === targetBlock.type &&
        (!opt.props ||
          (opt.props.level &&
            (targetBlock.props as { level?: number })?.level === opt.props.level)),
    );
    return match ? transformOptionLabel(t, match) : t("block.block");
  })();

  return createPortal(
    <div
      ref={menuRef}
      className="block-context-menu"
      style={style}
      role="menu"
      aria-label={t("block.menu")}
    >
      {showSubmenu ? (
        <div className="block-context-menu__submenu-view">
          <div className="block-context-menu__header">
            <button
              type="button"
              className="block-context-menu__back-button"
              onClick={() => setShowSubmenu(false)}
            >
              <span className="block-context-menu__back-icon" aria-hidden="true">←</span>{" "}
              {t("common.back")}
            </button>
            <span className="block-context-menu__header-title">{t("block.turnIntoTitle")}</span>
          </div>
          <div className="block-context-menu__options-list">
            {transformOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="block-context-menu__item"
                role="menuitem"
                onClick={() => handleTransform(option)}
              >
                <span className="block-context-menu__mark">{option.mark}</span>
                <span>{transformOptionLabel(t, option)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="block-context-menu__main-view">
          <button
            type="button"
            className="block-context-menu__item block-context-menu__item--has-sub"
            role="menuitem"
            onClick={() => setShowSubmenu(true)}
          >
            <span className="block-context-menu__item-left">
              <span className="block-context-menu__mark">⇄</span>
              <span>{t("block.turnInto")}</span>
            </span>
            <span className="block-context-menu__badge">
              {currentTypeLabel}{" "}
              <span aria-hidden="true" className="block-context-menu__chevron">›</span>
            </span>
          </button>

          <div className="block-context-menu__separator" role="separator" />

          <button
            type="button"
            className="block-context-menu__item"
            role="menuitem"
            onClick={handleDuplicate}
          >
            <span className="block-context-menu__item-left">
              <Icon name="copy" />
              <span>{t("common.duplicate")}</span>
            </span>
            <kbd className="block-context-menu__shortcut">Ctrl+D</kbd>
          </button>

          <button
            type="button"
            className="block-context-menu__item block-context-menu__item--danger"
            role="menuitem"
            onClick={handleDelete}
          >
            <span className="block-context-menu__item-left">
              <Icon name="trash" />
              <span>{t("common.delete")}</span>
            </span>
            <kbd className="block-context-menu__shortcut">{t("shortcut.del")}</kbd>
          </button>

          <div className="block-context-menu__separator" role="separator" />

          <button
            type="button"
            className="block-context-menu__item"
            role="menuitem"
            onClick={() => void handleCut()}
          >
            <span className="block-context-menu__item-left">
              <span className="block-context-menu__mark">✂</span>
              <span>{t("common.cut")}</span>
            </span>
            <kbd className="block-context-menu__shortcut">Ctrl+X</kbd>
          </button>

          <button
            type="button"
            className="block-context-menu__item"
            role="menuitem"
            onClick={() => void handleCopy()}
          >
            <span className="block-context-menu__item-left">
              <Icon name="copy" />
              <span>{t("common.copy")}</span>
            </span>
            <kbd className="block-context-menu__shortcut">Ctrl+C</kbd>
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
