function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readLabeledValue(raw: string, label: string): string | undefined {
	const match = raw.match(new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+)$`, 'im'));
	return match?.[1]?.trim();
}

export function parseYesNo(value: string | undefined, fallback: boolean): boolean {
	if (!value) return fallback;
	if (/^(yes|true)\b/i.test(value)) return true;
	if (/^(no|false)\b/i.test(value)) return false;
	return fallback;
}
