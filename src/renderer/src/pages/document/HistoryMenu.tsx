import React, { useMemo } from 'react';
import { History, Undo2, Redo2, Check } from 'lucide-react';
import {
	AppButton,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	AppSeparator,
} from '@/components/app';
import type { HistoryEntry } from './history-service';

interface HistoryMenuProps {
	readonly entries: HistoryEntry[];
	readonly currentEntryId: string | null;
	readonly canUndo: boolean;
	readonly canRedo: boolean;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
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

const HistoryMenu: React.FC<HistoryMenuProps> = ({
	entries,
	currentEntryId,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onRestoreEntry,
}) => {
	const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					type="button"
					variant="header-icon"
					size="header-icon-sm"
					title="History"
					aria-label="History"
				>
					<History aria-hidden="true" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="w-64">
				<AppDropdownMenuItem onClick={onUndo} disabled={!canUndo}>
					<Undo2 className="h-4 w-4" />
					Undo
				</AppDropdownMenuItem>
				<AppDropdownMenuItem onClick={onRedo} disabled={!canRedo}>
					<Redo2 className="h-4 w-4" />
					Redo
				</AppDropdownMenuItem>
				<AppSeparator className="my-1" />
				<div className="max-h-72 overflow-y-auto">
					{reversedEntries.length === 0 ? (
						<p className="px-2 py-3 text-sm text-muted-foreground text-center">No history yet</p>
					) : (
						reversedEntries.map((entry) => {
							const isCurrent = entry.id === currentEntryId;
							return (
								<AppDropdownMenuItem
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
								</AppDropdownMenuItem>
							);
						})
					)}
				</div>
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
};

export default HistoryMenu;
