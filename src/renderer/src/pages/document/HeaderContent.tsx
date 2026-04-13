import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Undo2, Redo2, Info } from 'lucide-react';
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

	return (
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
	);
};

export default HeaderContent;
