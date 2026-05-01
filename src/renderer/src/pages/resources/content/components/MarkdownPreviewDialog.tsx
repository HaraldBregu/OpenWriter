import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { ResourceInfo } from '../../../../../../shared/types';

interface MarkdownPreviewDialogProps {
	readonly item: ResourceInfo | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function MarkdownPreviewDialog({
	item,
	open,
	onOpenChange,
}: MarkdownPreviewDialogProps): ReactElement | null {
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open || !item) {
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
			.readFile({ filePath: item.path })
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
	}, [open, item]);

	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[70vh] min-w-[calc(100vw-60rem)] max-w-none flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{item.name}</DialogTitle>
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ScrollArea className="h-full w-full">
							<div className="p-6">
								{loading && <p className="text-sm text-muted-foreground">Loading…</p>}
								{error && <p className="text-sm text-destructive">{error}</p>}
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
