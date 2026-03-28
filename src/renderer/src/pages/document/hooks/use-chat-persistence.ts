import { useEffect, useRef, useMemo, type Dispatch } from 'react';
import { debounce } from 'lodash';
import { v7 as uuidv7 } from 'uuid';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
	chatMessagesLoaded,
	chatSessionStarted,
	selectChatMessages,
	selectChatSessionId,
} from '../../../store/chat';
import type {
	DocumentChatMessage,
	ChatMessagesFile,
	ChatSessionFile,
	ChatSessionIndex,
	ChatSessionListItem,
} from '../context/state';
import type { DocumentAction } from '../context/actions';
import { useDocumentDispatch } from './use-document-dispatch';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
	const ts = new Date(iso).getTime();
	if (!Number.isFinite(ts)) return '';
	const seconds = Math.floor((Date.now() - ts) / 1000);
	if (seconds < 60) return 'now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return `${Math.floor(days / 7)}w`;
}

function titleFromMessages(messages: DocumentChatMessage[], fallback: string): string {
	const firstUser = messages.find((m) => m.role === 'user' && m.content.trim().length > 0);
	if (!firstUser) return fallback;
	return firstUser.content.trim().replace(/\s+/g, ' ').slice(0, 64);
}

async function buildSessionList(
	chatsDir: string,
	entries: ChatSessionIndex['sessions']
): Promise<ChatSessionListItem[]> {
	const sorted = [...entries].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	return Promise.all(
		sorted.map(async (entry) => {
			try {
				const raw = await window.workspace.readFile({
					filePath: `${chatsDir}/${entry.sessionId}/messages.json`,
				});
				const file = JSON.parse(raw) as ChatSessionFile;
				return {
					id: entry.sessionId,
					title: titleFromMessages(file.messages ?? [], 'Untitled'),
					ageLabel: formatRelativeTime(entry.createdAt),
					createdAt: entry.createdAt,
				} satisfies ChatSessionListItem;
			} catch {
				return {
					id: entry.sessionId,
					title: 'Untitled',
					ageLabel: formatRelativeTime(entry.createdAt),
					createdAt: entry.createdAt,
				} satisfies ChatSessionListItem;
			}
		})
	);
}

function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((msg) =>
		INTERRUPTED_STATUSES.has(msg.status)
			? { ...msg, status: 'error' as const, content: msg.content || 'Session interrupted' }
			: msg
	);
}

/**
 * Extract the creation timestamp embedded in a UUID v7 folder name.
 * UUID v7 encodes a Unix ms timestamp in its first 48 bits (12 hex chars).
 * Falls back to the provided ISO string if the id is not a valid UUID v7.
 */
export function createdAtFromSessionId(sessionId: string, fallback: string): string {
	try {
		const msBits = sessionId.replace(/-/g, '').slice(0, 12);
		const ms = parseInt(msBits, 16);
		if (ms > 0) return new Date(ms).toISOString();
	} catch {
		// ignore
	}
	return fallback;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Persists chat messages for a document to:
 *   {docPath}/chats/{sessionId}/messages.json
 * Session index:
 *   {docPath}/sessions.json
 *
 * Session IDs are UUID v7 — the creation timestamp is recoverable from the
 * folder name via `createdAtFromSessionId`.
 *
 * Returns a flush function that immediately writes pending changes.
 */
export function useChatPersistence(documentId: string | undefined): () => void {
	const reduxDispatch = useAppDispatch();
	const docDispatch = useDocumentDispatch();
	const chatMessages = useAppSelector((state) => selectChatMessages(state, documentId));
	const sessionId = useAppSelector((state) => selectChatSessionId(state, documentId));

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	const sessionIdRef = useRef<string | null>(null);
	sessionIdRef.current = sessionId;

	// Stable ref for docDispatch (guaranteed stable by React, but captured via ref
	// so the debounced save closure does not need it as a dependency).
	const docDispatchRef = useRef<Dispatch<DocumentAction>>(docDispatch);
	docDispatchRef.current = docDispatch;

	// Tracks the sessions list last dispatched to document context so new
	// sessions can be prepended without a full re-read from disk.
	const sessionsListRef = useRef<ChatSessionListItem[]>([]);

	// Last serialized snapshot written to disk — skip writes when unchanged.
	const lastSavedRef = useRef('');

	// Session IDs already appended to sessions.json in this mount — avoid
	// redundant index reads on every debounced save.
	const indexedSessionsRef = useRef<Set<string>>(new Set());

	// -------------------------------------------------------------------------
	// Load on documentId change
	// -------------------------------------------------------------------------
	useEffect(() => {
		if (!documentId) return;

		let cancelled = false;

		// Reset per-document tracking state.
		lastSavedRef.current = '';
		indexedSessionsRef.current = new Set();
		sessionsListRef.current = [];

		async function load(): Promise<void> {
			const docPath = await window.workspace.getDocumentPath(documentId!);
			const chatsDir = `${docPath}/chats`;
			const indexPath = `${docPath}/sessions.json`;
			const legacyIndexPath = `${chatsDir}/sessions.json`;

			// --- 1. Try to read the sessions index (new structure) ---
			let index: ChatSessionIndex | null = null;
			try {
				const raw = await window.workspace.readFile({ filePath: indexPath });
				index = JSON.parse(raw) as ChatSessionIndex;
			} catch {
				// New index location does not exist yet. Try legacy location.
				try {
					const raw = await window.workspace.readFile({ filePath: legacyIndexPath });
					index = JSON.parse(raw) as ChatSessionIndex;
					// Migrate index to new location.
					await window.workspace.writeFile({
						filePath: indexPath,
						content: JSON.stringify(index, null, 2),
						createParents: true,
					});
				} catch {
					// No index found.
				}
			}

			if (cancelled) return;

			// If Redux already has live in-flight messages, the active session is
			// authoritative — skip disk load to avoid overwriting streamed content.
			if (messagesRef.current.length > 0) {
				const sid = sessionIdRef.current;
				if (sid) lastSavedRef.current = JSON.stringify(messagesRef.current);
				return;
			}

			// --- 2. Migration paths ---
			if (!index) {
				await migrateAndLoad({
					docPath,
					chatsDir,
					indexPath,
					documentId: documentId!,
					cancelled: () => cancelled,
					reduxDispatch,
					docDispatchRef,
					indexedSessionsRef,
					lastSavedRef,
					sessionsListRef,
				});
				return;
			}

			// --- 3. Load most recent session from index ---
			const sorted = [...index.sessions].sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
			const latest = sorted[0];
			if (!latest) return;

			try {
				const sessionPath = `${chatsDir}/${latest.sessionId}/messages.json`;
				const raw = await window.workspace.readFile({ filePath: sessionPath });
				if (cancelled) return;

				const sessionFile = JSON.parse(raw) as ChatSessionFile;
				const messages = sanitizeLoadedMessages(sessionFile.messages ?? []);
				indexedSessionsRef.current.add(latest.sessionId);
				lastSavedRef.current = JSON.stringify(messages);

				reduxDispatch(
					chatMessagesLoaded({
						documentId: documentId!,
						messages,
						sessionId: latest.sessionId,
					})
				);
			} catch {
				// Session file corrupt or missing — start fresh.
			}

			// --- 4. Build session list for document context ---
			if (!cancelled) {
				const sessionItems = await buildSessionList(chatsDir, index.sessions);
				if (!cancelled) {
					sessionsListRef.current = sessionItems;
					docDispatchRef.current({ type: 'CHAT_SESSIONS_LOADED', sessions: sessionItems });
				}
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [documentId, reduxDispatch]);

	// -------------------------------------------------------------------------
	// Debounced save
	// -------------------------------------------------------------------------
	const debouncedSave = useMemo(
		() =>
			debounce(
				async () => {
					if (!documentId) return;

					const sid = sessionIdRef.current;
					if (!sid) return; // no active session yet

					const messages = messagesRef.current;
					if (messages.length === 0 && lastSavedRef.current === '') return;

					const serialized = JSON.stringify(messages);
					if (serialized === lastSavedRef.current) return;

					const docPath = await window.workspace.getDocumentPath(documentId);
					const chatsDir = `${docPath}/chats`;
					const sessionFilePath = `${chatsDir}/${sid}/messages.json`;

					const createdAt = createdAtFromSessionId(sid, new Date().toISOString());
					const sessionFile: ChatSessionFile = {
						version: 2,
						sessionId: sid,
						createdAt,
						messages,
					};

					try {
						await window.workspace.writeFile({
							filePath: sessionFilePath,
							content: JSON.stringify(sessionFile, null, 2),
							createParents: true,
						});
						lastSavedRef.current = serialized;
					} catch {
						// Write failure is non-fatal — retry on next change.
						return;
					}

					// Append to sessions.json if this sessionId is new this mount.
					if (!indexedSessionsRef.current.has(sid)) {
						try {
							const indexPath = `${docPath}/sessions.json`;
							let idx: ChatSessionIndex = { version: 1, sessions: [] };
							try {
								const raw = await window.workspace.readFile({ filePath: indexPath });
								idx = JSON.parse(raw) as ChatSessionIndex;
							} catch {
								// Index doesn't exist yet.
							}

							if (!idx.sessions.some((e) => e.sessionId === sid)) {
								const updated: ChatSessionIndex = {
									...idx,
									sessions: [...idx.sessions, { sessionId: sid, createdAt }],
								};
								await window.workspace.writeFile({
									filePath: indexPath,
									content: JSON.stringify(updated, null, 2),
									createParents: true,
								});
							}
							indexedSessionsRef.current.add(sid);
						} catch {
							// Index update failure is non-fatal.
						}
					}
				},
				SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[documentId]
	);

	useEffect(() => {
		debouncedSave();
	}, [chatMessages, debouncedSave]);

	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	return debouncedSave.flush;
}

// ---------------------------------------------------------------------------
// Migration helper — runs only once per document when upgrading from older
// storage layouts to the new chats/{sessionId}/messages.json structure.
// ---------------------------------------------------------------------------

interface MigrateOptions {
	docPath: string;
	chatsDir: string;
	indexPath: string;
	documentId: string;
	cancelled: () => boolean;
	reduxDispatch: ReturnType<typeof useAppDispatch>;
	indexedSessionsRef: React.MutableRefObject<Set<string>>;
	lastSavedRef: React.MutableRefObject<string>;
}

async function migrateAndLoad(opts: MigrateOptions): Promise<void> {
	const {
		docPath,
		chatsDir,
		indexPath,
		documentId,
		cancelled,
		reduxDispatch,
		indexedSessionsRef,
		lastSavedRef,
	} = opts;

	// Try previous layout: chat/sessions.json (flat UUID files, no subfolders)
	const oldChatDir = `${docPath}/chat`;
	let legacyMessages: DocumentChatMessage[] | null = null;

	try {
		const raw = await window.workspace.readFile({
			filePath: `${oldChatDir}/sessions.json`,
		});
		const oldIndex = JSON.parse(raw) as ChatSessionIndex;
		const sorted = [...oldIndex.sessions].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		const latest = sorted[0];
		if (latest) {
			const sessionRaw = await window.workspace.readFile({
				filePath: `${oldChatDir}/${latest.sessionId}.json`,
			});
			const sessionFile = JSON.parse(sessionRaw) as ChatSessionFile;
			legacyMessages = sessionFile.messages ?? [];
		}
	} catch {
		// No old sessions.json — try original single-file layout.
	}

	if (!legacyMessages) {
		try {
			const raw = await window.workspace.readFile({
				filePath: `${oldChatDir}/messages.json`,
			});
			const legacy = JSON.parse(raw) as ChatMessagesFile;
			legacyMessages = legacy.messages ?? [];
		} catch {
			// No legacy file either — fresh document.
		}
	}

	if (!legacyMessages || cancelled()) return;

	const newSessionId = uuidv7();
	const createdAt = createdAtFromSessionId(newSessionId, new Date().toISOString());
	const sanitized = sanitizeLoadedMessages(legacyMessages);

	const sessionFile: ChatSessionFile = {
		version: 2,
		sessionId: newSessionId,
		createdAt,
		messages: sanitized,
	};
	const newIndex: ChatSessionIndex = {
		version: 1,
		sessions: [{ sessionId: newSessionId, createdAt }],
	};

	await window.workspace.writeFile({
		filePath: `${chatsDir}/${newSessionId}/messages.json`,
		content: JSON.stringify(sessionFile, null, 2),
		createParents: true,
	});
	await window.workspace.writeFile({
		filePath: indexPath,
		content: JSON.stringify(newIndex, null, 2),
		createParents: true,
	});
	// Old files are left in place as backup.

	if (cancelled()) return;

	indexedSessionsRef.current.add(newSessionId);
	lastSavedRef.current = JSON.stringify(sanitized);

	reduxDispatch(chatMessagesLoaded({ documentId, messages: sanitized, sessionId: newSessionId }));
	reduxDispatch(chatSessionStarted({ documentId, sessionId: newSessionId }));
}
