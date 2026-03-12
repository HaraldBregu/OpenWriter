import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload } from 'lucide-react';
import { AppButton } from '../../components/app';

interface ResourcesEmptyStateProps {
	uploading: boolean;
	onUpload: () => void;
}

export const ResourcesEmptyState = memo(function ResourcesEmptyState({
	uploading,
	onUpload,
}: ResourcesEmptyStateProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
			<FolderOpen className="h-10 w-10 mb-3 opacity-40" />
			<p className="text-sm">{t('resources.noResourcesYet')}</p>
			<AppButton
				variant="outline"
				size="sm"
				className="mt-4"
				onClick={onUpload}
				disabled={uploading}
			>
				<Upload className="h-3.5 w-3.5 mr-1.5" />
				Upload resources
			</AppButton>
		</div>
	);
});
