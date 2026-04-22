import type { AgentEvent } from '../../agents/core/agent';

/**
 * Accumulates agent output into a running `fullContent` string.
 *
 * Kept separate from the phase mapper so both concerns can be tested in
 * isolation. Synchronous; no I/O.
 */
export class AgentStreamProjection {
	private content = '';

	apply(event: AgentEvent): void {
		if (event.kind !== 'text') return;
		const delta = extractTextDelta(event.payload);
		if (delta) this.content += delta;
	}

	get fullContent(): string {
		return this.content;
	}

	snapshot(): { fullContent: string } {
		return { fullContent: this.content };
	}
}

function extractTextDelta(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}
