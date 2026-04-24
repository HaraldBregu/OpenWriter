import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';
import { AI_MODELS, DEFAULT_EMBEDDING_MODEL_ID } from '../../../../../../shared/models';
import type { ResourceInfo, TaskEvent, TaskState } from '../../../../../../shared/types';

function dataField<T>(data: unknown, key: string): T | undefined {
	if (typeof data === 'object' && data !== null && key in data) {
		return (data as Record<string, unknown>)[key] as T;
	}
	return undefined;
}

interface NbTaskInput {
	readonly name: string;
	readonly description: string;
	readonly markdownPaths: string[];
	readonly targetPath: string;
	readonly apiKey: string;
	readonly model: string;
	readonly baseURL?: string;
	readonly chunkSize?: number;
	readonly chunkOverlap?: number;
}

interface NbTaskOutput {
	readonly indexedCount: number;
	readonly failedPaths: string[];
	readonly totalChunks: number;
}

const EMBEDDING_MODELS = AI_MODELS.filter((m) => m.type === 'embedding');

interface KnowledgeBaseDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

type DialogStep = 'configure' | 'select-files' | 'processing' | 'completed' | 'error';

export function KnowledgeBaseDialog({
	open,
	onOpenChange,
}: KnowledgeBaseDialogProps): ReactElement {
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	const [step, setStep] = useState<DialogStep>('configure');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [embeddingModel, setEmbeddingModel] = useState(DEFAULT_EMBEDDING_MODEL_ID);
	const [files, setFiles] = useState<ResourceInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [noApiKey, setNoApiKey] = useState(false);

	const [taskId, setTaskId] = useState<string | null>(null);
	const [taskStatus, setTaskStatus] = useState<TaskState | null>(null);
	const [progress, setProgress] = useState<{ percent: number; message?: string }>({ percent: 0 });
	const [error, setError] = useState<string | undefined>(undefined);
	const [result, setResult] = useState<NbTaskOutput | undefined>(undefined);

	const isRunning =
		taskStatus === 'queued' || taskStatus === 'started' || taskStatus === 'running';
	const isCompleted = taskStatus === 'finished' && !error;
	const isError = taskStatus === 'cancelled' && !!error;
	const progressMessage = progress.message;

	useEffect(() => {
		if (!taskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== taskId) return;

			setTaskStatus(event.state);

			if (event.state === 'running') {
				const percent = dataField<number>(event.data, 'percent');
				const message = dataField<string>(event.data, 'message');
				if (percent !== undefined || message !== undefined) {
					setProgress({ percent: percent ?? 0, message });
				}
				return;
			}
			if (event.state === 'finished') {
				setResult(dataField<NbTaskOutput>(event.data, 'result'));
				setProgress({ percent: 100 });
				return;
			}
			if (event.state === 'cancelled') {
				const errorMessage =
					typeof event.data === 'string' && event.data.length > 0 ? event.data : undefined;
				if (errorMessage) setError(errorMessage);
			}
		});
	}, [taskId]);

	const submit = useCallback(async (input: NbTaskInput): Promise<void> => {
		if (typeof window.task?.submit !== 'function') return;

		setTaskStatus('queued');
		setProgress({ percent: 0 });
		setError(undefined);
		setResult(undefined);

		const res = await window.task.submit({
			type: 'build-knowledge-base',
			input,
			metadata: {},
		});

		if (!res.success) {
			setTaskStatus('cancelled');
			setError(res.error.message);
			return;
		}

		setTaskId(res.data.taskId);
	}, []);

	const cancel = useCallback(() => {
		if (!taskId) return;
		if (typeof window.task?.cancel !== 'function') return;
		window.task.cancel(taskId).catch(() => {
			// best effort; cancelled event will update state
		});
	}, [taskId]);

	const reset = useCallback(() => {
		if (isRunning) return;
		setTaskId(null);
		setTaskStatus(null);
		setProgress({ percent: 0 });
		setError(undefined);
		setResult(undefined);
	}, [isRunning]);

	const selectedModel = useMemo(
		() => EMBEDDING_MODELS.find((m) => m.modelId === embeddingModel),
		[embeddingModel]
	);

	useEffect(() => {
		if (!open) return;
		setStep('configure');
		setName('');
		setDescription('');
		setEmbeddingModel(DEFAULT_EMBEDDING_MODEL_ID);
		setSelected(new Set());
		setNoApiKey(false);
	}, [open]);

	useEffect(() => {
		if (isCompleted) setStep('completed');
		if (isError) setStep('error');
	}, [isCompleted, isError]);

	const loadFiles = useCallback(() => {
		setLoading(true);
		setSelected(new Set());

		window.workspace
			.getContents()
			.then((contents) => {
				const mdFiles = contents.filter((f) => f.name.endsWith('.md'));
				setFiles(mdFiles);
			})
			.catch(() => {
				setFiles([]);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	const handleNextToFiles = useCallback(() => {
		setStep('select-files');
		loadFiles();
	}, [loadFiles]);

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

		const markdownPaths = files.filter((f) => selected.has(f.id)).map((f) => f.path);

		setStep('processing');
		await submit({
			name: name.trim() || 'Untitled Knowledge Base',
			description: description.trim(),
			markdownPaths,
			targetPath: `${workspacePath}/resources/data`,
			apiKey: service.apiKey,
			model: embeddingModel,
		});
	}, [workspacePath, selected, files, submit, name, description, embeddingModel]);

	const handleClose = useCallback(
		(nextOpen: boolean) => {
			if (isRunning) return;
			if (!nextOpen) {
				reset();
				setFiles([]);
				setSelected(new Set());
				setNoApiKey(false);
				setStep('configure');
			}
			onOpenChange(nextOpen);
		},
		[isRunning, onOpenChange, reset]
	);

	const handleCancel = useCallback(() => {
		cancel();
	}, [cancel]);

	const handleBack = useCallback(() => {
		setStep('configure');
	}, []);

	const canProceed = name.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{step === 'configure' && 'Create Knowledge Base'}
						{step === 'select-files' && 'Select Files'}
						{step === 'processing' && 'Building Knowledge Base'}
						{step === 'completed' && 'Knowledge Base Created'}
						{step === 'error' && 'Build Failed'}
					</DialogTitle>
					<DialogDescription>
						{step === 'configure' && 'Configure your knowledge base settings.'}
						{step === 'select-files' && 'Choose markdown files to embed.'}
						{step === 'processing' && 'Embedding documents into vector store...'}
						{step === 'completed' && 'Your knowledge base is ready to use.'}
						{step === 'error' && 'Something went wrong during the build.'}
					</DialogDescription>
				</DialogHeader>

				{step === 'configure' && (
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="kb-name">Name</Label>
							<Input
								id="kb-name"
								placeholder="My Knowledge Base"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="kb-description">Description</Label>
							<Textarea
								id="kb-description"
								placeholder="What this knowledge base contains..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="min-h-20 resize-none"
							/>
						</div>
						<Separator />
						<div className="flex flex-col gap-2">
							<Label htmlFor="kb-model">Embedding Model</Label>
							<Select
								value={embeddingModel}
								onValueChange={(v) => {
									if (v !== null) setEmbeddingModel(v);
								}}
							>
								<SelectTrigger id="kb-model" className="w-full">
									<SelectValue placeholder="Select model" />
								</SelectTrigger>
								<SelectContent>
									{EMBEDDING_MODELS.map((model) => (
										<SelectItem key={model.modelId} value={model.modelId}>
											{model.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{selectedModel && (
								<p className="text-xs text-muted-foreground">
									Provider: {selectedModel.providerId} &middot; Context:{' '}
									{selectedModel.contextWindow?.toLocaleString() ?? 'N/A'} tokens
								</p>
							)}
						</div>
					</div>
				)}

				{step === 'select-files' && loading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}

				{step === 'select-files' && !loading && files.length === 0 && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						No markdown files found in resources/content.
					</div>
				)}

				{step === 'select-files' && !loading && files.length > 0 && (
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

				{step === 'processing' && (
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
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Model: {selectedModel?.name ?? embeddingModel}</span>
							<span>{progress.percent}%</span>
						</div>
					</div>
				)}

				{step === 'completed' && result && (
					<div className="flex flex-col items-center gap-3 py-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Check className="h-5 w-5 text-primary" />
						</div>
						<div className="text-center text-sm">
							<p className="font-medium">{name || 'Knowledge base'} built</p>
							<p className="text-muted-foreground">
								{result.indexedCount} documents &middot; {result.totalChunks} chunks
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Model: {selectedModel?.name ?? embeddingModel}
							</p>
							{result.failedPaths.length > 0 && (
								<p className="text-destructive mt-1">{result.failedPaths.length} files failed</p>
							)}
						</div>
					</div>
				)}

				{step === 'error' && (
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
					{step === 'configure' && (
						<Button onClick={handleNextToFiles} disabled={!canProceed}>
							Next
						</Button>
					)}
					{step === 'select-files' && !loading && (
						<div className="flex w-full items-center justify-between">
							<Button variant="outline" onClick={handleBack}>
								Back
							</Button>
							<Button onClick={handleStart} disabled={selected.size === 0}>
								Start Embedding ({selected.size})
							</Button>
						</div>
					)}
					{step === 'processing' && (
						<Button variant="destructive" onClick={handleCancel}>
							Cancel
						</Button>
					)}
					{(step === 'completed' || step === 'error') && (
						<Button onClick={() => handleClose(false)}>Close</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
