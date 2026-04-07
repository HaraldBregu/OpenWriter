import type { LoggerService } from '../../services/logger';

export type ImageModel = 'gpt-image-1' | 'dall-e-3' | 'dall-e-2';
export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface ImageGenerationConfig {
	readonly apiKey: string;
	readonly baseUrl?: string;
	readonly model: ImageModel;
	readonly size: ImageSize;
	readonly quality: ImageQuality;
	readonly format: ImageFormat;
}

export interface GenerateImageInput {
	readonly config: ImageGenerationConfig;
	readonly prompt: string;
	readonly signal?: AbortSignal;
	readonly metadata?: Record<string, unknown>;
	readonly workspacePath?: string | null;
	readonly logger?: LoggerService;
}

export interface GeneratedImage {
	readonly filePath: string;
	readonly fileName: string;
	readonly localUrl: string;
}
