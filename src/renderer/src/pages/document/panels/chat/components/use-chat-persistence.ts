import { useEffect, useRef, useMemo, type Dispatch, type MutableRefObject } from 'react';
import { debounce } from 'lodash';
import { v7 as uuidv7 } from 'uuid';
import type {
	DocumentChatMessage,
	ChatMessagesFile,
	ChatSessionFile,
	ChatSessionListItem,
} from '../context';
import type { DocumentAction } from '../../../context/actions';
import { useDocumentDispatch } from '../../../hooks/use-document-dispatch';
import { useDocumentState } from '../../../hooks/use-document-state';
import {
	formatRelativeTime,
	syncChatSessionsFromDisk,
	titleFromMessages,
} from '../../../services/chat-session-storage';
import type { ChatAction } from '../context/actions';

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((msg) =>
		INTERRUPTED_STATUSES.has(msg.status)
			? { ...msg, status: 'error' as const, content: msg.content || 'Session interrupted' }
			: msg
	);
}

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

export function useChatPersistence(documentId: string | undefined): () => void {
	const docDispatch = useDocumentDispatch();
	const { chat, chatSessions } = useDocumentState();
	const chatDispatch = docDispatch as Dispatch<DocumentAction>;
	const { messages: chatMessages, sessionId } = chat;

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	const sessionIdRef = useRef<string | null>(null);
	sessionIdRef.current = sessionId;

	const docDispatchRef = useRef<Dispatch<DocumentAction>>(docDispatch);
	docDispatchRef.current = docDispatch;

	const sessionsListRef = useRef<ChatSessionListItem[]>([]);
	const lastSavedRef = useRef('');
	const knownSessionsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		sessionsListRef.current = chatSessions;
	}, [chatSessions]);

	useEffect(() => {
		if (!documentId) return;

		let cancelled = false;

		lastSavedRef.current = '';
		knownSessionsRef.current = new Set();
		sessionsListRef.current = [];

		async function load(): Promise<void> {
			const docPath = await window.workspace.getDocumentPath(documentId!);

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

			const synced = await syncChatSessionsFromDisk(docPath);

			if (cancelled) return;

			if (!synced) {
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

			for (const item of synced.sessionItems) {
				knownSessionsRef.current.add(item.id);
			}

			sessionsListRef.current = synced.sessionItems;
			docDispatchRef.current({ type: 'CHAT_SESSIONS_LOADED', sessions: synced.sessionItems });
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [documentId, chatDispatch]);

	const debouncedSave = useMemo(
		() =>
			debounce(
				async () => {
					if (!documentId) return;

					const sid = sessionIdRef.current;
					if (!sid) return;

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
						return;
					}

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

	try {
		await window.workspace.writeFile({
			filePath: `${chatsDir}/${newSessionId}/messages.json`,
			content: JSON.stringify(sessionFile, null, 2),
			createParents: true,
		});
	} catch {
		return;
	}

	if (cancelled()) return;

	knownSessionsRef.current.add(newSessionId);
	lastSavedRef.current = JSON.stringify(sanitized);

	chatDispatch({
		type: 'CHAT_MESSAGES_LOADED',
		messages: sanitized,
		sessionId: newSessionId,
	});

	const sessionItem: ChatSessionListItem = {
		id: newSessionId,
		title: titleFromMessages(sanitized, 'Untitled'),
		ageLabel: formatRelativeTime(createdAt),
		createdAt,
	};

	sessionsListRef.current = [sessionItem];
	docDispatchRef.current({
		type: 'CHAT_SESSIONS_LOADED',
		sessions: [sessionItem],
	});
}
