import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ItemProps {
	title: string;
	ageLabel: string;
	selected: boolean;
	deleting: boolean;
	onLoad: () => void;
	onDelete: () => void;
}

const Item: React.FC<ItemProps> = ({ title, ageLabel, selected, deleting, onLoad, onDelete }) => {
	const { t } = useTranslation();

	return (
		<div
			className={`flex items-center gap-2 rounded-lg border-b border-border/50 px-1.5 py-1.5 last:border-b-0 dark:border-border/70 ${
				selected
					? 'bg-accent/90 dark:bg-accent'
					: 'hover:bg-muted/65 dark:hover:bg-accent/75'
			}`}
		>
			<button
				type="button"
				onClick={onLoad}
				className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-foreground/85"
			>
				{title}
			</button>
			<div className="flex shrink-0 items-center gap-1 pl-1.5">
				<span className="text-xs text-muted-foreground">{ageLabel}</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="text-muted-foreground shadow-none hover:bg-destructive/12 hover:text-destructive dark:text-muted-foreground/90 dark:hover:bg-destructive/20"
					aria-label={t('agenticPanel.deleteSession', 'Delete chat')}
					disabled={deleting}
					onClick={onDelete}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</li>
	);
};

export { Item };
