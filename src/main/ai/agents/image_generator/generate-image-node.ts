/**
 * Generate-image node for the Image Generator agent.
 *
 * Calls the OpenAI Images API (gpt-image-1-mini) using the refined prompt produced by
 * the upstream `refine-prompt` node. The API key is read directly from state —
 * it was injected there by the executor via `buildGraphInput` and originates
 * from the user's provider configuration in the main process.
 *
 * This node does not use a LangChain chat model. It is intentionally excluded
 * from `streamableNodes` in the agent definition because image generation is a
 * single blocking API call with no incremental token output.
 *
 * Output written to state:
 *   - `imageUrl`      — URL of the generated image (1-hour expiry from OpenAI)
 *   - `revisedPrompt` — DALL-E's own internal revision of the prompt (may differ)
 *   - `result`        — JSON string: `{ imageUrl, revisedPrompt }`
 */

import OpenAI from 'openai';
import type { ImageGeneratorState } from './state';

const DALL_E_MODEL = 'dall-e-3';
const IMAGE_SIZE = '1024x1024' as const;
const IMAGE_QUALITY = 'standard' as const;
const IMAGES_PER_REQUEST = 1;

export async function generateImageNode(
	state: typeof ImageGeneratorState.State
): Promise<Partial<typeof ImageGeneratorState.State>> {
	const client = new OpenAI({ apiKey: state.apiKey });

	const response = await client.images.generate({
		model: DALL_E_MODEL,
		prompt: state.refinedPrompt,
		n: IMAGES_PER_REQUEST,
		size: IMAGE_SIZE,
		quality: IMAGE_QUALITY,
	});

	const generated = response.data?.[0];
	const imageUrl = generated?.url ?? '';
	const revisedPrompt = generated?.revised_prompt ?? '';

	const result = JSON.stringify({ imageUrl, revisedPrompt });

	return { imageUrl, revisedPrompt, result };
}
