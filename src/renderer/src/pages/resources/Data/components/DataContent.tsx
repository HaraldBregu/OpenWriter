import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useContext } from '../hooks/use-context';
import { DataToolbar } from './DataToolbar';
import { DataTable } from './DataTable';

function EmptyState({
	uploading,
	onUpload,
}: {
	readonly uploading: boolean;
	readonly onUpload: () => void;
}): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.data;
	const Icon = section.icon;

	return (
		<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
			<Icon className="mb-3 h-10 w-10 opacity-40" />
			<p className="text-sm">{t(section.emptyKey)}</p>
			<Button variant="outline" size="sm" className="mt-4" onClick={onUpload} disabled={uploading}>
				<Upload className="mr-1.5 h-3.5 w-3.5" />
				{t(section.uploadKey)}
			</Button>
		</div>
	);
}

export function DataContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.data;
	const { resources, isLoading, error, uploading, handleUpload } = useContext();

	return (
		<div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-6">
			{isLoading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>{t(section.loadingKey)}</span>
				</div>
			)}

			{error && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{!isLoading && !error && resources.length === 0 && (
				<EmptyState uploading={uploading} onUpload={handleUpload} />
			)}

			{!isLoading && !error && resources.length > 0 && (
				<div className="flex flex-1 min-h-0 flex-col gap-3">
					<DataToolbar />
					<DataTable />
				</div>
			)}
		</div>
	);
}
