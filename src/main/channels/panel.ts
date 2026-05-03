const COLORS = {
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
} as const;
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export type PanelColor = keyof typeof COLORS;

const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');

export function panel(title: string, body: string, color: PanelColor = 'gray'): string {
	const c = COLORS[color];
	const lines = body.split('\n');
	const width = Math.max(title.length + 2, ...lines.map((l) => stripAnsi(l).length));
	const top = `${c}┌─ ${BOLD}${title}${RESET}${c} ${'─'.repeat(Math.max(0, width - title.length - 1))}┐${RESET}`;
	const bottom = `${c}└${'─'.repeat(width + 2)}┘${RESET}`;
	const padded = lines.map((l) => {
		const visible = stripAnsi(l).length;
		return `${c}│${RESET} ${l}${' '.repeat(Math.max(0, width - visible))} ${c}│${RESET}`;
	});
	return [top, ...padded, bottom].join('\n');
}
