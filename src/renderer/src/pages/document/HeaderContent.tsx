import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Bot, Undo2, Redo2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useSidebarVisibility } from './providers';
import HistoryMenu from './components/HistoryMenu';
import type { HistoryEntry } from './services/history-service';

interface HeaderContentProps {
	readonly title: string;
	readonly emoji: string;
	readonly onTitleChange: (value: string) => void;
	readonly onEmojiChange: (emoji: string) => void;
	readonly onSearch: (query: string) => void;
	readonly onClearSearch: () => void;
	readonly historyEntries: HistoryEntry[];
	readonly currentHistoryEntryId: string | null;
	readonly canUndo: boolean;
	readonly canRedo: boolean;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
	readonly onRestoreHistoryEntry: (id: string) => void;
}

const HeaderContent: React.FC<HeaderContentProps> = ({
	title,
	emoji,
	onTitleChange,
	onEmojiChange,
	onSearch,
	onClearSearch,
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
					<Input
						ref={searchInputRef}
						type="search"
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={t('common.search')}
						className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={closeSearch}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<EmojiPicker value={emoji} onSelect={onEmojiChange} />
					<Input
						type="text"
						value={title}
						onChange={(e) => onTitleChange(e.target.value)}
						placeholder={t('writing.titlePlaceholder')}
						className="h-auto w-full min-w-0 border-0 bg-transparent px-0 py-0 !text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>
				<div className="flex items-center gap-0 ml-3 shrink-0">
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title="Undo"
						aria-label="Undo"
						onClick={onUndo}
						disabled={!canUndo}
					>
						<Undo2 aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title="Redo"
						aria-label="Redo"
						onClick={onRedo}
						disabled={!canRedo}
					>
						<Redo2 aria-hidden="true" />
					</Button>
					<HistoryMenu
						entries={historyEntries}
						currentEntryId={currentHistoryEntryId}
						onRestoreEntry={onRestoreHistoryEntry}
					/>
					<Separator orientation="vertical" className="mx-2 h-5" />
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title={t('titleBar.toggleAgenticSidebar')}
						aria-label={t('titleBar.toggleAgenticSidebar')}
						aria-expanded={activeSidebar === 'agentic'}
						onClick={() => toggleSidebar('agentic')}
					>
						<Bot aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title={t('titleBar.toggleSidebar')}
						aria-label={t('titleBar.toggleSidebar')}
						aria-expanded={activeSidebar === 'config'}
						onClick={() => toggleSidebar('config')}
					>
						<Info aria-hidden="true" />
					</Button>
				</div>
			</div>
		</>
	);
};

export default HeaderContent;
