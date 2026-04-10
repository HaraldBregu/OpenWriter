import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useContentContext } from '../context/ContentContext';
import { ContentTable } from './ContentTable';

const ResourcePreviewSheet = lazy(() =>
	import('../../shared/ResourcePreviewSheet').then((module) => ({
		default: module.ResourcePreviewSheet,
	})),
);

export function ContentContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const { resources, isLoading, error, previewResource, setPreviewResource } =
		useContentContext();

	return (
		<div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
			{isLoading && (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
				</div>
			)}

			{error && (
				<div className="m-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{!isLoading && !error && resources.length === 0 && (
				<div className="flex flex-1 items-center justify-center">
					<p className="text-sm text-muted-foreground">{t(section.emptyKey)}</p>
				</div>
			)}

			{!isLoading && !error && resources.length > 0 && <ContentTable />}

			{previewResource && (
				<Suspense fallback={null}>
					<ResourcePreviewSheet
						resource={previewResource}
						onClose={() => setPreviewResource(null)}
					/>
				</Suspense>
			)}
		</div>
	);
}
