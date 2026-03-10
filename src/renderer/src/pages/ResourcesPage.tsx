import { useState, useEffect, useCallback } from 'react';
import { Library, Loader2, FolderOpen, Upload } from 'lucide-react';
import {
	AppButton,
	AppTable,
	AppTableHeader,
	AppTableBody,
	AppTableHead,
	AppTableRow,
	AppTableCell,
} from '../components/app';
import type { DocumentInfo } from '../../../shared/types';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.html', '.csv', '.json'];

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** i;
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

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
			{/* Header */}
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Library className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">Resources</h1>
					<div className="ml-auto">
						<AppButton size="sm" onClick={handleUpload} disabled={uploading}>
							<Upload className="h-3.5 w-3.5 mr-1.5" />
							{uploading ? 'Uploading…' : 'Upload'}
						</AppButton>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				{loading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading resources…</span>
					</div>
				)}

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!loading && !error && documents.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<FolderOpen className="h-10 w-10 mb-3 opacity-40" />
						<p className="text-sm">No resources in this workspace yet.</p>
						<AppButton
							variant="outline"
							size="sm"
							className="mt-4"
							onClick={handleUpload}
							disabled={uploading}
						>
							<Upload className="h-3.5 w-3.5 mr-1.5" />
							Upload resources
						</AppButton>
					</div>
				)}

				{!loading && !error && documents.length > 0 && (
					<div className="rounded-md border">
						<AppTable>
							<AppTableHeader>
								<AppTableRow>
									<AppTableHead>Name</AppTableHead>
									<AppTableHead>Type</AppTableHead>
									<AppTableHead className="text-right">Size</AppTableHead>
									<AppTableHead>Imported</AppTableHead>
									<AppTableHead>Last Modified</AppTableHead>
								</AppTableRow>
							</AppTableHeader>
							<AppTableBody>
								{documents.map((doc) => (
									<AppTableRow key={doc.id}>
										<AppTableCell className="font-medium truncate max-w-[300px]">
											{doc.name}
										</AppTableCell>
										<AppTableCell className="text-muted-foreground">{doc.mimeType}</AppTableCell>
										<AppTableCell className="text-right text-muted-foreground tabular-nums">
											{formatBytes(doc.size)}
										</AppTableCell>
										<AppTableCell className="text-muted-foreground">
											{formatDate(doc.importedAt)}
										</AppTableCell>
										<AppTableCell className="text-muted-foreground">
											{formatDate(doc.lastModified)}
										</AppTableCell>
									</AppTableRow>
								))}
							</AppTableBody>
						</AppTable>
					</div>
				)}
			</div>
		</div>
	);
}
