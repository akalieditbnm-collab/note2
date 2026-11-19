import { useMemo } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useTranslation } from "../../i18n";

type DocumentStatsProps = {
  blocks: PartialBlock[];
  className?: string;
};

function extractTextFromBlocks(blocks: PartialBlock[]): string {
  let text = "";

  const extract = (items: PartialBlock[]) => {
    for (const item of items) {
      if (typeof item.content === "string") {
        text += " " + item.content;
      } else if (Array.isArray(item.content)) {
        for (const sub of item.content) {
          if (typeof sub === "string") {
            text += " " + sub;
          } else if (typeof sub === "object" && sub !== null && "text" in sub) {
            text += " " + ((sub as { text?: string }).text ?? "");
          }
        }
      }
      if (item.children && Array.isArray(item.children)) {
        extract(item.children as PartialBlock[]);
      }
    }
  };

  extract(blocks);
  return text.trim();
}

export function DocumentStats({ blocks, className = "" }: DocumentStatsProps) {
  const { t } = useTranslation();
  const { words, chars } = useMemo(() => {
    const fullText = extractTextFromBlocks(blocks);
    const charCount = fullText.length;
    const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
    return { words: wordCount, chars: charCount };
  }, [blocks]);

  if (words === 0 && chars === 0) return null;

  const wordLabel = t.plural({ one: t("editor.wordOne"), other: t("editor.wordOther") });
  const charLabel = t.plural({ one: t("editor.charOne"), other: t("editor.charOther") });

  return (
    <div className={`document-stats ${className}`.trim()} aria-label={t("editor.stats")}>
      <span>{wordLabel(words, { count: words })}</span>
      <span className="document-stats__separator">·</span>
      <span>{charLabel(chars, { count: chars })}</span>
    </div>
  );
}
