import React, {
	useRef,
	useEffect,
	useCallback,
	useState,
	useMemo,
	type Dispatch,
	type MutableRefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';
import { debounce } from 'lodash';
import { v7 as uuidv7 } from 'uuid';
import { getTaskStatusText } from '../../../../../../shared/task-metadata';
import {
	initTaskMetadata,
	subscribeToTask,
	type TaskSnapshot,
} from '../../../../services/task-event-bus';
import { Header, Input, Message } from './components';
import { useDocumentDispatch, useDocumentState } from '../../hooks';
import type { DocumentAction } from '../../context/actions';
import { useEditorInstance } from '../../providers';
import {
	formatRelativeTime,
	syncChatSessionsFromDisk,
	titleFromMessages,
} from '../../services/chat-session-storage';
import { useChatState, useChatDispatch } from './hooks';
import { ChatProvider } from './Provider';
import type {
	ChatAction,
	ChatMessagesFile,
	ChatSessionFile,
	ChatSessionListItem,
	DocumentChatMessage,
} from './context';

type ResearcherTaskData = {
	prompt: string;
};

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((msg) =>
		INTERRUPTED_STATUSES.has(msg.status)
			? { ...msg, status: 'error' as const, content: msg.content || 'Session interrupted' }
			: msg
	);
}

function createdAtFromSessionId(sessionId: string, fallback: string): string {
	try {
		const msBits = sessionId.replace(/-/g, '').slice(0, 12);
		const ms = parseInt(msBits, 16);
		if (ms > 0) return new Date(ms).toISOString();
	} catch {
		// ignore
	}
	return fallback;
}

function useChatPersistence(documentId: string | undefined): () => void {
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

function mapTaskStatusToChatStatus(
	status: TaskSnapshot['status']
): 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled' {
	switch (status) {
		case 'queued':
		case 'started':
			return 'queued';
		case 'running':
			return 'running';
		case 'completed':
			return 'completed';
		case 'error':
			return 'error';
		case 'cancelled':
			return 'cancelled';
		default:
			return 'running';
	}
}

const Chat: React.FC = () => {
	const { t } = useTranslation();
	const dispatch = useChatDispatch();
	const [selectedAgentId, setSelectedAgentId] = useState('researcher');
	const { documentId, selection } = useDocumentState();
	const { editor } = useEditorInstance();
	const { messages: chatMessages, sessionId, activeTaskId, activeMessageId } = useChatState();
	const bottomRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef(chatMessages);
	const lastRecordedTaskStateRef = useRef<string | null>(null);
	const isRunning = activeMessageId !== null || activeTaskId !== null;
	const hasSelectionRange = !!selection && selection.from !== selection.to;

	const selectionLabel = useMemo(() => {
		if (!selection) return null;
		if (selection.from === selection.to) {
			return `Cursor ${selection.from}`;
		}
		return `Selection ${selection.from}-${selection.to}`;
	}, [selection]);

	const handleClearSelection = useCallback(() => {
		if (!editor || editor.isDestroyed || !selection || selection.from === selection.to) return;

		const docSize = editor.state.doc.content.size;
		const collapsePos = Math.max(0, Math.min(selection.to, docSize));
		const nextSelection = TextSelection.near(editor.state.doc.resolve(collapsePos), -1);
		const tr = editor.state.tr.setSelection(nextSelection).scrollIntoView();
		editor.view.dispatch(tr);
		editor.view.focus();
	}, [editor, selection]);

	messagesRef.current = chatMessages;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	useEffect(() => {
		if (!documentId || !activeTaskId || !activeMessageId) return;

		lastRecordedTaskStateRef.current = null;

		const unsubscribe = subscribeToTask(activeTaskId, (snapshot: TaskSnapshot) => {
			const metadataDocumentId = snapshot.metadata?.documentId;
			const targetDocumentId =
				typeof metadataDocumentId === 'string' && metadataDocumentId.length > 0
					? metadataDocumentId
					: documentId;

			if (targetDocumentId !== documentId) return;
			const taskStatusText = getTaskStatusText(snapshot.metadata);

			if (taskStatusText) {
				const chatStatus = mapTaskStatusToChatStatus(snapshot.status);
				const dedupeKey = `${snapshot.status}:${taskStatusText}`;
				const alreadyRecorded = messagesRef.current.some(
					(message) =>
						message.role === 'system' &&
						message.taskId === activeTaskId &&
						message.content === taskStatusText &&
						message.status === chatStatus
				);

				if (alreadyRecorded) {
					lastRecordedTaskStateRef.current = dedupeKey;
				} else if (lastRecordedTaskStateRef.current !== dedupeKey) {
					lastRecordedTaskStateRef.current = dedupeKey;
					dispatch({
						type: 'CHAT_MESSAGE_INSERTED_BEFORE',
						beforeId: activeMessageId,
						message: {
							id: crypto.randomUUID(),
							content: taskStatusText,
							role: 'system',
							timestamp: new Date().toISOString(),
							taskId: activeTaskId,
							status: chatStatus,
						},
					});
				}
			}

			switch (snapshot.status) {
				case 'queued':
				case 'started':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							taskId: activeTaskId,
							status: 'queued',
						},
					});
					break;
				case 'running':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							taskId: activeTaskId,
							status: 'running',
							...(snapshot.content ? { content: snapshot.content } : {}),
						},
					});
					break;
				case 'completed': {
					const output = snapshot.result as { content?: string } | undefined;
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content:
								output?.content ||
								snapshot.content ||
								t('agenticPanel.emptyResponse', 'No response received.'),
							taskId: activeTaskId,
							status: 'completed',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.'),
							taskId: activeTaskId,
							status: 'error',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The researcher request was cancelled.'),
							taskId: activeTaskId,
							status: 'cancelled',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				default:
					break;
			}
		});

		return () => {
			lastRecordedTaskStateRef.current = null;
			unsubscribe();
		};
	}, [activeMessageId, activeTaskId, dispatch, documentId, t]);

	const handleSend = useCallback(
		async (content: string) => {
			if (!documentId || isRunning) return;

			const resolvedSessionId = sessionId ?? uuidv7();

			if (!sessionId) {
				dispatch({ type: 'CHAT_SESSION_STARTED', sessionId: resolvedSessionId });
			}

			const userMessageId = crypto.randomUUID();
			const assistantMessageId = crypto.randomUUID();
			const timestamp = new Date().toISOString();

			dispatch({
				type: 'CHAT_MESSAGE_ADDED',
				message: {
					id: userMessageId,
					content,
					role: 'user',
					timestamp,
					taskId: null,
					status: 'completed',
				},
			});

			dispatch({
				type: 'CHAT_MESSAGE_ADDED',
				message: {
					id: assistantMessageId,
					content: '',
					role: 'assistant',
					timestamp,
					taskId: null,
					status: 'idle',
				},
			});

			dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: assistantMessageId });
			dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });

			const taskType = selectedAgentId === 'inventor' ? 'agent-text-writer' : 'agent-researcher';
			const taskInput: ResearcherTaskData = { prompt: content };
			const metadata = {
				agentId: selectedAgentId,
				...(documentId ? { documentId } : {}),
				...(resolvedSessionId ? { chatId: resolvedSessionId } : {}),
			};

			if (typeof window.task?.submit !== 'function') {
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The researcher failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
				return;
			}

			try {
				const ipcResult = await window.task.submit(taskType, taskInput, metadata);

				if (!ipcResult.success) {
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: assistantMessageId,
						patch: {
							content:
								ipcResult.error.message ||
								t('agenticPanel.error', 'The researcher failed to respond.'),
							status: 'error',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					return;
				}

				const resolvedTaskId = ipcResult.data.taskId;
				initTaskMetadata(resolvedTaskId, metadata);
				dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: resolvedTaskId });
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						taskId: resolvedTaskId,
						status: 'queued',
					},
				});
			} catch {
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The researcher failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
			}
		},
		[dispatch, documentId, isRunning, selectedAgentId, sessionId, t]
	);
	const latestSystemMessageId = [...chatMessages]
		.reverse()
		.find((entry) => entry.role === 'system')?.id;

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background dark:border-border/90 dark:bg-background">
			<Header />

			<div
				className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
				role="log"
				aria-label={t('agenticPanel.messagesRegion', 'Chat messages')}
				aria-live="polite"
				aria-busy={isRunning}
			>
				{chatMessages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center px-6 text-center">
						<div className="flex max-w-xs flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-border/85 bg-card/82 px-6 py-8 shadow-none dark:border-border/90 dark:bg-card/75">
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/82 dark:bg-accent/95">
								<Search className="h-5 w-5 text-foreground/70 dark:text-foreground/95" aria-hidden="true" />
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium text-foreground">
									{t('agenticPanel.emptyTitle', 'Ask the researcher')}
								</p>
								<p className="text-xs leading-5 text-foreground/68 dark:text-muted-foreground/90">
									{t(
										'agenticPanel.emptyDescription',
										'Use it to gather context, facts, summaries, and writing directions.'
									)}
								</p>
							</div>
						</div>
					</div>
				) : (
					<div className="flex flex-col">
						{chatMessages.map((message, index) => {
							const previousMessage = index > 0 ? chatMessages[index - 1] : null;
							const isGroupedWithPrevious =
								previousMessage !== null &&
								previousMessage.role !== 'user' &&
								message.role !== 'user';
							const showStatusLoader =
								message.role === 'system' &&
								message.id === latestSystemMessageId &&
								message.status !== 'completed';

							return (
								<div
									key={message.id}
									className={index === 0 ? undefined : isGroupedWithPrevious ? 'mt-2' : 'mt-4'}
								>
									<Message
										id={message.id}
										content={message.content}
										role={message.role}
										taskId={message.taskId}
										timestamp={message.timestamp}
										status={message.status}
										renderMarkdown={message.role === 'assistant'}
										showStatusLoader={showStatusLoader}
									/>
								</div>
							);
						})}
						<div ref={bottomRef} />
					</div>
				)}
			</div>

			<Input
				onSend={handleSend}
				disabled={isRunning}
				agentOptions={[
					{ id: 'researcher', label: t('agenticPanel.researcherLabel', 'Researcher') },
					{ id: 'inventor', label: t('agenticPanel.inventorLabel', 'Inventor') },
				]}
				selectedAgentId={selectedAgentId}
				onAgentChange={setSelectedAgentId}
				selectionLabel={selectionLabel}
				canClearSelection={hasSelectionRange}
				onClearSelection={handleClearSelection}
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Ask the researcher for context, facts, or ideas'
				)}
			/>
		</div>
	);
};

const ChatPanel: React.FC = () => {
	const { documentId } = useDocumentState();
	useChatPersistence(documentId);

	return (
		<ChatProvider>
			<Chat />
		</ChatProvider>
	);
};

export default ChatPanel;
