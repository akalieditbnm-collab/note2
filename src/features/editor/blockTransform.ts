import type { Block, BlockNoteEditor } from "@blocknote/core";
import type { IconName } from "../../components/Icon";
import type { MessageKey } from "../../i18n/locales/en";
import type { Translate } from "../../i18n";

export type TransformOption = {
  id: string;
  label: string;
  labelKey: MessageKey;
  type: string;
  props?: Record<string, unknown>;
  icon?: IconName;
  mark?: string;
};

/**
 * Block type catalogue shared by the block side-menu and the right-click menu.
 * `label` stays as the English fallback; `labelKey` drives localised output.
 */
export const transformOptions: TransformOption[] = [
  { id: "paragraph", label: "Text", labelKey: "block.text", type: "paragraph", mark: "¶" },
  { id: "h1", label: "Heading 1", labelKey: "block.heading", type: "heading", props: { level: 1 }, mark: "H1" },
  { id: "h2", label: "Heading 2", labelKey: "block.heading", type: "heading", props: { level: 2 }, mark: "H2" },
  { id: "h3", label: "Heading 3", labelKey: "block.heading", type: "heading", props: { level: 3 }, mark: "H3" },
  { id: "h4", label: "Heading 4", labelKey: "block.heading", type: "heading", props: { level: 4 }, mark: "H4" },
  { id: "h5", label: "Heading 5", labelKey: "block.heading", type: "heading", props: { level: 5 }, mark: "H5" },
  { id: "h6", label: "Heading 6", labelKey: "block.heading", type: "heading", props: { level: 6 }, mark: "H6" },
  { id: "bulletList", label: "Bullet List", labelKey: "block.bulletList", type: "bulletListItem", mark: "•" },
  { id: "numberedList", label: "Numbered List", labelKey: "block.numberedList", type: "numberedListItem", mark: "1." },
  { id: "todo", label: "To-do List", labelKey: "block.todoList", type: "checkListItem", mark: "☑" },
  { id: "codeBlock", label: "Code Block", labelKey: "block.codeBlock", type: "codeBlock", props: { language: "text" }, mark: "</>" },
];

/** Localised label for a transform option (headings get their level injected). */
export function transformOptionLabel(
  t: Translate,
  option: TransformOption,
): string {
  const level = option.props?.level;
  return typeof level === "number"
    ? t(option.labelKey, { level })
    : t(option.labelKey);
}

export function getBlockText(block: Block): string {
  const content = (block as unknown as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          return (item as { text?: string }).text ?? "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function transformBlock(
  editor: BlockNoteEditor,
  blockId: string,
  targetType: string,
  targetProps?: Record<string, unknown>,
): boolean {
  try {
    const existingBlock = editor.getBlock(blockId);
    if (!existingBlock) return false;

    const text = getBlockText(existingBlock);

    if (existingBlock.type === "codeBlock" && targetType !== "codeBlock") {
      const inlineContent = text ? [{ type: "text", text, styles: {} }] : [];
      editor.updateBlock(blockId, {
        type: targetType as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        props: targetProps as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        content: inlineContent as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } else if (existingBlock.type !== "codeBlock" && targetType === "codeBlock") {
      editor.updateBlock(blockId, {
        type: targetType as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        props: targetProps as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        content: text as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } else {
      editor.updateBlock(blockId, {
        type: targetType as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        props: targetProps as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    }
    return true;
  } catch {
    return false;
  }
}
