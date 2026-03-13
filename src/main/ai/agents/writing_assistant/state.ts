/**
 * Graph state annotation for the Writing Assistant agent.
 *
 * The `apiKey` and `modelName` fields are populated by the executor via
 * `buildGraphInput` so that nodes can instantiate the LLM without hardcoding
 * provider details. They are write-once inputs — nodes must not mutate them.
 */

import { Annotation } from '@langchain/langgraph';

/** Valid classifications produced by the intent node. */
export type WriterIntent = 'enhance' | 'continue_writing';

export const WriterState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/**
	 * Intent classification set by the intent node.
	 * Empty string is the unclassified default; the intent node always
	 * overwrites it before any downstream node runs.
	 */
	intent: Annotation<WriterIntent | ''>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** Output field — the generated continuation text. Populated by the node. */
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
