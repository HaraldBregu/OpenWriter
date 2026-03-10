import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
	AppSheet,
	AppSheetContent,
	AppSheetHeader,
	AppSheetTitle,
	AppSheetDescription,
} from '../../components/app';
import type { DocumentInfo } from '../../../../shared/types';
import { formatBytes } from './constants';

interface ResourcePreviewSheetProps {
	doc: DocumentInfo | null;
	onClose: () => void;
}

export function ResourcePreviewSheet({ doc, onClose }: ResourcePreviewSheetProps) {
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!doc) {
			setContent(null);
			setError(null);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);
		setContent(null);

		window.fs
			.readFile({ filePath: doc.path })
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
	}, [doc]);

	return (
		<AppSheet
			open={doc !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<AppSheetContent className="sm:max-w-xl flex flex-col">
				<AppSheetHeader>
					<AppSheetTitle className="truncate">{doc?.name}</AppSheetTitle>
					<AppSheetDescription>
						{doc?.mimeType} &middot; {doc ? formatBytes(doc.size) : ''}
					</AppSheetDescription>
				</AppSheetHeader>
				<div className="flex-1 min-h-0 overflow-auto mt-4">
					{loading && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading&hellip;
						</div>
					)}
					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}
					{content !== null && (
						<pre className="whitespace-pre-wrap break-words text-sm font-mono text-foreground">
							{content}
						</pre>
					)}
				</div>
			</AppSheetContent>
		</AppSheet>
	);
}
