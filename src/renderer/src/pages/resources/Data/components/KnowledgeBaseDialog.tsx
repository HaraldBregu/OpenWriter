import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Check, FileText, Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';
import { useTaskSubmit } from '@/hooks/use-task-submit';
import type { ResourceInfo } from '../../../../../../shared/types';

interface NbTaskInput {
	markdownPaths: string[];
	targetPath: string;
	apiKey: string;
	model?: string;
	baseURL?: string;
	chunkSize?: number;
	chunkOverlap?: number;
}

interface NbTaskOutput {
	indexedCount: number;
	failedPaths: string[];
	totalChunks: number;
}

interface KnowledgeBaseDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function KnowledgeBaseDialog({
	open,
	onOpenChange,
}: KnowledgeBaseDialogProps): ReactElement {
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	const [files, setFiles] = useState<ResourceInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [noApiKey, setNoApiKey] = useState(false);

	const {
		submit,
		cancel,
		reset,
		isRunning,
		isCompleted,
		isError,
		progress,
		progressMessage,
		error,
		result,
	} = useTaskSubmit<NbTaskInput, NbTaskOutput>('build-knowledge-base', {} as NbTaskInput);

	useEffect(() => {
		if (!open) return;

		let active = true;
		setLoading(true);
		setSelected(new Set());
		setNoApiKey(false);

		window.workspace
			.getContents()
			.then((contents) => {
				if (!active) return;
				const mdFiles = contents.filter((f) => f.name.endsWith('.md'));
				setFiles(mdFiles);
			})
			.catch(() => {
				if (!active) return;
				setFiles([]);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [open]);

	const allSelected = files.length > 0 && selected.size === files.length;
	const someSelected = selected.size > 0 && selected.size < files.length;

	const handleToggleAll = useCallback(() => {
		if (allSelected) {
			setSelected(new Set());
		} else {
			setSelected(new Set(files.map((f) => f.id)));
		}
	}, [allSelected, files]);

	const handleToggle = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleStart = useCallback(async () => {
		if (!workspacePath || selected.size === 0) return;

		const services = await window.app.getServices();
		const service = services[0];
		if (!service?.apiKey) {
			setNoApiKey(true);
			return;
		}

		const markdownPaths = files
			.filter((f) => selected.has(f.id))
			.map((f) => f.path);

		await submit({
			markdownPaths,
			targetPath: `${workspacePath}/resources/data`,
			apiKey: service.apiKey,
		});
	}, [workspacePath, selected, files, submit]);

	const handleClose = useCallback(
		(nextOpen: boolean) => {
			if (isRunning) return;
			if (!nextOpen) {
				reset();
				setFiles([]);
				setSelected(new Set());
				setNoApiKey(false);
			}
			onOpenChange(nextOpen);
		},
		[isRunning, onOpenChange, reset],
	);

	const handleCancel = useCallback(() => {
		cancel();
	}, [cancel]);

	const showFileList = !isRunning && !isCompleted && !isError;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Build Knowledge Base</DialogTitle>
					<DialogDescription>
						Select markdown files to embed into a knowledge base.
					</DialogDescription>
				</DialogHeader>

				{loading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}

				{!loading && showFileList && files.length === 0 && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						No markdown files found in resources/content.
					</div>
				)}

				{!loading && showFileList && files.length > 0 && (
					<>
						<div className="flex items-center gap-2 border-b pb-2">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected}
								onCheckedChange={handleToggleAll}
							/>
							<span className="text-xs text-muted-foreground">
								{selected.size === 0
									? `${files.length} files`
									: `${selected.size} of ${files.length} selected`}
							</span>
						</div>
						<ScrollArea className="max-h-60">
							<div className="flex flex-col gap-1">
								{files.map((file) => (
									<label
										key={file.id}
										className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
									>
										<Checkbox
											checked={selected.has(file.id)}
											onCheckedChange={() => handleToggle(file.id)}
										/>
										<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
										<span className="truncate text-sm">{file.name}</span>
									</label>
								))}
							</div>
						</ScrollArea>
					</>
				)}

				{isRunning && (
					<div className="flex flex-col gap-3 py-4">
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin text-primary" />
							<span className="text-sm text-muted-foreground">
								{progressMessage ?? 'Processing...'}
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all duration-300"
								style={{ width: `${progress.percent}%` }}
							/>
						</div>
						<span className="text-xs text-muted-foreground text-right">
							{progress.percent}%
						</span>
					</div>
				)}

				{isCompleted && result && (
					<div className="flex flex-col items-center gap-3 py-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Check className="h-5 w-5 text-primary" />
						</div>
						<div className="text-center text-sm">
							<p className="font-medium">Knowledge base built</p>
							<p className="text-muted-foreground">
								{result.indexedCount} documents, {result.totalChunks} chunks
							</p>
							{result.failedPaths.length > 0 && (
								<p className="text-destructive">
									{result.failedPaths.length} files failed
								</p>
							)}
						</div>
					</div>
				)}

				{isError && (
					<div className="py-4 text-center text-sm text-destructive">
						{error ?? 'An error occurred while building the knowledge base.'}
					</div>
				)}

				{noApiKey && (
					<div className="py-2 text-center text-sm text-destructive">
						No API key configured. Add a provider in Settings first.
					</div>
				)}

				<DialogFooter>
					{showFileList && !loading && (
						<Button
							onClick={handleStart}
							disabled={selected.size === 0}
						>
							Start Embedding ({selected.size})
						</Button>
					)}
					{isRunning && (
						<Button variant="destructive" onClick={handleCancel}>
							Cancel
						</Button>
					)}
					{(isCompleted || isError) && (
						<Button onClick={() => handleClose(false)}>
							Close
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
