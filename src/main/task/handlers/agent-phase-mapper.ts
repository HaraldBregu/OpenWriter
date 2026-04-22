import type { AgentEvent } from '../../agents/core/agent';
import type { AgentPhase, AgentPhasePayload } from '../../../shared/types';

/**
 * Maps an AgentEvent to a display phase (label + enum) for the status bar.
 * Returns `null` when the phase is identical to the last one emitted — the
 * handler uses that to skip redundant `recordEvent` calls.
 */
export class AgentPhaseMapper {
	private last: AgentPhase | null = null;

	map(event: AgentEvent): AgentPhasePayload | null {
		const phase = classify(event);
		if (phase === null) return null;
		if (phase === this.last) return null;
		this.last = phase;
		return { phase, label: LABELS[phase] };
	}
}

const LABELS: Record<AgentPhase, string> = {
	queued: 'Queued',
	thinking: 'Thinking',
	writing: 'Writing',
	'generating-image': 'Generating image',
	completed: 'Done',
	error: 'Error',
	cancelled: 'Cancelled',
};

function classify(event: AgentEvent): AgentPhase | null {
	switch (event.kind) {
		case 'text':
			return 'writing';
		case 'image':
			return 'generating-image';
		case 'status':
		case 'step:begin':
		case 'step:end':
		case 'decision':
		case 'decision:invalid':
		case 'skill:selected':
		case 'tool':
		case 'intent':
			return 'thinking';
		default:
			return null;
	}
}
