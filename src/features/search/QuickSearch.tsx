import { useEffect, useRef, useState } from "react";
import { searchApi } from "./api";
import type { SearchResult } from "./api";
import { Dialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n";

type SearchStatus = "initial" | "searching" | "results" | "empty" | "error";

type QuickSearchProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (pageId: string) => Promise<boolean>;
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((part, index) =>
    part.toLocaleLowerCase() === needle.toLocaleLowerCase()
      ? <mark key={index}>{part}</mark>
      : part
  )}</>;
}

export function QuickSearch({ open, onClose, onSelect }: QuickSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<SearchStatus>("initial");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRevision = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setStatus("initial");
    requestRevision.current += 1;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const revision = ++requestRevision.current;
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      setStatus("initial");
      return;
    }

    setStatus("searching");
    void searchApi.search(query).then(
      (nextResults) => {
        if (revision !== requestRevision.current) return;
        setResults(nextResults);
        setSelectedIndex(0);
        setStatus(nextResults.length ? "results" : "empty");
      },
      () => {
        if (revision !== requestRevision.current) return;
        setResults([]);
        setSelectedIndex(0);
        setStatus("error");
      },
    );
  }, [open, query]);

  if (!open) return null;

  const moveSelection = (offset: number) => {
    if (!results.length) return;
    setSelectedIndex((current) => (current + offset + results.length) % results.length);
  };

  const openResult = async (result: SearchResult) => {
    if (await onSelect(result.pageId)) onClose();
  };

  return (
    <Dialog
      open={open}
      title={t("search.title")}
      onClose={onClose}
      className="quick-search__dialog"
      backdropClassName="quick-search"
      initialFocusRef={inputRef}
    >
      <section className="quick-search__content">
        <h2 id="quick-search-title" className="quick-search__title">
          {t("search.title")}
        </h2>
        <div className="quick-search__input-wrap">
          <Icon name="search" className="quick-search__input-icon" />
          <input
            ref={inputRef}
            className="quick-search__input"
          type="search"
          aria-label={t("search.inputLabel")}
          aria-controls="quick-search-results"
          aria-activedescendant={results[selectedIndex] ? `search-result-${results[selectedIndex].pageId}` : undefined}
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              moveSelection(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveSelection(-1);
            } else if (event.key === "Enter" && results[selectedIndex]) {
              event.preventDefault();
              void openResult(results[selectedIndex]);
            }
          }}
          />
        </div>

        <div className="quick-search__body" id="quick-search-results">
          {status === "initial" && (
            <p className="quick-search__state">{t("search.hint")}</p>
          )}
          {status === "searching" && (
            <p className="quick-search__state" role="status">{t("search.searching")}</p>
          )}
          {status === "empty" && (
            <p className="quick-search__state">{t("search.empty")}</p>
          )}
          {status === "error" && (
            <p className="quick-search__state quick-search__state--error" role="alert">
              {t("search.error")}
            </p>
          )}
          {status === "results" && (
            <ul className="quick-search__results">
              {results.map((result, index) => (
                <li key={result.pageId}>
                  <button
                    id={`search-result-${result.pageId}`}
                    type="button"
                    className="quick-search__result"
                    aria-selected={selectedIndex === index}
                    onMouseMove={() => setSelectedIndex(index)}
                    onClick={() => void openResult(result)}
                  >
                    <strong>{result.title}</strong>
                    {result.snippet && <span><HighlightedText text={result.snippet} query={query} /></span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="quick-search__footer">
          <span><kbd>↑↓</kbd> {t("search.navigate")}</span>
          <span><kbd>Enter</kbd> {t("search.open")}</span>
          <span><kbd>Esc</kbd> {t("search.close")}</span>
        </footer>
      </section>
    </Dialog>
  );
}
