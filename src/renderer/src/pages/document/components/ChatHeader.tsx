import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, MessageSquarePlus, Pencil, Search, Trash2 } from 'lucide-react';
import {
	AppButton,
	AppInput,
	AppPopover,
	AppPopoverContent,
	AppPopoverTrigger,
} from '@/components/app';

interface ChatSessionListItem {
	id: string;
	title: string;
	ageLabel: string;
}

function createMockSessions(): ChatSessionListItem[] {
	return Array.from({ length: 14 }).map((_, index) => ({
		id: `session-${index + 1}`,
		title: 'Generate a concise git commit message (imperative, specific, and short)',
		ageLabel: '1d',
	}));
}

const ChatHeader: React.FC = () => {
	const { t } = useTranslation();
	const [search, setSearch] = useState('');
	const [selectedId, setSelectedId] = useState<string>('session-1');

	const sessions = useMemo(() => createMockSessions(), []);
	const filteredSessions = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return sessions;
		return sessions.filter((item) => item.title.toLowerCase().includes(q));
	}, [search, sessions]);

	return (
		<div className="shrink-0 border-b border-border bg-background/80 px-5 py-3">
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
								className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
								aria-label={t('agenticPanel.openHistory', 'Open chat history')}
							>
								<Clock3 className="h-4 w-4" />
							</AppButton>
						</AppPopoverTrigger>
						<AppPopoverContent
							align="end"
							sideOffset={8}
							className="w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-background/95 p-3"
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
												onClick={() => setSelectedId(item.id)}
												className="min-w-0 flex-1 truncate text-left text-sm text-foreground"
											>
												{item.title}
											</button>
											{isSelected ? (
												<div className="flex items-center gap-1">
													<AppButton
														type="button"
														variant="ghost"
														size="icon"
														className="h-6 w-6 rounded-md text-muted-foreground"
														aria-label={t('agenticPanel.renameSession', 'Rename session')}
													>
														<Pencil className="h-3.5 w-3.5" />
													</AppButton>
													<AppButton
														type="button"
														variant="ghost"
														size="icon"
														className="h-6 w-6 rounded-md text-muted-foreground"
														aria-label={t('agenticPanel.deleteSession', 'Delete session')}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</AppButton>
												</div>
											) : (
												<span className="shrink-0 text-sm text-muted-foreground">{item.ageLabel}</span>
											)}
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
						className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
						aria-label={t('agenticPanel.newChat', 'Start new chat')}
					>
						<MessageSquarePlus className="h-4 w-4" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { ChatHeader };
