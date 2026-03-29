import { useEffect, useRef, useMemo, type Dispatch, type MutableRefObject } from 'react';
import { debounce } from 'lodash';
import { v7 as uuidv7 } from 'uuid';
import { useChatState, useChatDispatch } from '../panels/chat/context';
import type { ChatAction } from '../panels/chat/context';
import type {
	DocumentChatMessage,
	ChatMessagesFile,
	ChatSessionFile,
	ChatSessionListItem,
} from '../panels/chat/context';
import type { DocumentAction } from '../context/actions';
import { useDocumentDispatch } from './use-document-dispatch';
import { useDocumentState } from './use-document-state';
import {
	formatRelativeTime,
	syncChatSessionsFromDisk,
	titleFromMessages,
} from '../services/chat-session-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

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
 *
 * Session discovery is done by scanning the `chats/` directory for session
 * subfolders -- no separate session index file is used.
 *
 * Session IDs are UUID v7 -- the creation timestamp is recoverable from the
 * folder name via `createdAtFromSessionId`.
 *
 * Returns a flush function that immediately writes pending changes.
 */
export function useChatPersistence(documentId: string | undefined): () => void {
	const chatDispatch = useChatDispatch();
	const docDispatch = useDocumentDispatch();
	const { chatSessions } = useDocumentState();
	const { messages: chatMessages, sessionId } = useChatState();

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	const sessionIdRef = useRef<string | null>(null);
	sessionIdRef.current = sessionId;

	// Stable ref for docDispatch so the debounced save closure does not need it
	// as a dependency.
	const docDispatchRef = useRef<Dispatch<DocumentAction>>(docDispatch);
	docDispatchRef.current = docDispatch;

	// Tracks the sessions list last dispatched to document context so new
	// sessions can be prepended without a full re-read from disk.
	const sessionsListRef = useRef<ChatSessionListItem[]>([]);

	// Last serialized snapshot written to disk -- skip writes when unchanged.
	const lastSavedRef = useRef('');

	// Session IDs that have already been persisted to disk in this mount --
	// used to know when a new item should be prepended to the UI list.
	const knownSessionsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		sessionsListRef.current = chatSessions;
	}, [chatSessions]);

	// -------------------------------------------------------------------------
	// Load on documentId change
	// -------------------------------------------------------------------------
	useEffect(() => {
		if (!documentId) return;

		let cancelled = false;

		// Reset per-document tracking state.
		lastSavedRef.current = '';
		knownSessionsRef.current = new Set();
		sessionsListRef.current = [];

		async function load(): Promise<void> {
			const docPath = await window.workspace.getDocumentPath(documentId!);

			// If context already has live in-flight messages, the active session is
			// authoritative -- skip disk load to avoid overwriting streamed content.
			if (messagesRef.current.length > 0) {
				try {
					const synced = await syncChatSessionsFromDisk(docPath);
					if (!cancelled && synced) {
						sessionsListRef.current = synced.sessionItems;
						docDispatchRef.current({
							type: 'CHAT_SESSIONS_LOADED',
							sessions: synced.sessionItems,
						});
						for (const item of synced.sessionItems) {
							knownSessionsRef.current.add(item.id);
						}
					}
				} catch {
					// Sync failure is non-fatal while live messages are active.
				}
				const sid = sessionIdRef.current;
				if (sid) lastSavedRef.current = JSON.stringify(messagesRef.current);
				return;
			}

			// --- Try scanning chats/ directory ---
			const synced = await syncChatSessionsFromDisk(docPath);

			if (cancelled) return;

			if (!synced) {
				// No sessions found -- try migration from legacy layouts.
				await migrateAndLoad({
					docPath,
					chatsDir: `${docPath}/chats`,
					cancelled: () => cancelled,
					chatDispatch,
					docDispatchRef,
					knownSessionsRef,
					lastSavedRef,
					sessionsListRef,
				});
				return;
			}

			// Load most recent session from the scanned results.
			if (synced.latestSession) {
				const messages = sanitizeLoadedMessages(synced.latestSession.messages);
				knownSessionsRef.current.add(synced.latestSession.sessionId);
				lastSavedRef.current = JSON.stringify(messages);

				chatDispatch({
					type: 'CHAT_MESSAGES_LOADED',
					messages,
					sessionId: synced.latestSession.sessionId,
				});
			}

			// Mark all discovered sessions as known.
			for (const item of synced.sessionItems) {
				knownSessionsRef.current.add(item.id);
			}

			// Build session list for document context.
			sessionsListRef.current = synced.sessionItems;
			docDispatchRef.current({ type: 'CHAT_SESSIONS_LOADED', sessions: synced.sessionItems });
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [documentId, chatDispatch]);

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
						// Write failure is non-fatal -- retry on next change.
						return;
					}

					// Prepend the new session to the document context list if it is
					// not yet known (first save for this session in this mount).
					if (!knownSessionsRef.current.has(sid)) {
						knownSessionsRef.current.add(sid);

						const newItem: ChatSessionListItem = {
							id: sid,
							title: titleFromMessages(messages, 'Untitled'),
							ageLabel: formatRelativeTime(createdAt),
							createdAt,
						};
						const updatedList = [newItem, ...sessionsListRef.current.filter((s) => s.id !== sid)];
						sessionsListRef.current = updatedList;
						docDispatchRef.current({
							type: 'CHAT_SESSIONS_LOADED',
							sessions: updatedList,
						});
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
// Migration helper -- runs only once per document when upgrading from older
// storage layouts to the new chats/{sessionId}/messages.json structure.
// ---------------------------------------------------------------------------

interface MigrateOptions {
	docPath: string;
	chatsDir: string;
	cancelled: () => boolean;
	chatDispatch: Dispatch<ChatAction>;
	docDispatchRef: MutableRefObject<Dispatch<DocumentAction>>;
	knownSessionsRef: MutableRefObject<Set<string>>;
	lastSavedRef: MutableRefObject<string>;
	sessionsListRef: MutableRefObject<ChatSessionListItem[]>;
}

async function migrateAndLoad(opts: MigrateOptions): Promise<void> {
	const {
		docPath,
		chatsDir,
		cancelled,
		chatDispatch,
		docDispatchRef,
		knownSessionsRef,
		lastSavedRef,
		sessionsListRef,
	} = opts;

	// Try previous layout: chat/session-index.json (flat UUID files, no subfolders)
	const oldChatDir = `${docPath}/chat`;
	let legacyMessages: DocumentChatMessage[] | null = null;

	try {
		const raw = await window.workspace.readFile({
			filePath: `${oldChatDir}/session-index.json`,
		});
		const oldIndex = JSON.parse(raw) as {
			sessions: Array<{ sessionId: string; createdAt: string }>;
		};
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
		// No old session-index.json -- try original single-file layout.
	}

	if (!legacyMessages) {
		try {
			const raw = await window.workspace.readFile({
				filePath: `${oldChatDir}/messages.json`,
			});
			const legacy = JSON.parse(raw) as ChatMessagesFile;
			legacyMessages = legacy.messages ?? [];
		} catch {
			// No legacy file either -- fresh document.
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

	await window.workspace.writeFile({
		filePath: `${chatsDir}/${newSessionId}/messages.json`,
		content: JSON.stringify(sessionFile, null, 2),
		createParents: true,
	});
	// Old files are left in place as backup.

	if (cancelled()) return;

	knownSessionsRef.current.add(newSessionId);
	lastSavedRef.current = JSON.stringify(sanitized);

	chatDispatch({ type: 'CHAT_MESSAGES_LOADED', messages: sanitized, sessionId: newSessionId });
	chatDispatch({ type: 'CHAT_SESSION_STARTED', sessionId: newSessionId });

	// Update document context with the migrated session.
	const migratedItem: ChatSessionListItem = {
		id: newSessionId,
		title: titleFromMessages(sanitized, 'Untitled'),
		ageLabel: formatRelativeTime(createdAt),
		createdAt,
	};
	sessionsListRef.current = [migratedItem];
	docDispatchRef.current({ type: 'CHAT_SESSIONS_LOADED', sessions: [migratedItem] });
}
