import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { getTaskSnapshot, subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { useDocumentDispatch, useDocumentState } from './hooks';

interface ResearcherTaskOutput {
	content: string;
	tokenCount: number;
	agentId: string;
}

interface AgenticPanelProps {
	readonly taskId: string | null;
	readonly isRunning: boolean;
	readonly onSend: (content: string) => Promise<void> | void;
}

const AgenticPanel: React.FC<AgenticPanelProps> = ({ taskId, isRunning, onSend }) => {
	const { t } = useTranslation();
	const dispatch = useDocumentDispatch();
	const { chatMessages, activeChatMessageId, documentId } = useDocumentState();
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	useEffect(() => {
		if (!taskId) return;

		const currentSnapshot = getTaskSnapshot(taskId);
		if (currentSnapshot?.metadata?.documentId && currentSnapshot.metadata.documentId !== documentId) {
			return;
		}

		dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId });

		const unsubscribe = subscribeToTask(taskId, (snapshot: TaskSnapshot) => {
			if (
				(snapshot.metadata?.documentId && snapshot.metadata.documentId !== documentId) ||
				!activeChatMessageId
			) {
				return;
			}

			switch (snapshot.status) {
				case 'queued':
				case 'started':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeChatMessageId,
						patch: {
							content: t('agenticPanel.researcherThinking', 'Researching...'),
							taskId,
							status: 'queued',
						},
					});
					break;
				case 'running':
					if (snapshot.content) {
						dispatch({
							type: 'CHAT_MESSAGE_UPDATED',
							id: activeChatMessageId,
							patch: {
								content: snapshot.content,
								taskId,
								status: 'running',
							},
						});
					}
					break;
				case 'completed': {
					const output = snapshot.result as ResearcherTaskOutput | undefined;
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeChatMessageId,
						patch: {
							content:
								output?.content ||
								snapshot.content ||
								t('agenticPanel.emptyResponse', 'No response received.'),
							taskId,
							status: 'completed',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeChatMessageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.'),
							taskId,
							status: 'error',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeChatMessageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The researcher request was cancelled.'),
							taskId,
							status: 'cancelled',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
			}
		});

		return unsubscribe;
	}, [activeChatMessageId, dispatch, documentId, taskId, t]);

	const handleSend = useCallback(
		(content: string) => {
			if (isRunning) return;

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

			void onSend(content);
		},
		[dispatch, isRunning, onSend]
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
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
					<div className="flex flex-col gap-4">
						{chatMessages.map((message) => (
							<ChatMessage
								key={message.id}
								id={message.id}
								content={message.content}
								role={message.role}
								timestamp={message.timestamp}
								renderMarkdown={message.role === 'assistant'}
							/>
						))}
						<div ref={bottomRef} />
					</div>
				)}
			</div>

			<ChatInput
				onSend={handleSend}
				disabled={isRunning}
				agentLabel={t('agenticPanel.researcherLabel', 'Researcher')}
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Ask the researcher for context, facts, or ideas'
				)}
			/>
		</div>
	);
};

export default AgenticPanel;
