import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LoggerService } from '../../services/logger';
import type { PainterAspectRatio } from './state';

const OPENAI_IMAGE_MODEL = 'gpt-image-1';
const OPENAI_IMAGES_PATH = 'images';

interface GeneratePainterImageInput {
	readonly prompt: string;
	readonly aspectRatio: PainterAspectRatio;
	readonly apiKey: string;
	readonly baseUrl?: string;
	readonly signal?: AbortSignal;
	readonly metadata?: Record<string, unknown>;
	readonly workspacePath?: string | null;
	readonly logger?: LoggerService;
}

interface GeneratedPainterImage {
	readonly filePath: string;
	readonly fileName: string;
	readonly localUrl: string;
}

function withTrailingSlash(value: string): string {
	return value.endsWith('/') ? value : `${value}/`;
}

function resolveImagesEndpoint(baseUrl?: string): string {
	return new URL(OPENAI_IMAGES_PATH, withTrailingSlash(baseUrl ?? 'https://api.openai.com/v1/')).toString();
}

function mapAspectRatioToSize(aspectRatio: PainterAspectRatio): '1024x1024' | '1024x1536' | '1536x1024' {
	switch (aspectRatio) {
		case 'square':
			return '1024x1024';
		case 'portrait':
			return '1024x1536';
		case 'landscape':
		case 'auto':
		default:
			return '1536x1024';
	}
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

function resolveDocumentImageDirectory(
	workspacePath: string,
	documentId: string
): string {
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
	const documentId =
		typeof metadata?.documentId === 'string' ? metadata.documentId.trim() : '';

	if (workspacePath && documentId) {
		return resolveDocumentImageDirectory(workspacePath, documentId);
	}

	if (workspacePath) {
		return path.resolve(workspacePath, 'resources', 'generated-images');
	}

	return path.resolve(os.tmpdir(), 'openwriter-generated-images');
}

function extractApiErrorMessage(payload: unknown, fallbackStatus: number): string {
	if (!payload || typeof payload !== 'object') {
		return `Image generation failed with status ${fallbackStatus}.`;
	}

	const error = (payload as { error?: unknown }).error;
	if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
		return error.message;
	}

	return `Image generation failed with status ${fallbackStatus}.`;
}

export async function generatePainterImage(
	input: GeneratePainterImageInput
): Promise<GeneratedPainterImage> {
	const { prompt, aspectRatio, apiKey, baseUrl, signal, metadata, workspacePath, logger } = input;
	const endpoint = resolveImagesEndpoint(baseUrl);
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: OPENAI_IMAGE_MODEL,
			prompt,
			size: mapAspectRatioToSize(aspectRatio),
			quality: 'medium',
			output_format: 'png',
			moderation: 'auto',
		}),
		signal,
	});

	if (!response.ok) {
		let payload: unknown;
		try {
			payload = await response.json();
		} catch {
			payload = undefined;
		}
		throw new Error(extractApiErrorMessage(payload, response.status));
	}

	const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> };
	const base64 = payload.data?.[0]?.b64_json;
	if (!base64) {
		throw new Error('Image generation returned no image data.');
	}

	const resolvedWorkspacePath = getWorkspacePath(workspacePath, metadata);
	const outputDir = resolveOutputDirectory(resolvedWorkspacePath, metadata);
	await fs.mkdir(outputDir, { recursive: true });

	const fileName = `painter-${randomUUID()}.png`;
	const filePath = path.join(outputDir, fileName);
	await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

	logger?.info('PainterImageGeneration', 'Generated image saved', {
		filePath,
		outputDir,
	});

	return {
		filePath,
		fileName,
		localUrl: toLocalResourceUrl(filePath),
	};
}
