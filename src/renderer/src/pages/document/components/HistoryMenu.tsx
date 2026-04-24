import React, { useMemo, useState } from 'react';
import { History, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/Popover';
import type { HistoryEntry } from '../services/history-service';

interface HistoryMenuProps {
	readonly entries: HistoryEntry[];
	readonly currentEntryId: string | null;
	readonly onRestoreEntry: (id: string) => void;
	readonly onReturnToLive: () => void;
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

const HistoryMenu: React.FC<HistoryMenuProps> = ({
	entries,
	currentEntryId,
	onRestoreEntry,
	onReturnToLive,
}) => {
	const [open, setOpen] = useState(false);
	const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);
	const onLive = currentEntryId === null;

	const handleReturnToLive = (): void => {
		if (!onLive) onReturnToLive();
		setOpen(false);
	};

	const handleRestore = (id: string): void => {
		onRestoreEntry(id);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button variant="ghost" size="icon" title="Version history" aria-label="Version history">
						<History aria-hidden="true" />
					</Button>
				}
			/>
			<PopoverContent align="end" className="w-64 p-0">
				<div className="max-h-72 overflow-y-auto p-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReturnToLive}
						className={
							'w-full justify-between ' + (onLive ? 'font-semibold' : 'font-normal')
						}
					>
						<span className="truncate">Current version</span>
						{onLive && (
							<Check className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
						)}
					</Button>
					<div className="my-1 h-px bg-border" />
					{reversedEntries.length === 0 ? (
						<p className="px-2 py-3 text-sm text-muted-foreground text-center">No history yet</p>
					) : (
						reversedEntries.map((entry) => {
							const isCurrent = entry.id === currentEntryId;
							return (
								<Button
									key={entry.id}
									variant="ghost"
									size="sm"
									onClick={() => handleRestore(entry.id)}
									className={
										'h-auto w-full justify-between py-1.5 ' +
										(isCurrent ? 'font-semibold' : 'font-normal')
									}
								>
									<div className="flex min-w-0 flex-col text-left">
										<span className="text-xs text-muted-foreground shrink-0">
											{formatSavedAt(entry.savedAt)}
										</span>
										<span className="truncate">{entry.title.trim() || 'Untitled'}</span>
									</div>
									{isCurrent && (
										<Check className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
									)}
								</Button>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
};

export default HistoryMenu;
