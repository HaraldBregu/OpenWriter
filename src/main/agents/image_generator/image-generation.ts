import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { LoggerService } from '../../services/logger';
import type { ImageResolution } from './state';

const OPENAI_IMAGE_MODEL = 'gpt-image-1';
const IMAGE_FILE_PREFIX = 'image-generator';
const IMAGE_EXTENSION = 'png';

interface GenerateImageInput {
	readonly prompt: string;
	readonly resolution: ImageResolution;
	readonly apiKey: string;
	readonly baseUrl?: string;
	readonly signal?: AbortSignal;
	readonly metadata?: Record<string, unknown>;
	readonly workspacePath?: string | null;
	readonly logger?: LoggerService;
}

interface GeneratedImage {
	readonly filePath: string;
	readonly fileName: string;
	readonly localUrl: string;
}

function toLocalResourceUrl(filePath: string): string {
	const url = new URL('local-resource://localhost');
	url.pathname = filePath.replace(/\\/g, '/');
	return url.toString();
}

function getWorkspacePath(
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

function resolveDocumentImageDirectory(workspacePath: string, documentId: string): string {
	const documentsRoot = path.resolve(workspacePath, 'output', 'documents');
	const documentDir = path.resolve(documentsRoot, documentId);
	if (!documentDir.startsWith(`${documentsRoot}${path.sep}`)) {
		throw new Error(`Rejected document path outside workspace for ID "${documentId}".`);
	}

	return path.join(documentDir, 'images');
}

function resolveOutputDirectory(
	workspacePath: string | undefined,
	metadata?: Record<string, unknown>
): string {
	const documentId = typeof metadata?.documentId === 'string' ? metadata.documentId.trim() : '';

	if (workspacePath && documentId) {
		return resolveDocumentImageDirectory(workspacePath, documentId);
	}

	if (workspacePath) {
		return path.resolve(workspacePath, 'resources', 'generated-images');
	}

	return path.resolve(os.tmpdir(), 'openwriter-generated-images');
}

export async function generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
	const { prompt, resolution, apiKey, baseUrl, signal, metadata, workspacePath, logger } = input;

	const client = new OpenAI({
		apiKey,
		...(baseUrl ? { baseURL: baseUrl } : {}),
	});

	const response = await client.images.generate(
		{
			model: OPENAI_IMAGE_MODEL,
			prompt,
			size: resolution,
			quality: 'medium',
			output_format: IMAGE_EXTENSION,
			moderation: 'auto',
			n: 1,
		},
		{ signal }
	);

	const imageData = response.data?.[0];
	const base64 = imageData?.b64_json;

	if (!base64) {
		throw new Error('Image generation returned no image data.');
	}

	const resolvedWorkspacePath = getWorkspacePath(workspacePath, metadata);
	const outputDir = resolveOutputDirectory(resolvedWorkspacePath, metadata);
	await fs.mkdir(outputDir, { recursive: true });

	const fileName = `${IMAGE_FILE_PREFIX}-${randomUUID()}.${IMAGE_EXTENSION}`;
	const filePath = path.join(outputDir, fileName);
	await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

	logger?.info('ImageGenerator', 'Generated image saved', {
		filePath,
		outputDir,
	});

	return {
		filePath,
		fileName,
		localUrl: toLocalResourceUrl(filePath),
	};
}
