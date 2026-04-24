import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import {
	saveHistorySnapshot,
	listHistoryEntries,
	loadHistoryEntry,
	readLatestHistoryEntry,
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
	restoreEntry: (id: string) => Promise<void>;
	returnToLive: () => void;
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

	// User edits while browsing history should return to the live document state.
	useEffect(() => {
		if (!loaded || isRestoringRef.current || currentEntryId === null) return;
		setCurrentEntryId(null);
	}, [content, title, loaded, currentEntryId]);

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

	return {
		entries,
		currentEntryId,
		restoreEntry,
		returnToLive,
	};
}
