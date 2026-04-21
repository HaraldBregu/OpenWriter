import type { AssistantState } from './state';

export interface BudgetLimits {
	maxTotalTokens: number;
	maxWallTimeMs: number;
}

export interface UsageDelta {
	inputTokens: number;
	outputTokens: number;
}

export class BudgetExceededError extends Error {
	constructor(
		public readonly kind: 'tokens' | 'time',
		public readonly usedTokens: number,
		public readonly elapsedMs: number
	) {
		super(
			kind === 'tokens'
				? `Token budget exceeded: ${usedTokens} tokens used`
				: `Run timeout exceeded: ${elapsedMs}ms elapsed`
		);
		this.name = 'BudgetExceededError';
	}
}

/**
 * RunBudget — per-run token + wall-time ceiling.
 *
 * Every LLM call charges usage here; `checkOrThrow` aborts the run before
 * the next call when any ceiling is breached.
 */
export class RunBudget {
	private usedInput = 0;
	private usedOutput = 0;
	private readonly startedAt = Date.now();

	constructor(
		private readonly limits: BudgetLimits,
		private readonly state: AssistantState
	) {}

	get totalTokens(): number {
		return this.usedInput + this.usedOutput;
	}

	get elapsedMs(): number {
		return Date.now() - this.startedAt;
	}

	charge(delta: UsageDelta): void {
		this.usedInput += delta.inputTokens;
		this.usedOutput += delta.outputTokens;
		this.state.recordUsage({
			inputTokens: delta.inputTokens,
			outputTokens: delta.outputTokens,
			totalTokens: this.totalTokens,
			elapsedMs: this.elapsedMs,
		});
	}

	checkOrThrow(): void {
		if (this.totalTokens > this.limits.maxTotalTokens) {
			this.state.recordBudget({ kind: 'tokens', usedTokens: this.totalTokens });
			throw new BudgetExceededError('tokens', this.totalTokens, this.elapsedMs);
		}
		if (this.elapsedMs > this.limits.maxWallTimeMs) {
			this.state.recordBudget({ kind: 'time', elapsedMs: this.elapsedMs });
			throw new BudgetExceededError('time', this.totalTokens, this.elapsedMs);
		}
	}
}
