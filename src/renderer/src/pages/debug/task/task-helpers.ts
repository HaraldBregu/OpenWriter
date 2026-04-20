import { addTask } from '@/services/task-store';
import type { DemoVariant } from './task-constants';

export function formatDuration(ms?: number): string {
	if (!ms) return '—';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

export function formatEventTime(receivedAt: number): string {
	return new Date(receivedAt).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
}

export async function submitDemoTask(variant: DemoVariant): Promise<void> {
	const result = await window.task.submit({
		type: 'demo',
		input: { variant },
		options: { priority: 'normal' },
	});
	if (result.success && result.data?.taskId) {
		addTask({ taskId: result.data.taskId, type: 'demo' });
	}
}
