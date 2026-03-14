/**
 * Graph state annotation for the Writing Assistant agent.
 *
 * The `apiKey` and `modelName` fields are populated by the executor via
 * `buildGraphInput` so that nodes can instantiate the LLM without hardcoding
 * provider details. They are write-once inputs — nodes must not mutate them.
 */

import { Annotation } from '@langchain/langgraph';
import type { WriterIntentResult } from './writer-intent';

export const WriterState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/**
	 * Structured intent classification set by the intent node.
	 * `null` is the unclassified default — the intent node always writes a
	 * valid `WriterIntentResult` before any downstream node runs.
	 */
	intent: Annotation<WriterIntentResult | null>({
		reducer: (_a, b) => b,
		default: () => null,
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
