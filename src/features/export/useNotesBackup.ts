import { useCallback, useRef, useState } from "react";
import { tGlobal } from "../../i18n";
import { documentApi } from "../editor/api";
import { parseDocument } from "../editor/documentParsing";
import { pageApi } from "../pages/api";
import { exportApi, type BackupNotePayload } from "./api";
import { blocksToMarkdown } from "./markdownSerialization";

export type BackupStatus = "idle" | "in_progress" | "success" | "error";

export type BackupProgress = {
  current: number;
  total: number;
  noteTitle: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useNotesBackup(flush?: () => Promise<boolean>) {
  const [status, setStatus] = useState<BackupStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BackupProgress>({
    current: 0,
    total: 0,
    noteTitle: "",
  });
  const [destinationPath, setDestinationPath] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState<number>(0);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    if (runningRef.current) return;
    setStatus("idle");
    setError(null);
    setProgress({ current: 0, total: 0, noteTitle: "" });
    setDestinationPath(null);
    setExportedCount(0);
  }, []);

  const startBackup = useCallback(async (): Promise<boolean> => {
    if (runningRef.current) return false;
    runningRef.current = true;
    setStatus("in_progress");
    setError(null);
    setProgress({ current: 0, total: 0, noteTitle: tGlobal("backup.progressSaving") });

    try {
      if (flush && !(await flush())) {
        setStatus("error");
        setError(tGlobal("error.backupFlushFailed"));
        return false;
      }

      setProgress({ current: 0, total: 0, noteTitle: tGlobal("backup.progressLoading") });
      const pages = await pageApi.list();

      if (pages.length === 0) {
        const result = await exportApi.backupNotes([]);
        setStatus("success");
        setDestinationPath(result.destinationPath);
        setExportedCount(0);
        return true;
      }

      const notesToBackup: BackupNotePayload[] = [];
      const total = pages.length;

      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const displayTitle = page.title || tGlobal("common.untitled");
        setProgress({
          current: i + 1,
          total,
          noteTitle: displayTitle,
        });

        // Yield to browser paint cycle so progress state updates visually
        await new Promise((resolve) => setTimeout(resolve, 30));

        const doc = await documentApi.load(page.id);
        const blocks = parseDocument(doc.contentJson);
        const markdown = blocksToMarkdown(blocks);

        notesToBackup.push({
          id: page.id,
          title: page.title,
          parentId: page.parentId,
          markdown,
        });
      }

      setProgress({
        current: total,
        total,
        noteTitle: tGlobal("backup.progressWriting"),
      });

      const result = await exportApi.backupNotes(notesToBackup);

      setDestinationPath(result.destinationPath);
      setExportedCount(result.exportedCount);
      setStatus("success");
      return true;
    } catch (reason) {
      setStatus("error");
      setError(tGlobal("error.backupFailed", { reason: errorMessage(reason) }));
      return false;
    } finally {
      runningRef.current = false;
    }
  }, [flush]);

  const openFolder = useCallback(async () => {
    try {
      await exportApi.openBackupFolder();
    } catch (reason) {
      setError(tGlobal("error.openBackupFolder", { reason: errorMessage(reason) }));
    }
  }, []);

  return {
    status,
    error,
    progress,
    destinationPath,
    exportedCount,
    startBackup,
    openFolder,
    reset,
  };
}
