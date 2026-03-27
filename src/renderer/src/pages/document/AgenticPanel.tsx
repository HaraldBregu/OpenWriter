import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { getTaskSnapshot, subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

interface ChatMessageData {
	id: string;
	content: string;
	role: 'user' | 'assistant';
	timestamp: Date;
}

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
	const [messages, setMessages] = useState<ChatMessageData[]>([]);
	const bottomRef = useRef<HTMLDivElement>(null);
	const activeAssistantMessageIdRef = useRef<string | null>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const updateActiveAssistantMessage = useCallback(
		(content: string | ((previousContent: string) => string)) => {
			const activeId = activeAssistantMessageIdRef.current;
			if (!activeId) return;

			setMessages((prev) =>
				prev.map((message) => {
					if (message.id !== activeId) {
						return message;
					}

					return {
						...message,
						content:
							typeof content === 'function' ? content(message.content) : content,
					};
				})
			);
		},
		[]
	);

	useEffect(() => {
		if (!taskId) return;

		const currentSnapshot = getTaskSnapshot(taskId);

		if (!activeAssistantMessageIdRef.current && (isRunning || currentSnapshot)) {
			const assistantMessageId = crypto.randomUUID();
			activeAssistantMessageIdRef.current = assistantMessageId;
			setMessages((prev) => [
				...prev,
				{
					id: assistantMessageId,
					content: '',
					role: 'assistant',
					timestamp: new Date(),
				},
			]);
		}

		const unsubscribe = subscribeToTask(taskId, (snapshot: TaskSnapshot) => {
			switch (snapshot.status) {
				case 'queued':
				case 'started':
					updateActiveAssistantMessage((previousContent) =>
						previousContent.trim().length > 0
							? previousContent
							: t('agenticPanel.researcherThinking', 'Researching...')
					);
					break;
				case 'running':
					if (snapshot.content) {
						updateActiveAssistantMessage(snapshot.content);
					}
					break;
				case 'completed': {
					const output = snapshot.result as ResearcherTaskOutput | undefined;
					updateActiveAssistantMessage(
						output?.content ||
							snapshot.content ||
							t('agenticPanel.emptyResponse', 'No response received.')
					);
					activeAssistantMessageIdRef.current = null;
					break;
				}
				case 'error':
					updateActiveAssistantMessage(
						snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.')
					);
					activeAssistantMessageIdRef.current = null;
					break;
				case 'cancelled':
					updateActiveAssistantMessage(
						t('agenticPanel.cancelled', 'The researcher request was cancelled.')
					);
					activeAssistantMessageIdRef.current = null;
					break;
			}
		});

		return unsubscribe;
	}, [isRunning, taskId, t, updateActiveAssistantMessage]);

	const handleSend = useCallback(
		(content: string) => {
			if (isRunning) return;

			const userMessage: ChatMessageData = {
				id: crypto.randomUUID(),
				content,
				role: 'user',
				timestamp: new Date(),
			};

			const assistantMessageId = crypto.randomUUID();
			activeAssistantMessageIdRef.current = assistantMessageId;

			const assistantMessage: ChatMessageData = {
				id: assistantMessageId,
				content: '',
				role: 'assistant',
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);
			void onSend(content);
		},
		[isRunning, onSend]
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
				{messages.length === 0 ? (
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
						{messages.map((msg) => (
							<ChatMessage
								key={msg.id}
								id={msg.id}
								content={msg.content}
								role={msg.role}
								timestamp={msg.timestamp}
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
