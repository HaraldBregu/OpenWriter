import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import { getTaskStatusText } from '../../../../../../shared/task-metadata';
import {
	initTaskMetadata,
	subscribeToTask,
	type TaskSnapshot,
} from '../../../../services/task-event-bus';
import { Header, Input, Message } from './components';
import { useDocumentState } from '../../hooks';
import { useChatState, useChatDispatch } from './hooks';
import { ChatProvider } from './Provider';

type ResearcherTaskData = {
	prompt: string;
};

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
	const { documentId } = useDocumentState();
	const { messages: chatMessages, sessionId, activeTaskId, activeMessageId } = useChatState();
	const bottomRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef(chatMessages);
	const lastRecordedTaskStateRef = useRef<string | null>(null);
	const isRunning = activeMessageId !== null || activeTaskId !== null;

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
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
			<Header />

			<div
				className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
				role="log"
				aria-label={t('agenticPanel.messagesRegion', 'Chat messages')}
				aria-live="polite"
				aria-busy={isRunning}
			>
				{chatMessages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
							<Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t('agenticPanel.emptyTitle', 'Ask the researcher')}
							</p>
							<p className="text-xs text-muted-foreground">
								{t(
									'agenticPanel.emptyDescription',
									'Use it to gather context, facts, summaries, and writing directions.'
								)}
							</p>
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
									className={index === 0 ? undefined : isGroupedWithPrevious ? 'mt-2' : 'mt-6'}
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
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Ask the researcher for context, facts, or ideas'
				)}
			/>
		</div>
	);
};

const ChatPanel: React.FC = () => (
	<ChatProvider>
		<Chat />
	</ChatProvider>
);

export default ChatPanel;
