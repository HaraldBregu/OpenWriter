import { FileText, Upload } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

interface EmptyStateProps {
	readonly uploading: boolean;
	readonly onUpload: () => void;
}

export function EmptyState({ uploading, onUpload }: EmptyStateProps): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
				<FileText className="h-7 w-7 text-muted-foreground" />
			</div>
			<p className="font-medium text-sm">{t(section.emptyKey)}</p>
			<Button onClick={onUpload} disabled={uploading} size="sm">
				<Upload />
				{t(section.uploadKey)}
			</Button>
		</div>
	);
}
