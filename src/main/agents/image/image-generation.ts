import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ImageGenerationConfig, GenerateImageInput, GeneratedImage } from './types';

const DEFAULT_CONFIG: ImageGenerationConfig = {
	apiKey: '',
	model: 'gpt-image-1',
	size: '1024x1024',
	quality: 'medium',
	format: 'png',
};

export function createImageGenerationConfig(
	overrides?: Partial<ImageGenerationConfig>
): ImageGenerationConfig {
	return { ...DEFAULT_CONFIG, ...overrides };
}

function toLocalResourceUrl(filePath: string): string {
	const url = new URL('local-resource://localhost');
	url.pathname = filePath.replace(/\\/g, '/');
	return url.toString();
}

function resolveOutputDirectory(
	workspacePath: string | undefined,
	metadata?: Record<string, unknown>
): string {
	const documentId = typeof metadata?.documentId === 'string' ? metadata.documentId.trim() : '';

	if (workspacePath && documentId) {
		const documentsRoot = path.resolve(workspacePath, 'output', 'documents');
		const documentDir = path.resolve(documentsRoot, documentId);
		if (!documentDir.startsWith(`${documentsRoot}${path.sep}`)) {
			throw new Error(`Rejected document path outside workspace for ID "${documentId}".`);
		}
		return path.join(documentDir, 'images');
	}

	if (workspacePath) {
		return path.resolve(workspacePath, 'resources', 'generated-images');
	}

	return path.resolve(os.tmpdir(), 'openwriter-generated-images');
}

function resolveWorkspacePath(
	workspacePath: string | null | undefined,
	metadata?: Record<string, unknown>
): string | undefined {
	if (workspacePath && workspacePath.trim().length > 0) {
		return path.resolve(workspacePath);
	}

	return typeof metadata?.workspacePath === 'string' && metadata.workspacePath.trim().length > 0
		? path.resolve(metadata.workspacePath)
		: undefined;
}

export async function generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
	const { config, prompt, signal, metadata, workspacePath, logger } = input;

	const client = new OpenAI({
		apiKey: config.apiKey,
		...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
	});

	const response = await client.images.generate(
		{
			model: config.model,
			prompt,
			size: config.size,
			quality: config.quality,
			output_format: config.format,
			moderation: 'auto',
			n: 1,
		},
		{ signal }
	);

	const base64 = response.data?.[0]?.b64_json;
	if (!base64) {
		throw new Error('Image generation returned no image data.');
	}

	const resolved = resolveWorkspacePath(workspacePath, metadata);
	const outputDir = resolveOutputDirectory(resolved, metadata);
	await fs.mkdir(outputDir, { recursive: true });

	const fileName = `image-${randomUUID()}.${config.format}`;
	const filePath = path.join(outputDir, fileName);
	await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

	logger?.info('ImageGenerator', 'Generated image saved', { filePath, outputDir });

	return {
		filePath,
		fileName,
		localUrl: toLocalResourceUrl(filePath),
	};
}
