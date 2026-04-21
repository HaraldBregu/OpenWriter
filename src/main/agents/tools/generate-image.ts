import path from 'node:path';
import { mkdir as fsMkdir, writeFile as fsWriteFile } from 'node:fs/promises';
import type { AgentTool, JSONSchema } from './types.js';
import { resolveToCwd } from './path-utils.js';
import { createOpenAIClient } from '../../shared/chat-model-factory';

export type GenerateImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

export interface GenerateImageToolInput {
	prompt: string;
	filename?: string;
	size?: GenerateImageSize;
}

export interface GenerateImageToolDeps {
	cwd: string;
	providerId: string;
	apiKey: string;
	modelName: string;
}

const generateImageSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		prompt: {
			type: 'string',
			description: 'Detailed description of the image to generate.',
		},
		filename: {
			type: 'string',
			description:
				'Optional base filename (without extension) for the saved image. Auto-generated when omitted.',
		},
		size: {
			type: 'string',
			enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
			description: 'Output size. Defaults to 1024x1024.',
		},
	},
	required: ['prompt'],
};

function sanitizeFilename(input: string | undefined): string {
	const base = (input ?? `image-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
	return base.toLowerCase().endsWith('.png') ? base : `${base}.png`;
}

export function createGenerateImageTool(
	deps: GenerateImageToolDeps
): AgentTool<GenerateImageToolInput, undefined> {
	const { cwd, providerId, apiKey, modelName } = deps;
	return {
		name: 'generate_image',
		label: 'generate image',
		description:
			'Generate an image from a text prompt and save it at images/<filename>.png inside the document folder. Returns the relative markdown path the caller should embed in content.md via the edit tool.',
		parameters: generateImageSchema,
		executionMode: 'sequential',
		async execute(_id, input, signal) {
			if (signal?.aborted) throw new Error('Operation aborted');
			const client = createOpenAIClient(providerId, apiKey);
			const response = await client.images.generate(
				{
					model: modelName,
					prompt: input.prompt,
					size: input.size ?? '1024x1024',
					n: 1,
					response_format: 'b64_json',
				},
				signal ? { signal } : undefined
			);
			const b64 = response.data?.[0]?.b64_json;
			if (!b64) throw new Error('Image provider returned no image data');

			const filename = sanitizeFilename(input.filename);
			const imagesDir = resolveToCwd('images', cwd);
			await fsMkdir(imagesDir, { recursive: true });
			const abs = path.join(imagesDir, filename);
			await fsWriteFile(abs, Buffer.from(b64, 'base64'));

			const relative = `images/${filename}`;
			const alt = input.prompt.length > 80 ? input.prompt.slice(0, 77) + '...' : input.prompt;
			return {
				content: [
					{
						type: 'text',
						text: `Saved image to ${relative}. Embed it in content.md with markdown: ![${alt}](${relative})`,
					},
				],
				details: undefined,
			};
		},
	};
}
