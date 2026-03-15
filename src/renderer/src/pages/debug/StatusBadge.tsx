import type { TaskStatus } from '@/store/tasks/types';
import { STATUS_CONFIG } from './debug-constants';

export function StatusBadge({ status }: { status: TaskStatus }) {
	const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}
		>
			{cfg.label}
		</span>
	);
}
