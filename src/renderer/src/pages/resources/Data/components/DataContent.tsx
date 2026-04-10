import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { ResourceEmptyState } from '../../shared/ResourceEmptyState';
import { useDataContext } from '../context/DataContext';
import { DataToolbar } from './DataToolbar';
import { DataTable } from './DataTable';

const ResourcePreviewSheet = lazy(() =>
	import('../../shared/ResourcePreviewSheet').then((module) => ({
		default: module.ResourcePreviewSheet,
	})),
);

export function DataContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.data;
	const {
		resources,
		isLoading,
		error,
		uploading,
		handleUpload,
		previewResource,
		setPreviewResource,
	} = useDataContext();

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
				<ResourceEmptyState
					icon={section.icon}
					message={t(section.emptyKey)}
					uploadLabel={t(section.uploadKey)}
					uploading={uploading}
					onUpload={handleUpload}
				/>
			)}

			{!isLoading && !error && resources.length > 0 && (
				<div className="flex flex-1 min-h-0 flex-col gap-3">
					<DataToolbar />
					<DataTable />

					{previewResource && (
						<Suspense fallback={null}>
							<ResourcePreviewSheet
								resource={previewResource}
								onClose={() => setPreviewResource(null)}
							/>
						</Suspense>
					)}
				</div>
			)}
		</div>
	);
}
