import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	appendFile as fsAppendFile,
	mkdir as fsMkdir,
	readFile as fsReadFile,
	writeFile as fsWriteFile,
} from 'node:fs/promises';
import type { AgentTool, JSONSchema } from './types.js';
import { resolveToCwd } from './path-utils.js';
import { withFileMutationQueue } from './file-mutation-queue.js';
import { createOpenAIClient } from '../../shared/chat-model-factory';

export type GenerateImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

export interface GenerateImageToolInput {
	prompt: string;
	filename?: string;
	size?: GenerateImageSize;
}

export interface GenerateImageToolDeps {
	/** Root directory under which the `images/` folder is created. Typically the workspace root. */
	imagesRoot: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	/** Absolute path to the document's content.md. The tool appends the markdown image reference here. */
	contentFilePath: string;
}

export interface GenerateImageToolDetails {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly filename: string;
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
			enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
			description: 'Output size. Defaults to 1024x1024.',
		},
	},
	required: ['prompt'],
};

function sanitizeFilename(input: string | undefined): string {
	const base = (input ?? randomUUID()).replace(/[^a-zA-Z0-9._-]/g, '_');
	return base.toLowerCase().endsWith('.png') ? base : `${base}.png`;
}

function buildAltText(prompt: string): string {
	const collapsed = prompt.replace(/\s+/g, ' ').trim();
	return collapsed.length > 80 ? collapsed.slice(0, 77) + '...' : collapsed;
}

async function appendImageToContent(
	contentFilePath: string,
	markdown: string
): Promise<'appended' | 'created'> {
	return withFileMutationQueue(contentFilePath, async () => {
		await fsMkdir(path.dirname(contentFilePath), { recursive: true });
		let existing = '';
		try {
			existing = await fsReadFile(contentFilePath, 'utf-8');
		} catch {
			await fsWriteFile(contentFilePath, markdown.trimStart(), 'utf-8');
			return 'created';
		}
		const separator = existing.length === 0 || existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
		await fsAppendFile(contentFilePath, `${separator}${markdown}`, 'utf-8');
		return 'appended';
	});
}

export function createGenerateImageTool(
	deps: GenerateImageToolDeps
): AgentTool<GenerateImageToolInput, GenerateImageToolDetails> {
	const { imagesRoot, providerId, apiKey, modelName, contentFilePath } = deps;
	return {
		name: 'generate_image',
		label: 'generate image',
		description:
			'Generate an image from a text prompt, save it at images/<filename>.png inside the workspace folder, and append a markdown image reference (relative to content.md) automatically.',
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
				},
				signal ? { signal } : undefined
			);
			const b64 = response.data?.[0]?.b64_json;
			if (!b64) throw new Error('Image provider returned no image data');

			const filename = sanitizeFilename(input.filename);
			const imagesDir = resolveToCwd('images', imagesRoot);
			await fsMkdir(imagesDir, { recursive: true });
			const absolutePath = path.join(imagesDir, filename);
			await fsWriteFile(absolutePath, Buffer.from(b64, 'base64'));

			const relativePath = toPosix(path.relative(path.dirname(contentFilePath), absolutePath));
			const alt = buildAltText(input.prompt);
			const markdown = `![${alt}](${relativePath})\n`;
			const mode = await appendImageToContent(contentFilePath, markdown);

			return {
				content: [
					{
						type: 'text',
						text: `Saved image to ${absolutePath} and ${mode === 'created' ? 'created content.md with' : 'appended to content.md'} the markdown reference: ${markdown.trim()}`,
					},
				],
				details: { absolutePath, relativePath, filename },
			};
		},
	};
}

function toPosix(p: string): string {
	return p.split(path.sep).join('/');
}
