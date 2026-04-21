import type { ControllerDecision } from './state';

export interface ProgressGuardOptions {
	windowSize: number;
}

/**
 * StagnationGuard — watches controller decisions for no-progress loops.
 *
 * If the same (action, instruction/imagePrompt) tuple repeats `windowSize`
 * times in a row, `observe` returns true and the agent halts with a
 * partial result instead of burning its entire step budget.
 */
export class StagnationGuard {
	private readonly recent: string[] = [];

	constructor(private readonly opts: ProgressGuardOptions) {}

	observe(decision: ControllerDecision): boolean {
		if (decision.action === 'done') return false;
		const fingerprint = fingerprintOf(decision);
		this.recent.push(fingerprint);
		if (this.recent.length > this.opts.windowSize) {
			this.recent.shift();
		}
		if (this.recent.length < this.opts.windowSize) return false;
		return this.recent.every((f) => f === fingerprint);
	}
}

function fingerprintOf(decision: ControllerDecision): string {
	const payload =
		decision.action === 'image'
			? decision.imagePrompt ?? ''
			: decision.action === 'skill'
				? `${decision.skillName ?? ''}|${decision.instruction ?? ''}`
				: decision.instruction ?? '';
	return `${decision.action}::${payload.trim().toLowerCase()}`;
}
