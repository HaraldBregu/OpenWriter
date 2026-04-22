import React from 'react';
import { cn } from '@/lib/utils';

export interface DocumentSidebarTabItem {
	id: string;
	title: string;
	meta?: string;
}

interface DocumentSidebarTabsProps {
	items: DocumentSidebarTabItem[];
	activePanelId: string | null;
	onSelect: (panelId: string) => void;
}

export function DocumentSidebarTabs({
	items,
	activePanelId,
	onSelect,
}: DocumentSidebarTabsProps): React.ReactElement {
	return (
		<div className="border-b border-l border-border/70 bg-card/55 dark:bg-background">
			<div
				role="tablist"
				aria-label="Document panels"
				className="flex gap-1 overflow-x-auto px-3 py-2"
			>
				{items.map((item) => {
					const active = item.id === activePanelId;

					return (
						<button
							key={item.id}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => onSelect(item.id)}
							className={cn(
								'group flex min-w-0 shrink-0 flex-col rounded-lg px-3 py-2 text-left transition-colors',
								active
									? 'bg-primary text-primary-foreground'
									: 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
							)}
						>
							<span className="truncate text-sm font-medium">{item.title}</span>
							{item.meta ? (
								<span
									className={cn(
										'truncate text-[11px]',
										active ? 'text-primary-foreground/80' : 'text-muted-foreground'
									)}
								>
									{item.meta}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
