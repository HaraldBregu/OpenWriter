/**
 * Generate-image node for the Image Generator agent.
 *
 * Calls the OpenAI Images API (gpt-image-1) using the refined prompt
 * produced by the upstream `refine-prompt` node. The API key is read directly
 * from state — it was injected there by the executor via `buildGraphInput` and
 * originates from the user's provider configuration in the main process.
 *
 * This node does not use a LangChain chat model. It is intentionally excluded
 * from `streamableNodes` in the agent definition because image generation is a
 * single blocking API call with no incremental token output.
 *
 * The generated image is written to disk under:
 *   `<documentPath>/images/<uuid>.png`
 *
 * Output written to state:
 *   - `imageUrl`      — relative path to the saved image (`images/<uuid>.png`)
 *   - `revisedPrompt` — the model's own internal revision of the prompt (may differ)
 *   - `result`        — JSON string: `{ imageUrl, revisedPrompt }`
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ImageGeneratorState } from './state';
import {
	DEFAULT_IMAGE_MODEL_ID,
	getImageGenerationConfig,
} from '../../../../shared/provider-constants';

const IMAGE_CONFIG = getImageGenerationConfig(DEFAULT_IMAGE_MODEL_ID);
if (!IMAGE_CONFIG) {
	throw new Error(`No image generation config found for model "${DEFAULT_IMAGE_MODEL_ID}"`);
}

const IMAGE_MODEL = DEFAULT_IMAGE_MODEL_ID;
const IMAGE_SIZE = IMAGE_CONFIG.defaultSize;
const IMAGE_QUALITY = IMAGE_CONFIG.defaultQuality;
const IMAGES_PER_REQUEST = IMAGE_CONFIG.maxImagesPerRequest;
const IMAGES_SUBDIR = 'images';
const PNG_EXTENSION = '.png';

export async function generateImageNode(
	state: typeof ImageGeneratorState.State
): Promise<Partial<typeof ImageGeneratorState.State>> {
	const client = new OpenAI({ apiKey: state.apiKey });

	const response = await client.images.generate({
		model: IMAGE_MODEL,
		prompt: state.refinedPrompt,
		n: IMAGES_PER_REQUEST,
		size: IMAGE_SIZE,
		quality: IMAGE_QUALITY,
	});

	const generated = response.data?.[0];
	const b64 = generated?.b64_json ?? '';
	const revisedPrompt = generated?.revised_prompt ?? '';

	const imagesDir = path.join(state.documentPath, IMAGES_SUBDIR);
	await mkdir(imagesDir, { recursive: true });

	const filename = `${randomUUID()}${PNG_EXTENSION}`;
	const absolutePath = path.join(imagesDir, filename);
	await writeFile(absolutePath, Buffer.from(b64, 'base64'));

	const imageUrl = `${IMAGES_SUBDIR}/${filename}`;
	const result = JSON.stringify({ imageUrl, revisedPrompt });

	return { imageUrl, revisedPrompt, result };
}
