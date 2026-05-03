export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function trimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function nonEmptyTrimmed(value: unknown): string | undefined {
	const trimmed = trimmedString(value);
	return trimmed.length > 0 ? trimmed : undefined;
}

export function stringOrEmpty(value: unknown): string {
	return typeof value === 'string' ? value : '';
}
