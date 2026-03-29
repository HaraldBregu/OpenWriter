/**
 * Graph state annotation for the Text Writer agent.
 *
 * The `apiKey`, `modelName`, and `providerId` fields are populated by the
 * executor via `buildGraphInput` so that nodes can instantiate the LLM
 * without hardcoding provider details. They are write-once inputs — nodes
 * must not mutate them.
 */

import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../../core/types';

export const TextWriterState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	history: Annotation<AgentHistoryMessage[]>({
		reducer: (_a, b) => b,
		default: () => [],
	}),
	/** Output field — the generated text. Populated by the node. */
	completion: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/**
	 * Resolved API key for the provider. Injected by the executor via
	 * `buildGraphInput`; never hardcoded by the agent definition.
	 */
	apiKey: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** Resolved model name (e.g. 'gpt-4o'). Injected by the executor. */
	modelName: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'gpt-4o',
	}),
	/** Resolved provider identifier (e.g. 'openai'). Injected by the executor. */
	providerId: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'openai',
	}),
});
