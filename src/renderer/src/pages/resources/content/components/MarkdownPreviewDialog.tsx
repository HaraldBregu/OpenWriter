import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { FolderEntry } from '../../../../../../shared/types';

interface MarkdownPreviewDialogProps {
	readonly folder: FolderEntry | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function MarkdownPreviewDialog({
	folder,
	open,
	onOpenChange,
}: MarkdownPreviewDialogProps): ReactElement | null {
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open || !folder || folder.kind !== 'file') {
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
			.readFile({ filePath: folder.path })
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
	}, [open, folder]);

	if (!folder) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[70vh] w-[min(42rem,calc(100vw-4rem))] max-w-none flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{folder.name}</DialogTitle>
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ScrollArea className="h-full w-full">
							<div className="p-6">
								{loading && (
									<p className="text-sm text-muted-foreground">Loading…</p>
								)}
								{error && (
									<p className="text-sm text-destructive">{error}</p>
								)}
								{!loading && !error && content !== null && (
									<div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
										<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
									</div>
								)}
							</div>
						</ScrollArea>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
