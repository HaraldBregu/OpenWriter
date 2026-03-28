import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, MessageSquarePlus, Search } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import {
	AppButton,
	AppInput,
	AppPopover,
	AppPopoverContent,
	AppPopoverTrigger,
} from '@/components/app';
import { useDocumentState } from '../hooks';
import { useAppDispatch, useAppSelector } from '../../../store';
import { chatMessagesLoaded, chatReset, selectChatSessionId } from '../../../store/chat';
import type { ChatSessionFile, ChatSessionIndex, DocumentChatMessage } from '../context/state';

interface ChatSessionListItem {
	id: string;
	title: string;
	ageLabel: string;
	createdAt: string;
}

function formatRelativeTime(iso: string): string {
	const ts = new Date(iso).getTime();
	if (!Number.isFinite(ts)) return '';
	const seconds = Math.floor((Date.now() - ts) / 1000);
	if (seconds < 60) return 'now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return `${Math.floor(days / 7)}w`;
}

function titleFromMessages(messages: DocumentChatMessage[], fallback: string): string {
	const firstUser = messages.find((m) => m.role === 'user' && m.content.trim().length > 0);
	if (!firstUser) return fallback;
	return firstUser.content.trim().replace(/\s+/g, ' ').slice(0, 64);
}

const ChatHeader: React.FC = () => {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();
	const { documentId } = useDocumentState();
	const [search, setSearch] = useState('');
	const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
	const selectedId = useAppSelector((state) => selectChatSessionId(state, documentId));

	useEffect(() => {
		if (!documentId) {
			setSessions([]);
			return;
		}
		const currentDocumentId = documentId;

		let cancelled = false;
		async function loadSessions() {
			try {
				const docPath = await window.workspace.getDocumentPath(currentDocumentId);
				const rawIndex = await window.workspace.readFile({ filePath: `${docPath}/sessions.json` });
				const index = JSON.parse(rawIndex) as ChatSessionIndex;
				const sorted = [...index.sessions].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);

				const items = await Promise.all(
					sorted.map(async (entry) => {
						try {
							const rawSession = await window.workspace.readFile({
								filePath: `${docPath}/chats/${entry.sessionId}/messages.json`,
							});
							const file = JSON.parse(rawSession) as ChatSessionFile;
							const title = titleFromMessages(file.messages ?? [], t('writing.untitled', 'Untitled'));
							return {
								id: entry.sessionId,
								title,
								ageLabel: formatRelativeTime(entry.createdAt),
								createdAt: entry.createdAt,
							} satisfies ChatSessionListItem;
						} catch {
							return {
								id: entry.sessionId,
								title: t('writing.untitled', 'Untitled'),
								ageLabel: formatRelativeTime(entry.createdAt),
								createdAt: entry.createdAt,
							} satisfies ChatSessionListItem;
						}
					})
				);

				if (!cancelled) {
					setSessions(items);
				}
			} catch {
				if (!cancelled) {
					setSessions([]);
				}
			}
		}

		void loadSessions();
		return () => {
			cancelled = true;
		};
	}, [documentId, t]);

	const filteredSessions = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return sessions;
		return sessions.filter((item) => item.title.toLowerCase().includes(q));
	}, [search, sessions]);

	const handleLoadSession = async (sessionId: string) => {
		if (!documentId) return;
		try {
			const docPath = await window.workspace.getDocumentPath(documentId);
			const raw = await window.workspace.readFile({
				filePath: `${docPath}/chats/${sessionId}/messages.json`,
			});
			const file = JSON.parse(raw) as ChatSessionFile;
			dispatch(
				chatMessagesLoaded({
					documentId,
					messages: file.messages ?? [],
					sessionId,
				})
			);
		} catch {
			// best effort
		}
	};

	const handleNewChat = () => {
		if (!documentId) return;
		dispatch(chatReset({ documentId, sessionId: uuidv7() }));
	};

	return (
		<div className="shrink-0 border-b border-border bg-background/80 px-4 py-2">
			<div className="flex items-center justify-between">
				<h2 className="truncate pr-4 text-sm font-medium tracking-tight text-foreground">
					{t('agenticPanel.headerTitle', 'Chat history')}
				</h2>
				<div className="flex items-center gap-2">
					<AppPopover>
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
							className="w-72 rounded-2xl border border-border/80 bg-background/95 p-3"
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
									return (
										<div
											key={item.id}
											className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
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
											<span className="shrink-0 text-sm text-muted-foreground">{item.ageLabel}</span>
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
