import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { VisionAgent, GenerateImageInput, GeneratedImage } from './types';

export function createVisionAgent(overrides?: Partial<VisionAgent>): VisionAgent {
	return {
		apiKey: overrides?.apiKey ?? '',
		url: overrides?.url,
		provider: overrides?.provider ?? 'openai',
		model: overrides?.model ?? 'gpt-image-1',
		size: overrides?.size ?? '1024x1024',
		quality: overrides?.quality ?? 'medium',
		format: overrides?.format ?? 'png',
	};
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
	const { agent, prompt, signal, metadata, workspacePath, logger } = input;

	const client = new OpenAI({
		apiKey: agent.apiKey,
		...(agent.url ? { baseURL: agent.url } : {}),
	});

	const response = await client.images.generate(
		{
			model: agent.model,
			prompt,
			size: agent.size,
			quality: agent.quality,
			output_format: agent.format,
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

	const fileName = `image-generator-${randomUUID()}.${agent.format}`;
	const filePath = path.join(outputDir, fileName);
	await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

	logger?.info('ImageGenerator', 'Generated image saved', { filePath, outputDir });

	return {
		filePath,
		fileName,
		localUrl: toLocalResourceUrl(filePath),
	};
}
