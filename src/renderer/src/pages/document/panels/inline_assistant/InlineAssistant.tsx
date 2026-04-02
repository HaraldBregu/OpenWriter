import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TextSelection } from '@tiptap/pm/state';
import { RotateCcw } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import { getTaskStatusText } from '../../../../../../shared/types';
import {
	initTaskMetadata,
	subscribeToTask,
	type TaskSnapshot,
} from '../../../../services/task-event-bus';
import {
	buildTaskPrompt,
	getSelectedEditorText,
	mapTaskStatusToChatStatus,
} from '../chat/shared';
import type { AssistantTaskData, DocumentChatMessage } from '../chat/shared';
import { useDocumentState } from '../../hooks';
import { useEditorInstance } from '../../providers';
import { Input, Message } from '../chat/components';

type State = {
	messages: DocumentChatMessage[];
	activeTaskId: string | null;
	activeMessageId: string | null;
	sessionId: string | null;
};

type Action =
	| { type: 'MESSAGE_ADDED'; message: DocumentChatMessage }
	| { type: 'MESSAGE_INSERTED_BEFORE'; beforeId: string; message: DocumentChatMessage }
	| { type: 'MESSAGE_UPDATED'; id: string; patch: Partial<DocumentChatMessage> }
	| { type: 'ACTIVE_TASK_SET'; taskId: string | null }
	| { type: 'ACTIVE_MESSAGE_SET'; messageId: string | null }
	| { type: 'SESSION_STARTED'; sessionId: string }
	| { type: 'RESET' };

const INITIAL_STATE: State = {
	messages: [],
	activeTaskId: null,
	activeMessageId: null,
	sessionId: null,
};

function stateReducer(state: State, action: Action): State {
	switch (action.type) {
		case 'MESSAGE_ADDED':
			return { ...state, messages: [...state.messages, action.message] };
		case 'MESSAGE_INSERTED_BEFORE': {
			const index = state.messages.findIndex((m) => m.id === action.beforeId);
			if (index === -1) {
				return { ...state, messages: [...state.messages, action.message] };
			}
			const next = [...state.messages];
			next.splice(index, 0, action.message);
			return { ...state, messages: next };
		}
		case 'MESSAGE_UPDATED':
			return {
				...state,
				messages: state.messages.map((m) =>
					m.id === action.id ? { ...m, ...action.patch } : m
				),
			};
		case 'ACTIVE_TASK_SET':
			return { ...state, activeTaskId: action.taskId };
		case 'ACTIVE_MESSAGE_SET':
			return { ...state, activeMessageId: action.messageId };
		case 'SESSION_STARTED':
			return { ...state, sessionId: action.sessionId };
		case 'RESET':
			return INITIAL_STATE;
		default:
			return state;
	}
}

const InlineAssistant: React.FC = () => {
	const { t } = useTranslation();
	const { documentId, selection } = useDocumentState();
	const { editor } = useEditorInstance();
	const [state, dispatch] = useReducer(stateReducer, INITIAL_STATE);
	const { messages, activeTaskId, activeMessageId, sessionId } = state;

	const messagesRef = useRef(messages);
	const lastRecordedTaskStateRef = useRef<string | null>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const isRunning = activeMessageId !== null || activeTaskId !== null;
	const hasSelectionRange = !!selection && selection.from !== selection.to;

	messagesRef.current = messages;

	const selectionLabel = useMemo(() => {
		if (!selection) return null;
		if (selection.from === selection.to) return `Position ${selection.from}`;
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

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

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
						type: 'MESSAGE_INSERTED_BEFORE',
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
						type: 'MESSAGE_UPDATED',
						id: activeMessageId,
						patch: { taskId: activeTaskId, status: 'queued' },
					});
					break;
				case 'running':
					dispatch({
						type: 'MESSAGE_UPDATED',
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
						type: 'MESSAGE_UPDATED',
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
					dispatch({ type: 'ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					dispatch({
						type: 'MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The assistant failed to respond.'),
							taskId: activeTaskId,
							status: 'error',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					dispatch({
						type: 'MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The assistant request was cancelled.'),
							taskId: activeTaskId,
							status: 'cancelled',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
					break;
				default:
					break;
			}
		});

		return () => {
			lastRecordedTaskStateRef.current = null;
			unsubscribe();
		};
	}, [activeMessageId, activeTaskId, documentId, t]);

	const handleSend = useCallback(
		async (content: string) => {
			if (!documentId || isRunning) return;

			const resolvedSessionId = sessionId ?? uuidv7();
			const selectedText = getSelectedEditorText(editor, selection);
			const taskPrompt = buildTaskPrompt(content, selectedText);

			if (!sessionId) {
				dispatch({ type: 'SESSION_STARTED', sessionId: resolvedSessionId });
			}

			const userMessageId = crypto.randomUUID();
			const assistantMessageId = crypto.randomUUID();
			const timestamp = new Date().toISOString();

			dispatch({
				type: 'MESSAGE_ADDED',
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
				type: 'MESSAGE_ADDED',
				message: {
					id: assistantMessageId,
					content: '',
					role: 'assistant',
					timestamp,
					taskId: null,
					status: 'idle',
				},
			});

			dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: assistantMessageId });
			dispatch({ type: 'ACTIVE_TASK_SET', taskId: null });

			if (typeof window.task?.submit !== 'function') {
				dispatch({
					type: 'MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
				return;
			}

			try {
				const taskType = 'agent-assistant';
				const taskInput: AssistantTaskData = { prompt: taskPrompt };
				const metadata = {
					agentId: 'assistant',
					...(documentId ? { documentId } : {}),
					...(resolvedSessionId ? { chatId: resolvedSessionId } : {}),
				};

				const ipcResult = await window.task.submit(taskType, taskInput, metadata);

				if (!ipcResult.success) {
					dispatch({
						type: 'MESSAGE_UPDATED',
						id: assistantMessageId,
						patch: {
							content:
								ipcResult.error.message ||
								t('agenticPanel.error', 'The assistant failed to respond.'),
							status: 'error',
						},
					});
					dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
					return;
				}

				const resolvedTaskId = ipcResult.data.taskId;
				initTaskMetadata(resolvedTaskId, metadata);
				dispatch({ type: 'ACTIVE_TASK_SET', taskId: resolvedTaskId });
				dispatch({
					type: 'MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: { taskId: resolvedTaskId, status: 'queued' },
				});
			} catch {
				dispatch({
					type: 'MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'ACTIVE_MESSAGE_SET', messageId: null });
			}
		},
		[dispatch, documentId, editor, isRunning, selection, sessionId, t]
	);

	const handleReset = useCallback(() => {
		dispatch({ type: 'RESET' });
	}, []);

	const latestSystemMessageId = [...messages].reverse().find((m) => m.role === 'system')?.id;

	return (
		<div className="flex flex-col border-t border-border bg-background" style={{ maxHeight: '45%' }}>
			{messages.length > 0 && (
				<>
					<div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-1.5">
						<span className="text-xs font-medium text-muted-foreground">
							{t('inlineAssistant.title', 'Assistant')}
						</span>
						<button
							type="button"
							onClick={handleReset}
							disabled={isRunning}
							className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
							title={t('inlineAssistant.clearConversation', 'Clear conversation')}
							aria-label={t('inlineAssistant.clearConversation', 'Clear conversation')}
						>
							<RotateCcw className="h-3 w-3" aria-hidden="true" />
						</button>
					</div>

					<div
						className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
						role="log"
						aria-label={t('inlineAssistant.messagesRegion', 'Assistant messages')}
						aria-live="polite"
						aria-busy={isRunning}
					>
						<div className="flex flex-col">
							{messages.map((message, index) => {
								const previousMessage = index > 0 ? messages[index - 1] : null;
								const isGroupedWithPrevious =
									previousMessage !== null &&
									previousMessage.role !== 'user' &&
									message.role !== 'user';
								const isSystemGroupedWithPrevious =
									previousMessage !== null &&
									previousMessage.role === 'system' &&
									message.role === 'system';
								const showStatusLoader =
									message.role === 'system' &&
									message.id === latestSystemMessageId &&
									message.status !== 'completed';

								return (
									<div
										key={message.id}
										className={
											index === 0
												? undefined
												: isSystemGroupedWithPrevious
													? undefined
													: isGroupedWithPrevious
														? 'mt-2'
														: 'mt-4'
										}
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
					</div>
				</>
			)}

			<Input
				onSend={handleSend}
				disabled={isRunning}
				selectionLabel={selectionLabel}
				canClearSelection={hasSelectionRange}
				onClearSelection={handleClearSelection}
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Ask the assistant for help with writing, research, editing, or image prompts'
				)}
			/>
		</div>
	);
};

export { InlineAssistant };
