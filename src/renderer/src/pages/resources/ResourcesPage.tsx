import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { DocumentInfo } from '../../../../shared/types';
import { SUPPORTED_EXTENSIONS } from './constants';
import { ResourcesHeader } from './ResourcesHeader';
import { ResourcesEmptyState } from './ResourcesEmptyState';
import { ResourcesTable } from './ResourcesTable';

export default function ResourcesPage() {
	const [documents, setDocuments] = useState<DocumentInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadDocuments = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const docs = await window.workspace.loadDocuments();
			setDocuments(docs);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load resources');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadDocuments();
	}, [loadDocuments]);

	const handleUpload = useCallback(async () => {
		try {
			setUploading(true);
			await window.workspace.importFiles(SUPPORTED_EXTENSIONS);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to upload resources');
		} finally {
			setUploading(false);
		}
	}, []);

	// Listen for real-time document changes
	useEffect(() => {
		const unsub = window.workspace.onDocumentFileChange(() => {
			loadDocuments();
		});
		return unsub;
	}, [loadDocuments]);

	return (
		<div className="flex flex-col h-full">
			<ResourcesHeader uploading={uploading} onUpload={handleUpload} />

			<div className="flex-1 overflow-y-auto p-6">
				{loading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading resources&hellip;</span>
					</div>
				)}

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!loading && !error && documents.length === 0 && (
					<ResourcesEmptyState uploading={uploading} onUpload={handleUpload} />
				)}

				{!loading && !error && documents.length > 0 && <ResourcesTable documents={documents} />}
			</div>
		</div>
	);
}
