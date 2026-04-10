import { useCallback, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Calendar, File, FolderOpen, HardDrive, Loader2, Trash2 } from 'lucide-react';
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
import type { FileEntry } from '../../../../../../shared/types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useFilesContext } from '../context/FilesContext';

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

function ImagePreview({ path, mimeType }: { path: string; mimeType: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, mimeType);

	if (error) return <PreviewError message={error} />;
	if (loading || !blobUrl) return <PreviewLoading />;

	return (
		<div className="flex h-full items-center justify-center rounded-md bg-muted/20 p-4">
			<img src={blobUrl} alt="" className="max-h-full max-w-full rounded object-contain" />
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

interface ImageDialogProps {
	readonly file: FileEntry;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ImageDialog({ file, open, onOpenChange }: ImageDialogProps): ReactElement {
	const { handleOpenFolder } = useFilesContext();

	const handleDelete = useCallback(async () => {
		try {
			await window.workspace.deleteFileEntry(file.id);
			onOpenChange(false);
		} catch (err) {
			console.error('Failed to delete file:', err);
		}
	}, [file.id, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{file.name}</DialogTitle>
					<DialogDescription className="flex min-h-0 flex-1">
						<div className="flex h-full min-h-0 w-full gap-0">
							{/* Left column — image preview */}
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden border-r">
								<ScrollArea className="h-full flex-1 p-4">
									<ImagePreview path={file.path} mimeType={file.mimeType} />
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
													value={formatBytes(file.size)}
												/>
												<DetailRow
													icon={<File className="h-4 w-4" />}
													label="Type"
													value={file.mimeType}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Added"
													value={formatDate(file.createdAt)}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Modified"
													value={formatDate(file.modifiedAt)}
												/>
											</div>
										</div>

										<Separator />

										<div>
											<h3 className="mb-3 text-sm font-semibold">Location</h3>
											<p className="break-all text-xs text-muted-foreground" title={file.path}>
												{file.relativePath}
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
