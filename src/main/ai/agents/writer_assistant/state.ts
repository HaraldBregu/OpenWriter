/**
 * Graph state annotation for the Writer Assistant agent.
 *
 * The `apiKey` and `modelName` fields are populated by the executor via
 * `buildGraphInput` so that nodes can instantiate the LLM without hardcoding
 * provider details. They are write-once inputs — nodes must not mutate them.
 */

import { Annotation } from '@langchain/langgraph';

export const WriterState = Annotation.Root({
	/** The full document text (may include <<INSERT_HERE>> marker). */
	inputText: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** Task type — currently only 'continue_writing' is supported. */
	type: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'continue_writing',
	}),
	/**
	 * The actual text passage to continue.
	 * For insertion tasks this is the text preceding the marker.
	 */
	content: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** Desired output length. Controls which length-constraint prompt is used. */
	contentLength: Annotation<'short' | 'medium' | 'long'>({
		reducer: (_a, b) => b,
		default: () => 'short',
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
