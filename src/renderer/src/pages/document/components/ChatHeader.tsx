import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, MessageSquarePlus, Search, Trash2 } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import {
	AppButton,
	AppInput,
	AppPopover,
	AppPopoverContent,
	AppPopoverTrigger,
} from '@/components/app';
import { useDocumentDispatch, useDocumentState } from '../hooks';
import { useChatState, useChatDispatch } from '../context';
import type { ChatSessionFile, ChatSessionIndex } from '../context/state';

const ChatHeader: React.FC = () => {
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

	if (chatSessions.length === 0 && chatMessages.length === 0) {
		return null;
	}

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
			const indexPath = `${docPath}/sessions.json`;
			let index: ChatSessionIndex = { version: 1, sessions: [] };

			try {
				const raw = await window.workspace.readFile({ filePath: indexPath });
				index = JSON.parse(raw) as ChatSessionIndex;
			} catch {
				// Missing index is treated as an empty history.
			}

			const updatedIndex: ChatSessionIndex = {
				version: index.version ?? 1,
				sessions: index.sessions.filter((entry) => entry.sessionId !== sessionId),
			};

			await window.workspace.deleteFolder({
				folderPath: `${docPath}/chats/${sessionId}`,
				recursive: true,
			});
			await window.workspace.writeFile({
				filePath: indexPath,
				content: JSON.stringify(updatedIndex, null, 2),
				createParents: true,
			});

			docDispatch({ type: 'CHAT_SESSIONS_LOADED', sessions: remainingSessions });
		} catch {
			// best effort
		} finally {
			setDeletingSessionId((current) => (current === sessionId ? null : current));
		}
	};

	return (
		<div className="shrink-0 border-b border-border bg-background/80 px-4 py-2">
			<div className="flex items-center justify-between">
				<h2 className="truncate pr-4 text-sm font-medium tracking-tight text-foreground">
					{t('agenticPanel.headerTitle', 'Chat history')}
				</h2>
				<div className="flex items-center gap-2">
					<AppPopover open={popoverOpen} onOpenChange={setPopoverOpen}>
						<AppPopoverTrigger asChild>
							<AppButton
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
								aria-label={t('agenticPanel.openHistory', 'Open chat history')}
							>
								<Clock3 className="h-4 w-4" />
							</AppButton>
						</AppPopoverTrigger>
						<AppPopoverContent
							align="end"
							sideOffset={8}
							className="w-80 rounded-2xl border border-border/80 bg-background/95 p-3.5"
						>
							<div className="mb-3">
								<div className="relative">
									<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<AppInput
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder={t('agenticPanel.searchSessions', 'Search sessions...')}
										className="h-10 border-border/70 bg-muted/40 pl-9 text-sm"
									/>
								</div>
							</div>
							<div className="max-h-[26rem] overflow-y-auto rounded-xl border border-border/70 bg-background/40 p-1.5">
								{filteredSessions.length === 0 && (
									<div className="px-2 py-3 text-xs text-muted-foreground">
										{t('agenticPanel.historyEmpty', 'No previous chats yet')}
									</div>
								)}
								{filteredSessions.map((item) => {
									const isSelected = item.id === selectedId;
									const isDeleting = deletingSessionId === item.id;
									return (
										<div
											key={item.id}
											className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${
												isSelected ? 'bg-muted/80' : 'hover:bg-muted/50'
											}`}
										>
											<button
												type="button"
												onClick={() => {
													void handleLoadSession(item.id);
												}}
												className="min-w-0 flex-1 truncate text-left text-sm text-foreground"
											>
												{item.title}
											</button>
											<div className="flex shrink-0 items-center gap-1.5 pl-2">
												<span className="text-xs text-muted-foreground">{item.ageLabel}</span>
												<AppButton
													type="button"
													variant="ghost"
													size="icon-xs"
													className="text-muted-foreground hover:text-destructive"
													aria-label={t('agenticPanel.deleteSession', 'Delete chat')}
													disabled={isDeleting}
													onClick={() => {
														void handleDeleteSession(item.id);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</AppButton>
											</div>
										</div>
									);
								})}
							</div>
						</AppPopoverContent>
					</AppPopover>
					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
						aria-label={t('agenticPanel.newChat', 'Start new chat')}
						onClick={handleNewChat}
					>
						<MessageSquarePlus className="h-4 w-4" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { ChatHeader };
