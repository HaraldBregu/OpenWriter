import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, Plus, Search } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Popover, PopoverContent, PopoverHeader, PopoverDescription, PopoverTrigger } from '@/components/ui/Popover';
import { useDocumentDispatch, useDocumentState } from '../../hooks';
import { useChatState, useChatDispatch } from './hooks';
import type { ChatSessionFile } from './shared';
import { syncChatSessionsFromDisk } from '../../services/chat-session-storage';
import { CardHeader } from '@/components/ui/Card';
import { Item } from './components/Item';

const PanelHeader: React.FC = () => {
	const { t } = useTranslation();
	const dispatch = useChatDispatch();
	const docDispatch = useDocumentDispatch();
	const { documentId, chatSessions } = useDocumentState();
	const [search, setSearch] = useState('');
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
	const { sessionId: selectedId, messages: chatMessages } = useChatState();

	const filteredSessions = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return chatSessions;
		return chatSessions.filter((item) => item.title.toLowerCase().includes(q));
	}, [search, chatSessions]);

	const hasHistory = chatSessions.length > 0 || chatMessages.length > 0;

	const handleLoadSession = async (sessionId: string) => {
		if (!documentId) return;
		try {
			const docPath = await window.workspace.getDocumentPath(documentId);
			const raw = await window.workspace.readFile({
				filePath: `${docPath}/chats/${sessionId}/messages.json`,
			});
			const file = JSON.parse(raw) as ChatSessionFile;
			dispatch({
				type: 'CHAT_MESSAGES_LOADED',
				messages: file.messages ?? [],
				sessionId,
			});
		} catch {
			// best effort
		}
		setPopoverOpen(false);
		setSearch('');
	};

	const handleNewChat = () => {
		if (!documentId) return;
		dispatch({ type: 'CHAT_RESET', sessionId: uuidv7() });
		setPopoverOpen(false);
		setSearch('');
	};

	const handleDeleteSession = async (sessionId: string) => {
		if (!documentId || deletingSessionId) return;

		const isSelected = sessionId === selectedId;
		const remainingSessions = chatSessions.filter((item) => item.id !== sessionId);

		if (isSelected) {
			dispatch({ type: 'CHAT_RESET' });
		}

		setDeletingSessionId(sessionId);

		try {
			const docPath = await window.workspace.getDocumentPath(documentId);

			await window.workspace.deleteFolder({
				folderPath: `${docPath}/chats/${sessionId}`,
				recursive: true,
			});

			docDispatch({ type: 'CHAT_SESSIONS_LOADED', sessions: remainingSessions });
		} catch {
			// best effort
		} finally {
			setDeletingSessionId((current) => (current === sessionId ? null : current));
		}
	};

	const handlePopoverOpenChange = (open: boolean) => {
		setPopoverOpen(open);

		if (!open || !documentId) return;

		void (async () => {
			try {
				const docPath = await window.workspace.getDocumentPath(documentId);
				const synced = await syncChatSessionsFromDisk(docPath);
				docDispatch({
					type: 'CHAT_SESSIONS_LOADED',
					sessions: synced?.sessionItems ?? [],
				});
			} catch {
				// best effort
			}
		})();
	};

	return (
		<CardHeader className='shrink-0 px-4 py-2'>
			<div className="flex items-center justify-between">
				<h2 className="truncate pr-4 text-sm font-medium tracking-tight text-foreground">
					{t('agenticPanel.headerTitle', 'Chat history')}
				</h2>
				<div className="flex items-center gap-2">
					<Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
						<PopoverTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon"
									disabled={!hasHistory}
									className="h-7 w-7 rounded-full text-muted-foreground shadow-none hover:bg-accent hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent dark:hover:text-foreground"
									aria-label={t('agenticPanel.openHistory', 'Open chat history')}
								>
									<Clock3 className="h-4 w-4" />
								</Button>
							}
						/>
						<PopoverContent
							align="end"
							sideOffset={8}
						>
							<div className="border-b border-border/60 px-1.5 pb-1.5 dark:border-border/80">
								<div className="relative rounded-lg bg-muted/75 px-2 dark:bg-accent/85">
									<Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground/90" />
									<Input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder={t('agenticPanel.searchSessions', 'Search sessions...')}
										className="h-8 border-0 bg-transparent pl-6 pr-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-foreground dark:placeholder:text-muted-foreground/75"
									/>
								</div>
							</div>
							<div className="max-h-[26rem] overflow-y-auto py-0.5">
								{filteredSessions.length === 0 && (
									<div className="px-1.5 py-2 text-xs text-muted-foreground">
										{t('agenticPanel.historyEmpty', 'No previous chats yet')}
									</div>
								)}
								{filteredSessions.map((item) => (
									<Item
										key={item.id}
										title={item.title}
										ageLabel={item.ageLabel}
										selected={item.id === selectedId}
										deleting={deletingSessionId === item.id}
										onLoad={() => {
											void handleLoadSession(item.id);
										}}
										onDelete={() => {
											void handleDeleteSession(item.id);
										}}
									/>
								))}
							</div>
						</PopoverContent>
					</Popover>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={!hasHistory}
						className="h-7 w-7 rounded-full text-muted-foreground shadow-none hover:bg-accent hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent dark:hover:text-foreground"
						aria-label={t('agenticPanel.newChat', 'Start new chat')}
						onClick={handleNewChat}
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</CardHeader>
	);
};

export { PanelHeader };
