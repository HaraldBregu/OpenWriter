import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { CardAction, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PanelHeaderProps {
	readonly onOpenFolder: () => void;
}

export function PanelHeader({ onOpenFolder }: PanelHeaderProps): React.ReactElement {
	const { t } = useTranslation();

	return (
		<CardHeader className="shrink-0 items-center border-b px-4! py-2!">
			<CardTitle className="row-span-2 self-center">{t('configSidebar.documentInfo')}</CardTitle>
			<CardAction className="flex items-center gap-1! self-center!">
				<Button
					variant="ghost"
					size="icon"
					onClick={onOpenFolder}
					aria-label={t('agenticPanel.openHistory', 'Open chat history')}
				>
					<FolderOpen />
				</Button>
			</CardAction>
		</CardHeader>
	);
}
