import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FolderOpen,
	MoreHorizontal,
	Copy,
	Trash2,
	PenLine,
	Search,
	X,
	Bot,
	Undo2,
	Redo2,
	Info,
} from 'lucide-react';
import {
	AppButton,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	AppInput,
} from '@/components/app';
import { useSidebarVisibility } from '../providers';
import HistoryMenu from './HistoryMenu';
import type { HistoryEntry } from '../services/history-service';

interface HeaderProps {
	readonly title: string;
	readonly onTitleChange: (value: string) => void;
	readonly isTrashing: boolean;
	readonly onMoveToTrash: () => void;
	readonly onSearch: (query: string) => void;
	readonly onClearSearch: () => void;
	readonly onOpenFolder: () => void;
	readonly historyEntries: HistoryEntry[];
	readonly currentHistoryEntryId: string | null;
	readonly canUndo: boolean;
	readonly canRedo: boolean;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
	readonly onRestoreHistoryEntry: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({
	title,
	onTitleChange,
	isTrashing,
	onMoveToTrash,
	onSearch,
	onClearSearch,
	onOpenFolder,
	historyEntries,
	currentHistoryEntryId,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onRestoreHistoryEntry,
}) => {
	const { t } = useTranslation();
	const { activeSidebar, toggleSidebar } = useSidebarVisibility();
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const searchInputRef = useRef<HTMLInputElement>(null);

	const handleSearchChange = useCallback(
		(query: string) => {
			setSearchQuery(query);
			onSearch(query);
		},
		[onSearch]
	);

	const closeSearch = useCallback(() => {
		setSearchOpen(false);
		setSearchQuery('');
		onClearSearch();
	}, [onClearSearch]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				setSearchOpen(true);
				requestAnimationFrame(() => searchInputRef.current?.focus());
			}
			if (e.key === 'Escape' && searchOpen) {
				closeSearch();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [searchOpen, closeSearch]);

	return (
		<>
			{/* Search bar */}
			{searchOpen && (
				<div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-muted/50 shrink-0">
					<Search className="h-4 w-4 text-muted-foreground shrink-0" />
					<AppInput
						ref={searchInputRef}
						type="search"
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={t('common.search')}
						className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={closeSearch}
					>
						<X className="h-3.5 w-3.5" />
					</AppButton>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<PenLine className="h-4 w-4 text-foreground/80 shrink-0" />
					<AppInput
						type="text"
						value={title}
						onChange={(e) => onTitleChange(e.target.value)}
						placeholder={t('writing.titlePlaceholder')}
						className="h-auto w-full min-w-0 border-0 bg-transparent px-0 py-0 text-xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>
				<div className="flex items-center gap-0 ml-3 shrink-0">
					<AppButton
						type="button"
						variant="header-icon"
						size="header-icon-sm"
						title="Undo"
						aria-label="Undo"
						onClick={onUndo}
						disabled={!canUndo}
					>
						<Undo2 aria-hidden="true" />
					</AppButton>
					<AppButton
						type="button"
						variant="header-icon"
						size="header-icon-sm"
						title="Redo"
						aria-label="Redo"
						onClick={onRedo}
						disabled={!canRedo}
					>
						<Redo2 aria-hidden="true" />
					</AppButton>
					<HistoryMenu
						entries={historyEntries}
						currentEntryId={currentHistoryEntryId}
						onRestoreEntry={onRestoreHistoryEntry}
					/>
					<AppButton
						type="button"
						variant="header-icon"
						size="header-icon-sm"
						title={t('titleBar.toggleAgenticSidebar')}
						aria-label={t('titleBar.toggleAgenticSidebar')}
						aria-expanded={activeSidebar === 'agentic'}
						onClick={() => toggleSidebar('agentic')}
					>
						<Bot aria-hidden="true" />
					</AppButton>
					<AppButton
						type="button"
						variant="header-icon"
						size="header-icon-sm"
						title={t('titleBar.toggleSidebar')}
						aria-label={t('titleBar.toggleSidebar')}
						aria-expanded={activeSidebar === 'config'}
						onClick={() => toggleSidebar('config')}
					>
						<Info aria-hidden="true" />
					</AppButton>
					<AppDropdownMenu>
						<AppDropdownMenuTrigger asChild>
							<AppButton
								type="button"
								variant="header-icon"
								size="header-icon-sm"
								title={t('common.moreOptions')}
							>
								<MoreHorizontal />
							</AppButton>
						</AppDropdownMenuTrigger>
						<AppDropdownMenuContent align="end">
							<AppDropdownMenuItem onClick={onOpenFolder}>
								<FolderOpen className="h-4 w-4" />
								{t('common.openFolder')}
							</AppDropdownMenuItem>
							<AppDropdownMenuItem>
								<Copy className="h-4 w-4" />
								{t('common.duplicate')}
							</AppDropdownMenuItem>
							<AppDropdownMenuItem
								className="text-destructive focus:text-destructive"
								disabled={isTrashing}
								onClick={onMoveToTrash}
							>
								<Trash2 className="h-4 w-4" />
								{t('common.moveToTrash')}
							</AppDropdownMenuItem>
						</AppDropdownMenuContent>
					</AppDropdownMenu>
				</div>
			</div>
		</>
	);
};

export default Header;
