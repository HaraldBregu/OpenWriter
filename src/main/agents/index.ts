/**
 * Agents — feature-scoped AI capability strategies.
 *
 * Each subfolder owns a single capability and exports its Agent class
 * plus its input/output types. Core primitives (Agent interface,
 * BaseAgent, AgentRegistry) live under `./core`.
 */

export * from './core';
export { ContentWriterAgent } from './content-writer';
export type {
	ContentWriterAgentInput,
	ContentWriterAgentOptions,
	ContentWriterAgentOutput,
	ContentWriterLlmCaller,
	ContentWriterStreamParams,
} from './content-writer';
export { ContentReviewerAgent } from './content-reviewer';
export type {
	ContentReviewerAgentInput,
	ContentReviewerAgentOptions,
	ContentReviewerAgentOutput,
	ContentReviewerLlmCaller,
	ContentReviewerStreamParams,
} from './content-reviewer';