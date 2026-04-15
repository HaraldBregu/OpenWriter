import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { CardAction, CardHeader, CardTitle } from '@/components/ui/Card';

interface PanelHeaderProps {
	readonly onOpenFolder: () => void;
}

export function PanelHeader({ onOpenFolder }: PanelHeaderProps): React.ReactElement {
	const { t } = useTranslation();

	return (
		<CardHeader className="shrink-0 items-center border-b px-4! py-2!">
			<CardTitle className="row-span-2 self-center truncate pr-4 text-sm font-medium tracking-tight">
				{t('configSidebar.documentInfo')}
			</CardTitle>
			<CardAction className="flex items-center gap-1! self-center!">
				<button
					type="button"
					onClick={onOpenFolder}
					className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground shadow-none hover:bg-accent hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent dark:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={t('common.openFolder')}
					title={t('common.openFolder')}
				>
					<FolderOpen className="h-4 w-4" aria-hidden="true" />
				</button>
			</CardAction>
		</CardHeader>
	);
}
