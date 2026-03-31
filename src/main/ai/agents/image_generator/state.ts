/**
 * Graph state annotation for the Painter agent.
 *
 * Two nodes populate this state in sequence:
 *
 *   1. `refine-prompt`  — LLM node. Reads `prompt`, writes `refinedPrompt`.
 *   2. `generate-image` — DALL-E node. Reads `refinedPrompt` + `apiKey`,
 *                         writes `imageUrl`, `revisedPrompt`, and `result`.
 *
 * The `apiKey`, `modelName`, `providerId`, and `documentPath` fields are
 * injected by the executor via `buildGraphInput` so that nodes do not
 * hardcode provider or filesystem details. They are write-once inputs —
 * nodes must not mutate them.
 */

import { Annotation } from '@langchain/langgraph';

export const ImageGeneratorState = Annotation.Root({
	/** Raw user-supplied description of the desired image. */
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** LLM-refined prompt passed to DALL-E. Populated by `refine-prompt`. */
	refinedPrompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/** URL of the generated image. Populated by `generate-image`. */
	imageUrl: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/**
	 * DALL-E's own internally revised prompt (may differ from `refinedPrompt`).
	 * Populated by `generate-image`. Empty string when not returned by the API.
	 */
	revisedPrompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	/**
	 * JSON-serialised output string: `{ imageUrl: string, revisedPrompt: string }`.
	 * Populated by `generate-image`. This is the value returned by
	 * `extractGraphOutput`.
	 */
	result: Annotation<string>({
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
	/**
	 * Absolute path to the directory of the active document. Injected by the
	 * executor via `buildGraphInput` from `ctx.metadata.documentPath`. The
	 * `generate-image` node writes generated images to an `images/` subdirectory
	 * under this path.
	 */
	documentPath: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
});
