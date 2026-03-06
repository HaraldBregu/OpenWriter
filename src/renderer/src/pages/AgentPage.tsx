import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Play, RotateCcw, Square, Loader2 } from 'lucide-react';
import { useTaskSubmit } from '../hooks/use-task-submit';
import { subscribeToTask } from '../services/task-event-bus';
import type { TaskSnapshot } from '../services/task-event-bus';
import {
	AppCard,
	AppCardHeader,
	AppCardTitle,
	AppCardDescription,
	AppCardContent,
	AppCardFooter,
	AppButton,
	AppInput,
} from '../components/app';

const DEFAULT_PROMPT = 'Tell me an interesting fact about technology';

export default function AgentPage() {
	const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
	const [output, setOutput] = useState('');
	const outputRef = useRef<HTMLDivElement>(null);

	const task = useTaskSubmit<{ prompt: string }>('agent-demo-agent', { prompt });

	// Subscribe to streamed tokens when a task is active.
	useEffect(() => {
		if (!task.taskId) return;
		const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
			if (snap.content) {
				setOutput(snap.content);
			}
			if (snap.error) {
				setOutput((prev) => prev); // keep existing output; error shown separately
			}
		});
		return unsub;
	}, [task.taskId]);

	// Auto-scroll the output area as content streams in.
	useEffect(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, [output]);

	const handleRun = useCallback(() => {
		setOutput('');
		task.submit({ prompt });
	}, [task, prompt]);

	const handleReset = useCallback(() => {
		setOutput('');
		task.reset();
	}, [task]);

	const isActive = task.isRunning || task.isQueued;
	const isDone = task.isCompleted || task.isError || task.isCancelled;

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Bot className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">Agents</h1>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				<AppCard className="max-w-2xl">
					<AppCardHeader>
						<AppCardTitle>Demo Agent</AppCardTitle>
						<AppCardDescription>
							A general-purpose assistant that answers questions with concise, interesting
							responses.
						</AppCardDescription>
					</AppCardHeader>

					<AppCardContent className="space-y-4">
						{/* Prompt input */}
						<div className="space-y-1.5">
							<label htmlFor="agent-prompt" className="text-sm font-medium">
								Your question
							</label>
							<AppInput
								id="agent-prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="Ask anything, or leave the default prompt…"
								disabled={isActive}
							/>
						</div>

						{/* Progress */}
						{isActive && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>{task.isQueued ? 'Queued…' : 'Running…'}</span>
								{task.progress.percent > 0 && (
									<div className="flex-1 max-w-xs">
										<div className="w-full bg-muted rounded-full h-1.5">
											<div
												className="bg-primary h-1.5 rounded-full transition-all"
												style={{ width: `${task.progress.percent}%` }}
											/>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Output */}
						{(output || isActive) && (
							<div
								ref={outputRef}
								className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed"
							>
								{output || '\u00A0'}
								{isActive && (
									<span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
								)}
							</div>
						)}

						{/* Error */}
						{task.isError && task.error && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
								{task.error}
							</div>
						)}
					</AppCardContent>

					<AppCardFooter className="gap-2">
						{!isActive && !isDone && (
							<AppButton onClick={handleRun} disabled={!prompt.trim()}>
								<Play className="h-4 w-4 mr-1.5" />
								Run
							</AppButton>
						)}
						{isActive && (
							<AppButton variant="destructive" onClick={task.cancel}>
								<Square className="h-4 w-4 mr-1.5" />
								Cancel
							</AppButton>
						)}
						{isDone && (
							<>
								<AppButton variant="outline" onClick={handleReset}>
									<RotateCcw className="h-4 w-4 mr-1.5" />
									Reset
								</AppButton>
								<AppButton onClick={handleRun} disabled={!prompt.trim()}>
									<Play className="h-4 w-4 mr-1.5" />
									Run again
								</AppButton>
							</>
						)}
					</AppCardFooter>
				</AppCard>
			</div>
		</div>
	);
}
