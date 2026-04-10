import { File, FileImage, FileText } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { MIME_PREFIX_IMAGE, MIME_PREFIX_TEXT, MIME_TYPE_PDF } from '../types';
import { useFilesContext } from '../context/FilesContext';

function getMimeTypeLabel(mimeType: string): string {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) return 'Image';
	if (mimeType.startsWith(MIME_PREFIX_TEXT)) return 'Document';
	if (mimeType === MIME_TYPE_PDF) return 'PDF';
	return 'File';
}

function getFileIcon(mimeType: string): ReactNode {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return <FileImage className="h-5 w-5 text-muted-foreground" />;
	}
	if (mimeType.startsWith(MIME_PREFIX_TEXT) || mimeType === MIME_TYPE_PDF) {
		return <FileText className="h-5 w-5 text-muted-foreground" />;
	}
	return <File className="h-5 w-5 text-muted-foreground" />;
}

function DetailRow({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: string;
	mono?: boolean;
}): ReactElement {
	return (
		<div className="grid gap-1.5">
			<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
			<dd
				className={mono ? 'break-all font-mono text-sm text-foreground' : 'text-sm text-foreground'}
			>
				{value}
			</dd>
		</div>
	);
}

export function FileDetailsDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange } = useFilesContext();

	if (!activeFile) {
		return null;
	}

	return (
		<Dialog open={fileDetailsOpen} onOpenChange={handleFileDetailsOpenChange}>
			<DialogContent
				style={{ maxWidth: 'none', width: 'min(1120px, calc(100vw - 2rem))' }}
			>
				<DialogHeader className="border-b bg-muted/30 px-6 py-5">
					<DialogTitle className="truncate text-xl">{activeFile.name}</DialogTitle>
				</DialogHeader>

				<div className="grid gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
					<section className="space-y-4 lg:col-span-2">
						<div className="flex items-start gap-4 rounded-xl border bg-card p-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm">
								{getFileIcon(activeFile.mimeType)}
							</div>
							<div className="min-w-0 flex-1 space-y-3">
								<div className="flex flex-wrap gap-2">
									<span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground">
										{getMimeTypeLabel(activeFile.mimeType)}
									</span>
									<span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
										{formatBytes(activeFile.size)}
									</span>
									<span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
										{activeFile.id}
									</span>
								</div>
								<p className="break-all text-sm text-muted-foreground">{activeFile.path}</p>
								<p className="text-sm leading-6 text-muted-foreground">
									Imported file details and location on disk.
								</p>
							</div>
						</div>
					</section>

					<section className="space-y-4">
						<div className="rounded-xl border bg-card p-4">
							<h3 className="font-medium text-sm">Location</h3>
							<dl className="mt-4 grid gap-4">
								<DetailRow label="Relative path" value={activeFile.relativePath} mono />
								<DetailRow label="Absolute path" value={activeFile.path} mono />
							</dl>
						</div>

						<div className="rounded-xl border bg-card p-4">
							<h3 className="font-medium text-sm">Timeline</h3>
							<dl className="mt-4 grid gap-4">
								<DetailRow label="Created" value={formatDate(activeFile.createdAt)} />
								<DetailRow label="Last modified" value={formatDate(activeFile.modifiedAt)} />
							</dl>
						</div>
					</section>

					<section className="space-y-4">
						<div className="rounded-xl border bg-card p-4">
							<h3 className="font-medium text-sm">Metadata</h3>
							<dl className="mt-4 grid gap-4">
								<DetailRow label="File name" value={activeFile.name} />
								<DetailRow label="File ID" value={activeFile.id} mono />
								<DetailRow label="MIME type" value={activeFile.mimeType} mono />
								<DetailRow label="Type" value={getMimeTypeLabel(activeFile.mimeType)} />
								<DetailRow label="Size" value={formatBytes(activeFile.size)} />
							</dl>
						</div>

						<div className="rounded-xl border bg-card p-4">
							<h3 className="font-medium text-sm">Summary</h3>
							<p className="mt-4 text-sm leading-6 text-muted-foreground">
								This file is stored inside the workspace resources files directory and can be
								referenced by its absolute path or relative workspace path.
							</p>
						</div>
					</section>
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={() => handleFileDetailsOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
