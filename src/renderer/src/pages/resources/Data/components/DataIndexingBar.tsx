import { FolderOpen, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/app';
import { useDataContext } from '../context/DataContext';

export function DataIndexingBar(): ReactElement | null {
	const { t } = useTranslation();
	const { indexing, indexingInfo, handleOpenDataFolder } = useDataContext();

	if (indexing) {
		return (
			<div className="border-b px-6 py-3 shrink-0">
				<div className="flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin text-primary" />
					<span className="text-sm text-muted-foreground">
						{t('resources.media.indexing')}
					</span>
				</div>
			</div>
		);
	}

	if (!indexingInfo) return null;

	return (
		<div className="border-b px-6 py-3 shrink-0">
			<div className="flex items-center gap-4 text-xs text-muted-foreground">
				<span>
					{t('library.lastIndexed')}{' '}
					{new Date(indexingInfo.lastIndexedAt).toLocaleString()}
				</span>
				<span>
					{indexingInfo.indexedCount} {t('library.documents')}
				</span>
				<span>
					{indexingInfo.totalChunks} {t('library.chunks')}
				</span>
				{indexingInfo.failedCount > 0 && (
					<span className="text-destructive">
						{indexingInfo.failedCount} {t('library.failed')}
					</span>
				)}
				<AppButton
					variant="ghost"
					size="icon-xs"
					className="ml-auto"
					onClick={handleOpenDataFolder}
				>
					<FolderOpen />
				</AppButton>
			</div>
		</div>
	);
}
