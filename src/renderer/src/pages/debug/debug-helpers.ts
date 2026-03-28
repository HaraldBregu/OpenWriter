import { addTask } from '@/services/task-store';
import type { DemoVariant } from './debug-constants';

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

export function entryCount(value: unknown): string {
	if (Array.isArray(value)) return `${value.length} items`;
	if (value && typeof value === 'object') return `${Object.keys(value).length} keys`;
	return typeof value;
}

export async function submitDemoTask(variant: DemoVariant): Promise<void> {
	const result = await window.task.submit('demo', { variant }, undefined, { priority: 'normal' });
	if (result.success && result.data?.taskId) {
		addTask({ taskId: result.data.taskId, type: 'demo' });
	}
}
