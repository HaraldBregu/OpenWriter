import React, { useMemo } from 'react';
import { History, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { HistoryEntry } from '../services/history-service';

interface HistoryMenuProps {
	readonly entries: HistoryEntry[];
	readonly currentEntryId: string | null;
	readonly onRestoreEntry: (id: string) => void;
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
};

function formatSavedAt(isoString: string): string {
	return new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS).format(new Date(isoString));
}

const HistoryMenu: React.FC<HistoryMenuProps> = ({ entries, currentEntryId, onRestoreEntry }) => {
	const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" title="Version history" aria-label="Version history">
						<History aria-hidden="true" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="w-64">
				<div className="max-h-72 overflow-y-auto">
					{reversedEntries.length === 0 ? (
						<p className="px-2 py-3 text-sm text-muted-foreground text-center">No history yet</p>
					) : (
						reversedEntries.map((entry) => {
							const isCurrent = entry.id === currentEntryId;
							return (
								<DropdownMenuItem
									key={entry.id}
									onClick={() => onRestoreEntry(entry.id)}
									className={isCurrent ? 'font-semibold' : undefined}
								>
									<div className="flex items-center justify-between w-full gap-2 min-w-0">
										<div className="flex flex-col min-w-0">
											<span className="text-xs text-muted-foreground shrink-0">
												{formatSavedAt(entry.savedAt)}
											</span>
											<span className="truncate">{entry.title}</span>
										</div>
										{isCurrent && (
											<Check className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
										)}
									</div>
								</DropdownMenuItem>
							);
						})
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default HistoryMenu;
