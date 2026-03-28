import { Square, EyeOff } from 'lucide-react';
import type { TrackedTaskState } from '@/services/task-store';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { formatDuration } from './debug-helpers';

interface TaskRowProps {
	task: TrackedTaskState;
	isSelected: boolean;
	onSelect: () => void;
	onCancel: () => void;
	onHide: () => void;
}

export function TaskRow({ task, isSelected, onSelect, onCancel, onHide }: TaskRowProps) {
	const canCancel =
		task.status === 'queued' || task.status === 'started' || task.status === 'running';

	return (
		<tr
			className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'bg-muted/50' : ''}`}
			onClick={onSelect}
		>
			<td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
				{task.taskId.slice(0, 8)}…
			</td>
			<td className="px-4 py-2.5 text-sm max-w-[160px] truncate">{task.type || '—'}</td>
			<td className="px-4 py-2.5">
				<StatusBadge status={task.status} />
			</td>
			<td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{task.priority}</td>
			<td className="px-4 py-2.5">
				<div className="flex items-center gap-2">
					<ProgressBar percent={task.progress.percent} />
					<span className="text-xs text-muted-foreground w-8 shrink-0">
						{task.progress.percent}%
					</span>
				</div>
			</td>
			<td className="px-4 py-2.5 text-xs text-muted-foreground">
				{formatDuration(task.durationMs)}
			</td>
			<td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center gap-1">
					{canCancel && (
						<button
							type="button"
							title="Cancel"
							onClick={onCancel}
							className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
						>
							<Square className="h-3.5 w-3.5" />
						</button>
					)}
					<button
						type="button"
						title="Hide"
						onClick={onHide}
						className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
					>
						<EyeOff className="h-3.5 w-3.5" />
					</button>
				</div>
			</td>
		</tr>
	);
}
