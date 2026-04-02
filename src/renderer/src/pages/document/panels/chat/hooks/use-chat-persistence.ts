import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, type Dispatch, type MutableRefObject } from 'react';
import { v7 as uuidv7 } from 'uuid';
import type { DocumentAction } from '../../../context/actions';
import { useDocumentDispatch, useDocumentState } from '../../../hooks';
import {
	formatRelativeTime,
	syncChatSessionsFromDisk,
	titleFromMessages,
} from '../../../services/chat-session-storage';
import type { ChatAction } from '../context/actions';
import {
	createdAtFromSessionId,
	sanitizeLoadedMessages,
	type ChatMessagesFile,
	type ChatSessionFile,
	type ChatSessionListItem,
	type DocumentChatMessage,
} from '../shared';

const SAVE_DEBOUNCE_MS = 500;

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

async function migrateAndLoad(options: MigrateOptions): Promise<void> {
	const {
		docPath,
		chatsDir,
		cancelled,
		chatDispatch,
		docDispatchRef,
		knownSessionsRef,
		lastSavedRef,
		sessionsListRef,
	} = options;

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
		// No old session-index.json; fall through to the single-file legacy layout.
	}

	if (!legacyMessages) {
		try {
			const raw = await window.workspace.readFile({
				filePath: `${oldChatDir}/messages.json`,
			});
			const legacy = JSON.parse(raw) as ChatMessagesFile;
			legacyMessages = legacy.messages ?? [];
		} catch {
			// No legacy messages file either.
		}
	}

	if (!legacyMessages || cancelled()) {
		return;
	}

	const newSessionId = uuidv7();
	const createdAt = createdAtFromSessionId(newSessionId, new Date().toISOString());
	const sanitizedMessages = sanitizeLoadedMessages(legacyMessages);

	const sessionFile: ChatSessionFile = {
		version: 2,
		sessionId: newSessionId,
		createdAt,
		messages: sanitizedMessages,
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

	if (cancelled()) {
		return;
	}

	knownSessionsRef.current.add(newSessionId);
	lastSavedRef.current = JSON.stringify(sanitizedMessages);

	chatDispatch({
		type: 'CHAT_MESSAGES_LOADED',
		messages: sanitizedMessages,
		sessionId: newSessionId,
	});

	const sessionItem: ChatSessionListItem = {
		id: newSessionId,
		title: titleFromMessages(sanitizedMessages, 'Untitled'),
		ageLabel: formatRelativeTime(createdAt),
		createdAt,
	};

	sessionsListRef.current = [sessionItem];
	docDispatchRef.current({
		type: 'CHAT_SESSIONS_LOADED',
		sessions: [sessionItem],
	});
}

export function useChatPersistence(documentId: string | undefined): () => void {
	const documentDispatch = useDocumentDispatch();
	const { chat, chatSessions } = useDocumentState();
	const chatDispatch = documentDispatch as Dispatch<DocumentAction>;
	const { messages: chatMessages, sessionId } = chat;

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	const sessionIdRef = useRef<string | null>(null);
	sessionIdRef.current = sessionId;

	const documentDispatchRef = useRef(documentDispatch);
	documentDispatchRef.current = documentDispatch;

	const sessionsListRef = useRef<ChatSessionListItem[]>([]);
	const lastSavedRef = useRef('');
	const knownSessionsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		sessionsListRef.current = chatSessions;
	}, [chatSessions]);

	useEffect(() => {
		if (!documentId) {
			return;
		}

		let cancelled = false;
		const currentDocumentId = documentId;

		lastSavedRef.current = '';
		knownSessionsRef.current = new Set();
		sessionsListRef.current = [];

		async function load(): Promise<void> {
			const docPath = await window.workspace.getDocumentPath(currentDocumentId);

			if (messagesRef.current.length > 0) {
				try {
					const synced = await syncChatSessionsFromDisk(docPath);
					if (!cancelled && synced) {
						sessionsListRef.current = synced.sessionItems;
						documentDispatchRef.current({
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

				const currentSessionId = sessionIdRef.current;
				if (currentSessionId) {
					lastSavedRef.current = JSON.stringify(messagesRef.current);
				}
				return;
			}

			const synced = await syncChatSessionsFromDisk(docPath);

			if (cancelled) {
				return;
			}

			if (!synced) {
				await migrateAndLoad({
					docPath,
					chatsDir: `${docPath}/chats`,
					cancelled: () => cancelled,
					chatDispatch,
					docDispatchRef: documentDispatchRef,
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
			documentDispatchRef.current({
				type: 'CHAT_SESSIONS_LOADED',
				sessions: synced.sessionItems,
			});
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
					if (!documentId) {
						return;
					}
					const currentDocumentId = documentId;

					const currentSessionId = sessionIdRef.current;
					if (!currentSessionId) {
						return;
					}

					const messages = messagesRef.current;
					if (messages.length === 0 && lastSavedRef.current === '') {
						return;
					}

					const serialized = JSON.stringify(messages);
					if (serialized === lastSavedRef.current) {
						return;
					}

					const docPath = await window.workspace.getDocumentPath(currentDocumentId);
					const sessionFilePath = `${docPath}/chats/${currentSessionId}/messages.json`;
					const createdAt = createdAtFromSessionId(
						currentSessionId,
						new Date().toISOString()
					);

					const sessionFile: ChatSessionFile = {
						version: 2,
						sessionId: currentSessionId,
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

					if (!knownSessionsRef.current.has(currentSessionId)) {
						knownSessionsRef.current.add(currentSessionId);

						const newItem: ChatSessionListItem = {
							id: currentSessionId,
							title: titleFromMessages(messages, 'Untitled'),
							ageLabel: formatRelativeTime(createdAt),
							createdAt,
						};
						const updatedList = [
							newItem,
							...sessionsListRef.current.filter((item) => item.id !== currentSessionId),
						];
						sessionsListRef.current = updatedList;
						documentDispatchRef.current({
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
