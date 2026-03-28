import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, History, Search, Trash2 } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { useDocumentState } from './hooks';
import { useAppDispatch, useAppSelector } from '../../store';
import { AppButton, AppCollapsible, AppCollapsiblePanel, AppCollapsibleTrigger } from '@/components/app';
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

interface MockChatHistoryItem {
	id: string;
	createdAt: string;
}

function createMockHistory(): MockChatHistoryItem[] {
	const now = Date.now();
	return Array.from({ length: 7 }).map((_, index) => {
		const offsetMs = (index + 1) * 60 * 60 * 1000;
		const createdAt = new Date(now - offsetMs).toISOString();
		return { id: `mock-chat-${index + 1}`, createdAt };
	});
}

const AgenticPanel: React.FC<AgenticPanelProps> = ({ isRunning, onSend }) => {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const { documentId } = useDocumentState();
	const chatMessages = useAppSelector((state) => selectChatMessages(state, documentId));
	const sessionId = useAppSelector((state) => selectChatSessionId(state, documentId));
	const bottomRef = useRef<HTMLDivElement>(null);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [mockHistory, setMockHistory] = useState<MockChatHistoryItem[]>(() => createMockHistory());
	const [selectedMockHistoryId, setSelectedMockHistoryId] = useState<string | null>(null);
	const latestHistory = mockHistory[0] ?? null;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	const handleSend = useCallback(
		(content: string) => {
			if (!documentId || isRunning) return;

			if (!sessionId) {
				const newSessionId = crypto.randomUUID();
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

			void onSend(content);
		},
		[dispatch, documentId, isRunning, onSend, sessionId]
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
			<div className="border-b border-border px-3 py-2">
				<AppCollapsible open={historyOpen} onOpenChange={setHistoryOpen}>
					<AppCollapsibleTrigger className="w-full justify-between border-b border-border px-0 py-1.5 text-left">
						<div className="flex min-w-0 items-center gap-2">
							<History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							<div className="min-w-0">
								<p className="text-[11px] font-medium text-foreground">
									{t('agenticPanel.historyTitle', 'Previous chats')}
								</p>
								<p className="truncate text-[10px] text-muted-foreground">
									{latestHistory
										? `${t('agenticPanel.chatLabel', 'Chat')} ${new Date(latestHistory.createdAt).toLocaleString()}`
										: t('agenticPanel.historyEmpty', 'No previous chats yet')}
								</p>
							</div>
						</div>
						<ChevronDown
							className={`h-4 w-4 text-muted-foreground transition-transform ${
								historyOpen ? 'rotate-180' : ''
							}`}
							aria-hidden="true"
						/>
					</AppCollapsibleTrigger>

					<AppCollapsiblePanel className="mt-1">
						{mockHistory.length === 0 ? (
							<p className="px-0 text-[10px] text-muted-foreground">
								{t('agenticPanel.historyEmpty', 'No previous chats yet')}
							</p>
						) : (
							<ul className="max-h-32 overflow-y-auto">
								{mockHistory.map((entry) => {
									const label = `${t('agenticPanel.chatLabel', 'Chat')} ${new Date(entry.createdAt).toLocaleString()}`;
									const isSelected = selectedMockHistoryId === entry.id;
									return (
										<li
											key={entry.id}
											className={`flex w-full items-center justify-between border-b px-0 py-1.5 ${
												isSelected ? 'border-primary/40 text-foreground' : 'border-border'
											}`}
										>
											<p className="truncate pr-2 text-[10px] text-foreground">{label}</p>
											<div className="flex items-center gap-1">
												<AppButton
													type="button"
													variant="ghost"
													size="sm"
													className="h-6 rounded-none px-1.5 text-[10px]"
													onClick={() => setSelectedMockHistoryId(entry.id)}
												>
													{t('agenticPanel.useChat', 'Use')}
												</AppButton>
												<AppButton
													type="button"
													variant="ghost"
													size="icon-xs"
													className="h-6 w-6 rounded-none"
													aria-label={t('agenticPanel.deleteChat', 'Delete')}
													onClick={() => {
														setMockHistory((prev) => prev.filter((item) => item.id !== entry.id));
														setSelectedMockHistoryId((prev) =>
															prev === entry.id ? null : prev
														);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</AppButton>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</AppCollapsiblePanel>
				</AppCollapsible>
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
