import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import {
  saveHistorySnapshot,
  listHistoryEntries,
  loadHistoryEntry,
  type HistoryEntry,
} from '../history-service';

export type { HistoryEntry };

const SNAPSHOT_DEBOUNCE_MS = 5000;
const RESTORE_COOLDOWN_MS = 200;

interface UseDocumentHistoryOptions {
  documentId: string | undefined;
  content: string;
  title: string;
  loaded: boolean;
  onRestore: (content: string, title: string) => void;
}

interface UseDocumentHistoryReturn {
  entries: HistoryEntry[];
  currentEntryId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
}

export function useDocumentHistory({
  documentId,
  content,
  title,
  loaded,
  onRestore,
}: UseDocumentHistoryOptions): UseDocumentHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [docPath, setDocPath] = useState<string | null>(null);
  const isRestoringRef = useRef(false);

  const stateRef = useRef({ content, title });
  stateRef.current = { content, title };

  // Resolve document path whenever documentId changes
  useEffect(() => {
    if (!documentId) {
      setDocPath(null);
      return;
    }
    window.workspace
      .getDocumentPath(documentId)
      .then(setDocPath)
      .catch(() => setDocPath(null));
  }, [documentId]);

  // Load history entries when docPath becomes available
  useEffect(() => {
    if (!docPath) {
      setEntries([]);
      return;
    }
    listHistoryEntries(docPath)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [docPath]);

  // Reset pointer when document changes
  useEffect(() => {
    setCurrentEntryId(null);
  }, [documentId]);

  // Debounced snapshot creator
  const debouncedSnapshot = useMemo(
    () =>
      debounce(
        async () => {
          if (!docPath || isRestoringRef.current) return;
          const { content: c, title: t } = stateRef.current;
          try {
            const entry = await saveHistorySnapshot(docPath, c, t);
            setEntries((prev) => {
              const without = prev.filter((e) => e.id !== entry.id);
              return [...without, entry].slice(-MAX_HISTORY_ENTRIES_LIMIT);
            });
            setCurrentEntryId(null);
          } catch {
            // ignore save errors
          }
        },
        SNAPSHOT_DEBOUNCE_MS,
        { leading: false, trailing: true },
      ),
    [docPath],
  );

  // Trigger snapshot on content/title changes
  useEffect(() => {
    if (!loaded || isRestoringRef.current) return;
    debouncedSnapshot();
  }, [content, title, loaded, debouncedSnapshot]);

  useEffect(
    () => () => {
      debouncedSnapshot.cancel();
    },
    [debouncedSnapshot],
  );

  const currentIndex = currentEntryId
    ? entries.findIndex((e) => e.id === currentEntryId)
    : -1;

  const canUndo = entries.length > 0 && currentIndex !== 0;
  const canRedo = currentEntryId !== null && currentIndex < entries.length - 1;

  const undo = useCallback(async () => {
    if (!docPath || entries.length === 0) return;

    const targetIndex =
      currentEntryId === null ? entries.length - 1 : currentIndex - 1;
    if (targetIndex < 0) return;

    const target = entries[targetIndex];
    if (!target) return;

    isRestoringRef.current = true;
    try {
      const data = await loadHistoryEntry(docPath, target.id);
      setCurrentEntryId(target.id);
      onRestore(data.content, data.title);
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        isRestoringRef.current = false;
      }, RESTORE_COOLDOWN_MS);
    }
  }, [docPath, entries, currentEntryId, currentIndex, onRestore]);

  const redo = useCallback(async () => {
    if (!docPath || currentEntryId === null) return;

    const targetIndex = currentIndex + 1;
    if (targetIndex >= entries.length) {
      setCurrentEntryId(null);
      return;
    }

    const target = entries[targetIndex];
    if (!target) return;

    isRestoringRef.current = true;
    try {
      const data = await loadHistoryEntry(docPath, target.id);
      setCurrentEntryId(target.id);
      onRestore(data.content, data.title);
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        isRestoringRef.current = false;
      }, RESTORE_COOLDOWN_MS);
    }
  }, [docPath, entries, currentEntryId, currentIndex, onRestore]);

  const restoreEntry = useCallback(
    async (id: string) => {
      if (!docPath) return;

      isRestoringRef.current = true;
      try {
        const data = await loadHistoryEntry(docPath, id);
        setCurrentEntryId(id);
        onRestore(data.content, data.title);
      } catch {
        // ignore
      } finally {
        setTimeout(() => {
          isRestoringRef.current = false;
        }, RESTORE_COOLDOWN_MS);
      }
    },
    [docPath, onRestore],
  );

  return {
    entries,
    currentEntryId,
    canUndo,
    canRedo,
    undo,
    redo,
    restoreEntry,
  };
}
