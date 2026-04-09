import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';
import { v7 as uuidv7 } from 'uuid';
import { getTaskStatusText } from '../../../../../../shared/types';
import {
	initTaskMetadata,
	subscribeToTask,
	type TaskSnapshot,
} from '../../../../services/task-event-bus';
import { Header, Input, Message } from './components';
import { useDocumentState } from '../../hooks';
import { useEditorInstance } from '../../providers';
import { useChatState, useChatDispatch, useChatPersistence } from './hooks';
import { ChatProvider } from './Provider';
import { buildTaskPrompt, getSelectedEditorText, mapTaskStatusToChatStatus } from './shared';
import type { AssistantTaskData } from './shared';

const Chat: React.FC = () => {
	const { t } = useTranslation();
	const dispatch = useChatDispatch();
	const { documentId, selection } = useDocumentState();
	const { editor } = useEditorInstance();
	const { messages: chatMessages, sessionId, activeTaskId, activeMessageId } = useChatState();
	const bottomRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef(chatMessages);
	const lastRecordedTaskStateRef = useRef<string | null>(null);
	const isRunning = activeMessageId !== null || activeTaskId !== null;
	const hasSelectionRange = !!selection && selection.from !== selection.to;

	const selectionLabel = useMemo(() => {
		if (!selection || selection.from === selection.to) return null;
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
								snapshot.error || t('agenticPanel.error', 'The assistant failed to respond.'),
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
							content: t('agenticPanel.cancelled', 'The assistant request was cancelled.'),
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
			const selectedText = getSelectedEditorText(editor, selection);
			const taskPrompt = buildTaskPrompt(content, selectedText);

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

			const taskType = 'agent-assistant';
			const taskInput: AssistantTaskData = { prompt: taskPrompt };
			const metadata = {
				agentId: 'assistant',
				...(documentId ? { documentId } : {}),
				...(resolvedSessionId ? { chatId: resolvedSessionId } : {}),
			};

			if (typeof window.task?.submit !== 'function') {
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
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
								t('agenticPanel.error', 'The assistant failed to respond.'),
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
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
			}
		},
		[dispatch, documentId, editor, isRunning, selection, sessionId, t]
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
								<Bot
									className="h-5 w-5 text-foreground/70 dark:text-foreground/95"
									aria-hidden="true"
								/>
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium text-foreground">
									{t('agenticPanel.emptyTitle', 'Ask the assistant')}
								</p>
								<p className="text-xs leading-5 text-foreground/68 dark:text-muted-foreground/90">
									{t(
										'agenticPanel.emptyDescription',
										'Use it for writing, editing, research, conversation, and image ideas.'
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
				)}
			</div>

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
