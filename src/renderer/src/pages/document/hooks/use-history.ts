import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import {
	saveHistorySnapshot,
	listHistoryEntries,
	loadHistoryEntry,
	readLatestHistoryEntry,
	deleteHistoryEntries,
	MAX_HISTORY_ENTRIES,
	isHistoryEntryFilePath,
	type HistoryEntry,
} from '../services/history-service';

export type { HistoryEntry };

const SNAPSHOT_DEBOUNCE_MS = 1500;
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
	undo: () => void;
	redo: () => void;
	restoreEntry: (id: string) => Promise<void>;
	returnToLive: () => void;
}

export function useHistory({
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
	const lastSnapshotRef = useRef<{ content: string; title: string } | null>(null);

	const stateRef = useRef({ content, title });
	stateRef.current = { content, title };

	const reloadEntries = useCallback(async () => {
		if (!docPath) {
			setEntries([]);
			setCurrentEntryId(null);
			return;
		}

		try {
			const nextEntries = await listHistoryEntries(docPath);
			setEntries(nextEntries);
			setCurrentEntryId((previousEntryId) =>
				previousEntryId && nextEntries.some((entry) => entry.id === previousEntryId)
					? previousEntryId
					: null
			);
		} catch {
			setEntries([]);
			setCurrentEntryId(null);
		}
	}, [docPath]);

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

	// Load history entries + seed dedup ref when docPath becomes available
	useEffect(() => {
		if (!docPath) {
			setEntries([]);
			setCurrentEntryId(null);
			lastSnapshotRef.current = null;
			return;
		}
		void reloadEntries();
		void readLatestHistoryEntry(docPath).then((latest) => {
			lastSnapshotRef.current = latest
				? { content: latest.content, title: latest.title }
				: null;
		});
	}, [docPath, reloadEntries]);

	useEffect(() => {
		if (!documentId || !docPath) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== documentId) return;
			if (!isHistoryEntryFilePath(event.filePath)) return;
			void reloadEntries();
		});

		return unsubscribe;
	}, [documentId, docPath, reloadEntries]);

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
					if (c.trim() === '') return;
					const last = lastSnapshotRef.current;
					if (last && last.content === c && last.title === t) return;
					try {
						const entry = await saveHistorySnapshot(docPath, c, t);
						lastSnapshotRef.current = { content: c, title: t };
						setEntries((prev) => {
							const without = prev.filter((e) => e.id !== entry.id);
							return [...without, entry].slice(-MAX_HISTORY_ENTRIES);
						});
						setCurrentEntryId(null);
					} catch {
						// ignore save errors
					}
				},
				SNAPSHOT_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[docPath]
	);

	// Trigger snapshot on content/title changes
	useEffect(() => {
		if (!loaded || isRestoringRef.current) return;
		debouncedSnapshot();
	}, [content, title, loaded, debouncedSnapshot]);

	useEffect(
		() => () => {
			if (!isRestoringRef.current) {
				debouncedSnapshot.flush();
			}
			debouncedSnapshot.cancel();
		},
		[debouncedSnapshot]
	);

	// Editing while viewing a past snapshot drops the forward (redo) entries.
	useEffect(() => {
		if (!loaded || isRestoringRef.current || currentEntryId === null) return;
		const idx = entries.findIndex((e) => e.id === currentEntryId);
		if (idx >= 0 && idx < entries.length - 1 && docPath) {
			const forwardIds = entries.slice(idx + 1).map((e) => e.id);
			void deleteHistoryEntries(docPath, forwardIds);
			setEntries((prev) => {
				const newIdx = prev.findIndex((e) => e.id === currentEntryId);
				return newIdx >= 0 ? prev.slice(0, newIdx + 1) : prev;
			});
		}
		setCurrentEntryId(null);
	}, [content, title, loaded, currentEntryId, entries, docPath]);

	const restoreEntry = useCallback(
		async (id: string) => {
			if (!docPath) return;

			// Persist the current live state first so the user can come back to it
			// via the "Current version" row without losing unsaved edits.
			debouncedSnapshot.flush();

			isRestoringRef.current = true;
			try {
				const data = await loadHistoryEntry(docPath, id);
				setCurrentEntryId(id);
				onRestore(data.content, data.title);
				lastSnapshotRef.current = { content: data.content, title: data.title };
			} catch {
				// ignore
			} finally {
				setTimeout(() => {
					isRestoringRef.current = false;
				}, RESTORE_COOLDOWN_MS);
			}
		},
		[docPath, onRestore, debouncedSnapshot]
	);

	const returnToLive = useCallback(() => {
		if (currentEntryId === null) return;
		const latestEntry = entries[entries.length - 1];
		if (!latestEntry) {
			setCurrentEntryId(null);
			return;
		}
		void restoreEntry(latestEntry.id).then(() => {
			setCurrentEntryId(null);
		});
	}, [currentEntryId, entries, restoreEntry]);

	const canUndo = useMemo(() => {
		if (currentEntryId === null) {
			if (entries.length === 0) return false;
			const last = lastSnapshotRef.current;
			const liveDirty =
				content.trim() !== '' &&
				(!last || last.content !== content || last.title !== title);
			return liveDirty || entries.length >= 2;
		}
		const idx = entries.findIndex((e) => e.id === currentEntryId);
		return idx > 0;
	}, [currentEntryId, entries, content, title]);

	const canRedo = currentEntryId !== null;

	const undo = useCallback(() => {
		if (!docPath) return;

		if (currentEntryId !== null) {
			const idx = entries.findIndex((e) => e.id === currentEntryId);
			if (idx > 0) {
				void restoreEntry(entries[idx - 1].id);
			}
			return;
		}

		// At live state.
		if (entries.length === 0) return;

		const { content: c, title: t } = stateRef.current;
		if (c.trim() === '') return;

		const last = lastSnapshotRef.current;
		const liveDirty = !last || last.content !== c || last.title !== t;

		if (liveDirty) {
			// Persist live so it is reachable via redo, then walk back one step.
			void (async () => {
				debouncedSnapshot.cancel();
				try {
					const newEntry = await saveHistorySnapshot(docPath, c, t);
					lastSnapshotRef.current = { content: c, title: t };
					const updated = [
						...entries.filter((e) => e.id !== newEntry.id),
						newEntry,
					].slice(-MAX_HISTORY_ENTRIES);
					setEntries(updated);
					if (updated.length >= 2) {
						void restoreEntry(updated[updated.length - 2].id);
					}
				} catch {
					// ignore
				}
			})();
			return;
		}

		// Live matches the latest snapshot — step to the one before it.
		if (entries.length >= 2) {
			void restoreEntry(entries[entries.length - 2].id);
		}
	}, [docPath, currentEntryId, entries, debouncedSnapshot, restoreEntry]);

	const redo = useCallback(() => {
		if (currentEntryId === null) return;
		const idx = entries.findIndex((e) => e.id === currentEntryId);
		if (idx < 0) return;
		if (idx < entries.length - 1) {
			void restoreEntry(entries[idx + 1].id);
			return;
		}
		// On the latest snapshot — clear pointer to mark "back at live".
		setCurrentEntryId(null);
	}, [currentEntryId, entries, restoreEntry]);

	return {
		entries,
		currentEntryId,
		canUndo,
		canRedo,
		undo,
		redo,
		restoreEntry,
		returnToLive,
	};
}
