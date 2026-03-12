import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PenLine, Play, Square, RotateCcw, Loader2 } from 'lucide-react';
import { useTaskSubmit } from '../../hooks/use-task-submit';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';

const DEFAULT_CONTINUATION_TEXT = `The city had changed in ways no one expected. Buildings that once stood tall now leaned awkwardly against the sky, their facades cracked like ancient pottery. People still walked the streets, but their steps carried a different weight.

<<INSERT_HERE>>

By evening, the lamplighters had given up trying. The old gas lamps flickered once, twice, then surrendered to the dark. Only the moon remained reliable, casting its indifferent glow over the rooftops.`;

export function TextContinuationTab() {
	const [documentText, setDocumentText] = useState(DEFAULT_CONTINUATION_TEXT);
	const [output, setOutput] = useState('');
	const outputRef = useRef<HTMLDivElement>(null);

	const task = useTaskSubmit<{ prompt: string }>('agent-text-continuation', {
		prompt: documentText,
	});

	useEffect(() => {
		if (!task.taskId) return;
		const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
			if (snap.content) {
				setOutput(snap.content);
			}
			// Custom-state agents (like text-continuation) emit a single 'completed'
			// event with the result in snap.result instead of incremental stream tokens.
			if (snap.status === 'completed' && snap.result) {
				const r = snap.result as { content: string };
				if (r.content) {
					setOutput(r.content);
				}
			}
		});
		return unsub;
	}, [task.taskId]);

	useEffect(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, [output]);

	const handleRun = useCallback(() => {
		setOutput('');
		task.submit({ prompt: documentText });
	}, [task, documentText]);

	const handleReset = useCallback(() => {
		setOutput('');
		task.reset();
	}, [task]);

	const hasMarker = documentText.includes('<<INSERT_HERE>>');
	const isActive = task.isRunning || task.isQueued;
	const isDone = task.isCompleted || task.isError || task.isCancelled;

	return (
		<div className="flex-1 overflow-y-auto p-6">
			<div className="max-w-3xl space-y-4">
				<div>
					<h2 className="text-sm font-semibold flex items-center gap-2">
						<PenLine className="h-4 w-4 text-muted-foreground" />
						Text Continuation Agent
					</h2>
					<p className="text-xs text-muted-foreground mt-1">
						Place{' '}
						<code className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">
							{'<<INSERT_HERE>>'}
						</code>{' '}
						in your document where you want new content inserted. The agent will generate text that
						connects smoothly to both the preceding and following context.
					</p>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="continuation-input" className="text-xs font-medium">
						Document with insertion marker
					</label>
					<textarea
						id="continuation-input"
						value={documentText}
						onChange={(e) => setDocumentText(e.target.value)}
						disabled={isActive}
						rows={12}
						className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
						placeholder="Paste your text with <<INSERT_HERE>> at the insertion point…"
					/>
					{!hasMarker && documentText.trim() && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							No <code className="font-mono">{'<<INSERT_HERE>>'}</code> marker found — the agent may
							treat this as an append.
						</p>
					)}
				</div>

				<div className="flex items-center gap-2">
					{!isActive && !isDone && (
						<button
							type="button"
							onClick={handleRun}
							disabled={!documentText.trim()}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
						>
							<Play className="h-3.5 w-3.5" />
							Run
						</button>
					)}
					{isActive && (
						<button
							type="button"
							onClick={task.cancel}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
						>
							<Square className="h-3.5 w-3.5" />
							Cancel
						</button>
					)}
					{isDone && (
						<>
							<button
								type="button"
								onClick={handleReset}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Reset
							</button>
							<button
								type="button"
								onClick={handleRun}
								disabled={!documentText.trim()}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
							>
								<Play className="h-3.5 w-3.5" />
								Run again
							</button>
						</>
					)}
				</div>

				{isActive && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>{task.isQueued ? 'Queued…' : 'Generating insertion…'}</span>
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

				{(output || isActive) && (
					<div className="space-y-1.5">
						<p className="text-xs font-medium">Generated insertion</p>
						<div
							ref={outputRef}
							className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed"
						>
							{output || '\u00A0'}
							{isActive && (
								<span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
							)}
						</div>
					</div>
				)}

				{task.isError && task.error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{task.error}
					</div>
				)}
			</div>
		</div>
	);
}
