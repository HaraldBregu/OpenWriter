import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Calendar, File, FolderOpen, HardDrive, Trash2 } from 'lucide-react';
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
import {
	MIME_PREFIX_IMAGE,
	MIME_TYPE_JSON,
	MIME_TYPE_PDF,
} from '../../shared/resource-preview-utils';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContext } from '../hooks/use-context';
import { useDelete } from '../hooks/use-delete';
import { DetailRow } from './DetailRow';
import { PreviewLoading, PreviewError } from './PreviewStates';

function JsonPreview({ content }: { content: string }) {
	const formatted = useMemo(() => {
		try {
			return JSON.stringify(JSON.parse(content), null, 2);
		} catch {
			return content;
		}
	}, [content]);

	return (
		<pre className="whitespace-pre-wrap break-words rounded-md bg-muted/30 p-4 font-mono text-sm text-foreground">
			{formatted}
		</pre>
	);
}

export function TextDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange, handleOpenFolder } =
		useContext();

	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const shouldReadContent = activeFile !== null && activeFile.mimeType === MIME_TYPE_JSON;

	useEffect(() => {
		if (!activeFile || !shouldReadContent) {
			setContent(null);
			setError(null);
			setLoading(false);
			return;
		}

		let cancelled = false;

		setLoading(true);
		setError(null);
		setContent(null);

		window.workspace
			.readFile({ filePath: activeFile.path })
			.then((text) => {
				if (!cancelled) setContent(text);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to read file');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [activeFile, shouldReadContent]);

	const handleDeleteSingle = useDelete({
		activeFile,
		onDeleted: () => handleFileDetailsOpenChange(false),
	});

	if (
		!activeFile ||
		activeFile.mimeType.startsWith(MIME_PREFIX_IMAGE) ||
		activeFile.mimeType === MIME_TYPE_PDF
	) {
		return null;
	}

	return (
		<Dialog open={fileDetailsOpen} onOpenChange={handleFileDetailsOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{activeFile.name}</DialogTitle>
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<div className="flex h-full min-h-0 w-full gap-0">
							{/* Left column — file preview */}
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden border-r">
								<ScrollArea className="h-full flex-1 p-4">
									{loading && <PreviewLoading />}
									{error && <PreviewError message={error} />}
									{!loading &&
										!error &&
										activeFile.mimeType === MIME_TYPE_JSON &&
										content !== null && <JsonPreview content={content} />}
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
													onClick={() => void handleDeleteSingle()}
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
