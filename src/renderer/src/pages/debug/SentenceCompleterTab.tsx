import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TextCursorInput, Play, Square, RotateCcw, Loader2 } from 'lucide-react';
import { useTaskSubmit } from '../../hooks/use-task-submit';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';

const DEFAULT_SENTENCE_TEXT = `The old professor had spent decades studying the migration patterns of Arctic terns. His research had taken him to every continent, and he had published over forty papers on the subject. But last winter, he noticed something that`;

export function SentenceCompleterTab() {
	const [documentText, setDocumentText] = useState(DEFAULT_SENTENCE_TEXT);
	const [output, setOutput] = useState('');
	const outputRef = useRef<HTMLDivElement>(null);

	const task = useTaskSubmit<{ prompt: string }>('agent-sentence-completer', {
		prompt: documentText,
	});

	useEffect(() => {
		if (!task.taskId) return;
		const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
			if (snap.content) {
				setOutput(snap.content);
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
		console.log('Submitting task with prompt:', documentText);
		task.submit({ prompt: documentText });
	}, [task, documentText]);

	const handleReset = useCallback(() => {
		setOutput('');
		task.reset();
	}, [task]);

	const isActive = task.isRunning || task.isQueued;
	const isDone = task.isCompleted || task.isError || task.isCancelled;

	return (
		<div className="flex-1 overflow-y-auto p-6">
			<div className="max-w-3xl space-y-4">
				<div>
					<h2 className="text-sm font-semibold flex items-center gap-2">
						<TextCursorInput className="h-4 w-4 text-muted-foreground" />
						Sentence Completer Agent
					</h2>
					<p className="text-xs text-muted-foreground mt-1">
						Write your text and the agent will continue writing from where you left off, matching
						the surrounding style.
					</p>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="sentence-input" className="text-xs font-medium">
						Text to continue
					</label>
					<textarea
						id="sentence-input"
						value={documentText}
						onChange={(e) => setDocumentText(e.target.value)}
						disabled={isActive}
						rows={10}
						className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
						placeholder="Type your text and the AI will continue writing from where you left off…"
					/>
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
						<span>{task.isQueued ? 'Queued…' : 'Completing sentence…'}</span>
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
						<p className="text-xs font-medium">Sentence completion</p>
						<div
							ref={outputRef}
							className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed"
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
