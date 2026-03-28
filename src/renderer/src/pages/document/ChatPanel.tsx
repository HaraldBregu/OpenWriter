import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ChatHeader } from './components/ChatHeader';
import { useDocumentState } from './hooks';
import { useAppDispatch, useAppSelector } from '../../store';
import {
	chatMessageAdded,
	chatActiveTaskSet,
	chatActiveMessageSet,
	chatSessionStarted,
	selectChatMessages,
	selectChatSessionId,
	selectActiveChatTaskId,
	selectActiveChatMessageId,
} from '../../store/chat';

interface ChatPanelProps {
	readonly taskId: string | null;
	readonly isRunning: boolean;
	readonly onSend: (content: string, agentId: string) => Promise<void> | void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ taskId, isRunning, onSend }) => {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const [selectedAgentId, setSelectedAgentId] = useState('researcher');
	const { documentId } = useDocumentState();
	const chatMessages = useAppSelector((state) => selectChatMessages(state, documentId));
	const sessionId = useAppSelector((state) => selectChatSessionId(state, documentId));
	const activeTaskId = useAppSelector((state) => selectActiveChatTaskId(state, documentId));
	const activeMessageId = useAppSelector((state) => selectActiveChatMessageId(state, documentId));
	const bottomRef = useRef<HTMLDivElement>(null);
	const boundTaskKeyRef = useRef<string | null>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	useEffect(() => {
		if (!documentId || !taskId || !activeMessageId || activeTaskId === taskId) {
			if (!taskId || !activeMessageId) {
				boundTaskKeyRef.current = null;
			}
			return;
		}
		const key = `${documentId}:${activeMessageId}:${taskId}`;
		if (boundTaskKeyRef.current === key) return;
		boundTaskKeyRef.current = key;
		dispatch(chatActiveTaskSet({ documentId, taskId }));
	}, [activeMessageId, activeTaskId, dispatch, documentId, taskId]);

	const handleSend = useCallback(
		(content: string) => {
			if (!documentId || isRunning) return;

			if (!sessionId) {
				const newSessionId = uuidv7();
				dispatch(chatSessionStarted({ documentId, sessionId: newSessionId }));
			}

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

			void onSend(content, selectedAgentId);
		},
		[dispatch, documentId, isRunning, onSend, selectedAgentId, sessionId]
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
			<ChatHeader />

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
								status={message.status}
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

export default ChatPanel;
