import type { Agent, AgentContext } from './agent';

/**
 * BaseAgent — abstract scaffold for concrete agents.
 *
 * Subclasses declare `type` and implement `run`. Shared concerns — abort
 * checks, error normalisation, progress defaults — live here so feature
 * agents stay focused on domain logic.
 */
export abstract class BaseAgent<TInput, TOutput> implements Agent<TInput, TOutput> {
	abstract readonly type: string;

	validate?(input: TInput): void;

	async execute(input: TInput, ctx: AgentContext): Promise<TOutput> {
		this.validate?.(input);
		this.ensureNotAborted(ctx.signal);
		return this.run(input, ctx);
	}

	protected abstract run(input: TInput, ctx: AgentContext): Promise<TOutput>;

	protected ensureNotAborted(signal: AbortSignal): void {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}
	}

	protected reportProgress(ctx: AgentContext, percent: number, message?: string): void {
		ctx.progress?.(percent, message);
	}
}
