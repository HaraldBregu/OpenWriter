import type { TaskState } from '@/services/task-store';
import { STATUS_CONFIG } from './debug-constants';

export function StatusBadge({ status }: { status: TaskState }) {
	const cfg = STATUS_CONFIG[status] ?? {
		label: status,
		className: 'border border-border bg-muted/70 text-muted-foreground',
	};
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
		>
			{cfg.label}
		</span>
	);
}
