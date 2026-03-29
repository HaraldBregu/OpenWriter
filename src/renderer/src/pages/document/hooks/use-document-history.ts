import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import {
	saveHistorySnapshot,
	listHistoryEntries,
	loadHistoryEntry,
	MAX_HISTORY_ENTRIES,
	isHistoryEntryFilePath,
	type HistoryEntry,
} from '../services/history-service';

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
	const liveDraftRef = useRef<{ content: string; title: string } | null>(null);

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

	// Load history entries when docPath becomes available
	useEffect(() => {
		if (!docPath) {
			setEntries([]);
			setCurrentEntryId(null);
			return;
		}
		void reloadEntries();
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
		liveDraftRef.current = null;
	}, [documentId]);

	// User edits while browsing history should return to the live document state.
	useEffect(() => {
		if (!loaded || isRestoringRef.current || currentEntryId === null) return;
		setCurrentEntryId(null);
		liveDraftRef.current = null;
	}, [content, title, loaded, currentEntryId]);

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
			debouncedSnapshot.cancel();
		},
		[debouncedSnapshot]
	);

	const currentIndex = currentEntryId ? entries.findIndex((e) => e.id === currentEntryId) : -1;
	const hasHistorySelection = currentEntryId !== null && currentIndex >= 0;

	const canUndo = entries.length > 0 && (!hasHistorySelection || currentIndex > 0);
	const canRedo =
		hasHistorySelection && (currentIndex < entries.length - 1 || liveDraftRef.current !== null);

	const undo = useCallback(async () => {
		if (!docPath || entries.length === 0) return;

		if (currentEntryId === null) {
			liveDraftRef.current = { ...stateRef.current };
		}

		const targetIndex = hasHistorySelection ? currentIndex - 1 : entries.length - 1;
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
	}, [docPath, entries, currentEntryId, currentIndex, hasHistorySelection, onRestore]);

	const redo = useCallback(async () => {
		if (!docPath || !hasHistorySelection) return;

		const targetIndex = currentIndex + 1;
		if (targetIndex >= entries.length) {
			const liveDraft = liveDraftRef.current;
			if (!liveDraft) return;

			liveDraftRef.current = null;
			isRestoringRef.current = true;
			setCurrentEntryId(null);
			onRestore(liveDraft.content, liveDraft.title);
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
	}, [docPath, entries, currentIndex, hasHistorySelection, onRestore]);

	const restoreEntry = useCallback(
		async (id: string) => {
			if (!docPath) return;

			if (currentEntryId === null) {
				liveDraftRef.current = { ...stateRef.current };
			}

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
		[currentEntryId, docPath, onRestore]
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
