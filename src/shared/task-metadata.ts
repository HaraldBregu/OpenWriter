export const TASK_STATUS_TEXT_KEY = 'statusText';

export function getTaskStatusText(metadata?: Record<string, unknown>): string | undefined {
	const value = metadata?.[TASK_STATUS_TEXT_KEY];
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function withTaskStatusText(
	metadata: Record<string, unknown> | undefined,
	statusText: string | undefined
): Record<string, unknown> | undefined {
	const next = { ...(metadata ?? {}) };
	const trimmed = statusText?.trim();

	if (trimmed) {
		next[TASK_STATUS_TEXT_KEY] = trimmed;
	} else {
		delete next[TASK_STATUS_TEXT_KEY];
	}

	return Object.keys(next).length > 0 ? next : undefined;
}
