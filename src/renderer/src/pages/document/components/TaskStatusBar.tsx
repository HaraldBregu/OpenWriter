import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { TaskEvent, TaskState } from '../../../../../shared/types';

interface TaskStatusBarProps {
	readonly taskId: string | null;
	readonly phaseLabel?: string | null;
}

const CANCELLABLE_STATES: ReadonlySet<TaskState> = new Set(['queued', 'started', 'running']);

interface TaskStatusState {
	readonly status: TaskState;
	readonly percent: number;
	readonly message?: string;
}

const INITIAL_STATE: TaskStatusState = {
	status: 'queued',
	percent: 0,
};

const STATUS_LABELS: Record<TaskState, string> = {
	queued: 'Queued',
	started: 'Started',
	running: 'Running',
	completed: 'Completed',
	error: 'Error',
	cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<TaskState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	queued: 'secondary',
	started: 'secondary',
	running: 'default',
	completed: 'default',
	error: 'destructive',
	cancelled: 'outline',
};

function dataField<T>(data: unknown, key: string): T | undefined {
	if (typeof data === 'object' && data !== null && key in data) {
		return (data as Record<string, unknown>)[key] as T;
	}
	return undefined;
}

export function TaskStatusBar({ taskId, phaseLabel }: TaskStatusBarProps): ReactElement | null {
	const [state, setState] = useState<TaskStatusState | null>(null);
	const [cancelling, setCancelling] = useState(false);

	const handleCancel = useCallback(() => {
		if (!taskId || cancelling) return;
		if (typeof window.task?.cancel !== 'function') return;
		setCancelling(true);
		window.task.cancel(taskId).catch(() => {
			setCancelling(false);
		});
	}, [taskId, cancelling]);

	useEffect(() => {
		setCancelling(false);
	}, [taskId]);

	useEffect(() => {
		if (!taskId) {
			setState(null);
			return;
		}
		if (typeof window.task?.onEvent !== 'function') return;

		setState(INITIAL_STATE);

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== taskId) return;

			setState((prev) => {
				const base = prev ?? INITIAL_STATE;
				switch (event.state) {
					case 'queued':
					case 'started':
						return { ...base, status: event.state };
					case 'running': {
						const percent = dataField<number>(event.data, 'percent');
						const message = dataField<string>(event.data, 'message');
						return {
							status: 'running',
							percent: typeof percent === 'number' ? percent : base.percent,
							message: typeof message === 'string' ? message : base.message,
						};
					}
					case 'completed':
						return { ...base, status: 'completed', percent: 100 };
					case 'error':
						return { ...base, status: 'error' };
					case 'cancelled':
						return { ...base, status: 'cancelled' };
					default:
						return base;
				}
			});
		});
	}, [taskId]);

	if (!state) return null;

	const { status, percent, message } = state;
	const clampedPercent = Math.max(0, Math.min(100, percent));
	const isError = status === 'error';
	const canCancel = CANCELLABLE_STATES.has(status) && !!taskId;

	return (
		<div className="flex items-center gap-3 border-b px-6 py-2 bg-muted/20">
			<Badge variant={STATUS_VARIANT[status]} className="shrink-0">
				{STATUS_LABELS[status]}
			</Badge>
			<div className="flex-1 min-w-0">
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={`h-full rounded-full transition-all duration-300 ${
							isError ? 'bg-destructive' : 'bg-primary'
						}`}
						style={{ width: `${clampedPercent}%` }}
					/>
				</div>
				{message && (
					<p className="mt-1 truncate text-[11px] text-muted-foreground">{message}</p>
				)}
			</div>
			<span className="shrink-0 text-xs tabular-nums text-muted-foreground w-10 text-right">
				{clampedPercent}%
			</span>
			{canCancel && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={handleCancel}
					disabled={cancelling}
					title="Cancel task"
					aria-label="Cancel task"
				>
					<X className="h-3.5 w-3.5" aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}
