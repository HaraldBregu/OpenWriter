/**
 * Agent — strategy interface for feature agents (text, image, rag, ocr, ...).
 *
 * Agents encapsulate a single AI capability and share a common execution
 * contract. They are registered in the AgentRegistry and dispatched by type.
 *
 * Design goals:
 *   - One agent per capability, one folder per agent.
 *   - Agents are pure strategy objects: no singletons, no global state.
 *   - Cancellation is first-class via AbortSignal.
 *   - Progress and streaming are optional orthogonal concerns.
 */

import type { LoggerService } from '../../services/logger';

export type AgentProgressReporter = (percent: number, message?: string) => void;

/**
 * Typed event emitted by an agent while it runs. Replaces the previous
 * raw-string `stream` channel. Handlers switch on `kind` to classify and
 * persist, then forward the event to the renderer via the task event bus.
 */
export interface AgentEvent {
	/** Event discriminator (e.g. `text`, `status`, `decision`, `tool`, `image`, `step:begin`). */
	kind: string;
	/** Unix epoch ms when the event was produced. */
	at: number;
	/** Event-specific payload. Shape is defined by each `kind`. */
	payload: unknown;
}

export type AgentEventReporter = (event: AgentEvent) => void;

export interface AgentContext {
	readonly signal: AbortSignal;
	readonly logger: LoggerService;
	readonly progress?: AgentProgressReporter;
	readonly onEvent?: AgentEventReporter;
	readonly metadata?: Record<string, unknown>;
}

export interface Agent<TInput = unknown, TOutput = unknown> {
	readonly type: string;
	validate?(input: TInput): void;
	execute(input: TInput, ctx: AgentContext): Promise<TOutput>;
}
