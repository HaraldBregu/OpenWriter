import { useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
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
} from '../context/state';

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((msg) =>
		INTERRUPTED_STATUSES.has(msg.status)
			? { ...msg, status: 'error' as const, content: msg.content || 'Session interrupted' }
			: msg
	);
}

export function useChatPersistence(documentId: string | undefined): () => void {
	const reduxDispatch = useAppDispatch();
	const chatMessages = useAppSelector((state) => selectChatMessages(state, documentId));
	const sessionId = useAppSelector((state) => selectChatSessionId(state, documentId));

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	const sessionIdRef = useRef<string | null>(null);
	sessionIdRef.current = sessionId;

	// Track the last serialized state that was saved (or loaded) to skip no-op writes.
	const lastSavedRef = useRef('');

	// Track which sessionIds have already been written to sessions.json to avoid
	// redundant index reads on every save.
	const indexedSessionsRef = useRef<Set<string>>(new Set());

	// Load messages when documentId changes.
	useEffect(() => {
		if (!documentId) return;

		let cancelled = false;

		// Reset tracking state for this document.
		lastSavedRef.current = '';
		indexedSessionsRef.current = new Set();

		async function load(): Promise<void> {
			const docPath = await window.workspace.getDocumentPath(documentId!);
			const chatDir = `${docPath}/chat`;
			const indexPath = `${chatDir}/sessions.json`;

			// --- 1. Try to read the sessions index ---
			let index: ChatSessionIndex | null = null;
			try {
				const raw = await window.workspace.readFile({ filePath: indexPath });
				index = JSON.parse(raw) as ChatSessionIndex;
			} catch {
				// Index does not exist yet — check for legacy messages.json
			}

			if (cancelled) return;

			// Skip load if Redux already has live in-flight messages
			if (messagesRef.current.length > 0) {
				const sid = sessionIdRef.current;
				if (sid) lastSavedRef.current = JSON.stringify(messagesRef.current);
				return;
			}

			// --- 2. Migration: legacy messages.json → new format ---
			if (!index) {
				const legacyPath = `${chatDir}/messages.json`;
				let legacyRaw: string | null = null;
				try {
					legacyRaw = await window.workspace.readFile({ filePath: legacyPath });
				} catch {
					// No legacy file either — fresh document, nothing to load
				}

				if (legacyRaw) {
					const legacy = JSON.parse(legacyRaw) as ChatMessagesFile;
					const newSessionId = crypto.randomUUID();
					const createdAt = new Date().toISOString();
					const sessionFile: ChatSessionFile = {
						version: 2,
						sessionId: newSessionId,
						createdAt,
						messages: sanitizeLoadedMessages(legacy.messages ?? []),
					};
					const newIndex: ChatSessionIndex = {
						version: 1,
						sessions: [{ sessionId: newSessionId, createdAt }],
					};

					await window.workspace.writeFile({
						filePath: `${chatDir}/${newSessionId}.json`,
						content: JSON.stringify(sessionFile, null, 2),
						createParents: true,
					});
					await window.workspace.writeFile({
						filePath: indexPath,
						content: JSON.stringify(newIndex, null, 2),
						createParents: true,
					});
					// Leave messages.json in place as backup — do not delete

					if (cancelled) return;

					indexedSessionsRef.current.add(newSessionId);
					lastSavedRef.current = JSON.stringify(sessionFile.messages);
					reduxDispatch(
						chatMessagesLoaded({
							documentId: documentId!,
							messages: sessionFile.messages,
							sessionId: newSessionId,
						})
					);
					reduxDispatch(chatSessionStarted({ documentId: documentId!, sessionId: newSessionId }));
				}
				return;
			}

			// --- 3. Load most recent session from index ---
			const sorted = [...index.sessions].sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
			const latest = sorted[0];
			if (!latest) return;

			try {
				const sessionPath = `${chatDir}/${latest.sessionId}.json`;
				const raw = await window.workspace.readFile({ filePath: sessionPath });

				if (cancelled) return;

				const sessionFile = JSON.parse(raw) as ChatSessionFile;
				const messages = sanitizeLoadedMessages(sessionFile.messages ?? []);
				lastSavedRef.current = JSON.stringify(messages);

				reduxDispatch(
					chatMessagesLoaded({
						documentId: documentId!,
						messages,
						sessionId: latest.sessionId,
					})
				);
			} catch {
				// Session file corrupt or missing — start fresh
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [documentId, reduxDispatch]);

	// Debounced save — recreated whenever documentId changes so the closure is
	// always bound to the correct document.
	const debouncedSave = useMemo(
		() =>
			debounce(
				async () => {
					if (!documentId) return;

					const sid = sessionIdRef.current;
					if (!sid) return; // no active session, nothing to save

					const messages = messagesRef.current;
					if (messages.length === 0 && lastSavedRef.current === '') return;

					const serialized = JSON.stringify(messages);
					if (serialized === lastSavedRef.current) return;

					const docPath = await window.workspace.getDocumentPath(documentId);
					const chatDir = `${docPath}/chat`;

					// Write session file
					const sessionFile: ChatSessionFile = {
						version: 2,
						sessionId: sid,
						createdAt: new Date().toISOString(),
						messages,
					};

					try {
						await window.workspace.writeFile({
							filePath: `${chatDir}/${sid}.json`,
							content: JSON.stringify(sessionFile, null, 2),
							createParents: true,
						});
						lastSavedRef.current = serialized;
					} catch {
						// Write failure is non-fatal — will retry on next change.
						return;
					}

					// Append to sessions.json index if this sessionId is new
					if (!indexedSessionsRef.current.has(sid)) {
						try {
							let index: ChatSessionIndex = { version: 1, sessions: [] };
							try {
								const raw = await window.workspace.readFile({
									filePath: `${chatDir}/sessions.json`,
								});
								index = JSON.parse(raw) as ChatSessionIndex;
							} catch {
								// index doesn't exist yet
							}

							const alreadyIndexed = index.sessions.some((e) => e.sessionId === sid);
							if (!alreadyIndexed) {
								const updated: ChatSessionIndex = {
									...index,
									sessions: [
										...index.sessions,
										{ sessionId: sid, createdAt: sessionFile.createdAt },
									],
								};
								await window.workspace.writeFile({
									filePath: `${chatDir}/sessions.json`,
									content: JSON.stringify(updated, null, 2),
									createParents: true,
								});
							}
							indexedSessionsRef.current.add(sid);
						} catch {
							// Index update failure is non-fatal
						}
					}
				},
				SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[documentId]
	);

	// Trigger debounced save whenever chatMessages changes.
	useEffect(() => {
		debouncedSave();
	}, [chatMessages, debouncedSave]);

	// Cancel debounce timer on unmount to avoid writes to a stale documentId.
	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	// Expose flush so callers can force an immediate write (e.g., before navigation).
	return debouncedSave.flush;
}
