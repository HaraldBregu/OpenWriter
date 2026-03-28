import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Search } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { useDocumentState } from './hooks';
import { useAppDispatch, useAppSelector } from '../../store';
import {
	chatMessageAdded,
	chatActiveTaskSet,
	chatActiveMessageSet,
	chatSessionStarted,
	selectChatMessages,
	selectChatSessionId,
} from '../../store/chat';

interface AgenticPanelProps {
	readonly taskId: string | null;
	readonly isRunning: boolean;
	readonly onSend: (content: string) => Promise<void> | void;
}

const AgenticPanel: React.FC<AgenticPanelProps> = ({ isRunning, onSend }) => {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const { documentId } = useDocumentState();
	const chatMessages = useAppSelector((state) => selectChatMessages(state, documentId));
	const sessionId = useAppSelector((state) => selectChatSessionId(state, documentId));
	const bottomRef = useRef<HTMLDivElement>(null);
	const chatHistory = useMemo(
		() =>
			chatMessages
				.filter((message) => message.role === 'user')
				.slice()
				.reverse(),
		[chatMessages]
	);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	const handleSend = useCallback(
		(content: string) => {
			if (!documentId || isRunning) return;

			const userMessageId = crypto.randomUUID();
			const assistantMessageId = crypto.randomUUID();
			const timestamp = new Date().toISOString();

			dispatch(
				chatMessageAdded({
					documentId,
					message: {
						id: userMessageId,
						content,
						role: 'user',
						timestamp,
						taskId: null,
						status: 'completed',
					},
				})
			);

			dispatch(
				chatMessageAdded({
					documentId,
					message: {
						id: assistantMessageId,
						content: '',
						role: 'assistant',
						timestamp,
						taskId: null,
						status: 'idle',
					},
				})
			);

			dispatch(chatActiveMessageSet({ documentId, messageId: assistantMessageId }));
			dispatch(chatActiveTaskSet({ documentId, taskId: null }));

			void onSend(content);
		},
		[dispatch, documentId, isRunning, onSend]
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
			<div className="border-b border-border bg-muted/20 px-4 py-3">
				<div className="mb-2 flex items-center gap-2">
					<History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
					<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{t('agenticPanel.historyTitle', 'Previous chats')}
					</h3>
				</div>
				{chatHistory.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						{t('agenticPanel.historyEmpty', 'No previous chats yet')}
					</p>
				) : (
					<ul className="max-h-28 space-y-1 overflow-y-auto pr-1">
						{chatHistory.map((message) => (
							<li key={`history-${message.id}`} className="rounded-md border bg-background px-2 py-1.5">
								<p className="truncate text-xs text-foreground">{message.content}</p>
								<p className="mt-0.5 text-[11px] text-muted-foreground">
									{new Date(message.timestamp).toLocaleString()}
								</p>
							</li>
						))}
					</ul>
				)}
			</div>

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
