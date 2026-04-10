import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Calendar, File, FolderOpen, HardDrive, Loader2, Trash2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_TYPE_PDF } from '../../shared/resource-preview-utils';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useFilesContext } from '../context/FilesContext';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url
).toString();

function useBlobUrl(path: string, mimeType: string) {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;

		setLoading(true);
		setError(null);
		setBlobUrl(null);

		window.workspace
			.readFile({ filePath: path, encoding: 'latin1' })
			.then((raw) => {
				if (cancelled) return;
				const bytes = new Uint8Array(raw.length);
				for (let i = 0; i < raw.length; i += 1) {
					bytes[i] = raw.charCodeAt(i);
				}
				const blob = new Blob([bytes], { type: mimeType });
				objectUrl = URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load preview');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [mimeType, path]);

	return { blobUrl, error, loading };
}

function PreviewLoading() {
	return (
		<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
			<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			Loading preview...
		</div>
	);
}

function PreviewError({ message }: { message: string }) {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{message}
			</div>
		</div>
	);
}

function PdfPreview({ path }: { path: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, 'application/pdf');
	const [numPages, setNumPages] = useState<number>(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number>(600);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				setContainerWidth(entry.contentRect.width);
			}
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	if (error) return <PreviewError message={error} />;
	if (loading || !blobUrl) return <PreviewLoading />;

	return (
		<div ref={containerRef} className="flex flex-col items-center gap-4">
			<Document
				file={blobUrl}
				onLoadSuccess={({ numPages: n }) => setNumPages(n)}
				loading={<PreviewLoading />}
				error={<PreviewError message="Failed to load PDF" />}
			>
				{Array.from({ length: numPages }, (_, i) => (
					<Page
						key={i + 1}
						pageNumber={i + 1}
						width={containerWidth - 32}
						className="mb-4 shadow-md"
					/>
				))}
			</Document>
		</div>
	);
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
	return (
		<div className="flex items-start gap-3">
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm">{value}</p>
			</div>
		</div>
	);
}

export function PdfDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange, handleOpenFolder } =
		useFilesContext();

	const handleDelete = useCallback(async () => {
		if (!activeFile) return;
		try {
			await window.workspace.deleteFileEntry(activeFile.id);
			handleFileDetailsOpenChange(false);
		} catch (err) {
			console.error('Failed to delete file:', err);
		}
	}, [activeFile, handleFileDetailsOpenChange]);

	if (!activeFile || activeFile.mimeType !== MIME_TYPE_PDF) {
		return null;
	}

	return (
		<Dialog open={fileDetailsOpen} onOpenChange={handleFileDetailsOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{activeFile.name}</DialogTitle>
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<div className="flex h-full min-h-0 w-full gap-0">
							{/* Left column — PDF preview */}
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden border-r">
								<ScrollArea className="h-full flex-1 p-4">
									<PdfPreview path={activeFile.path} />
								</ScrollArea>
							</div>

							{/* Right column — details & actions */}
							<div className="flex w-96 shrink-0 flex-col">
								<ScrollArea className="flex-1">
									<div className="space-y-4 p-4">
										<div>
											<h3 className="mb-3 text-sm font-semibold">Details</h3>
											<div className="space-y-3">
												<DetailRow
													icon={<HardDrive className="h-4 w-4" />}
													label="Size"
													value={formatBytes(activeFile.size)}
												/>
												<DetailRow
													icon={<File className="h-4 w-4" />}
													label="Type"
													value={activeFile.mimeType}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Added"
													value={formatDate(activeFile.createdAt)}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Modified"
													value={formatDate(activeFile.modifiedAt)}
												/>
											</div>
										</div>

										<Separator />

										<div>
											<h3 className="mb-3 text-sm font-semibold">Location</h3>
											<p
												className="break-all text-xs text-muted-foreground"
												title={activeFile.path}
											>
												{activeFile.relativePath}
											</p>
										</div>

										<Separator />

										<div>
											<h3 className="mb-3 text-sm font-semibold">Actions</h3>
											<div className="space-y-2">
												<Button
													variant="outline"
													className="w-full justify-start"
													onClick={handleOpenFolder}
												>
													<FolderOpen className="mr-2 h-4 w-4" />
													Open in Folder
												</Button>
												<Button
													variant="outline"
													className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={() => void handleDelete()}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete File
												</Button>
											</div>
										</div>
									</div>
								</ScrollArea>
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
