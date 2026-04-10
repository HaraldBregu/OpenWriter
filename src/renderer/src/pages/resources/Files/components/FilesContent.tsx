import type { ReactElement } from 'react';
import { useFilesContext } from '../context/FilesContext';
import { EmptyState } from './EmptyState';
import { FilesTable } from './FilesTable';

export function FilesContent(): ReactElement {
	const { entries, isLoading, uploading, viewMode, handleUpload } = useFilesContext();

	return (
		<div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
			{isLoading && (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-sm text-muted-foreground">Loading files...</p>
				</div>
			)}

			{!isLoading && entries.length === 0 && (
				<EmptyState uploading={uploading} onUpload={handleUpload} />
			)}

			{!isLoading && entries.length > 0 && viewMode === 'list' && <FilesTable />}

			{!isLoading && entries.length > 0 && viewMode === 'grid' && (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-sm text-muted-foreground">Grid view coming soon.</p>
				</div>
			)}
		</div>
	);
}
