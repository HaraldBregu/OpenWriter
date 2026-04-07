import type { LoggerService } from '../../services/logger';

export type VisionProvider = 'openai';
export type VisionModel = 'gpt-image-1' | 'dall-e-3' | 'dall-e-2';
export type VisionSize = '1024x1024' | '1024x1536' | '1536x1024';
export type VisionQuality = 'low' | 'medium' | 'high' | 'auto';
export type VisionFormat = 'png' | 'jpeg' | 'webp';

export interface VisionAgent {
	readonly apiKey: string;
	readonly url?: string;
	readonly provider: VisionProvider;
	readonly model: VisionModel;
	readonly size: VisionSize;
	readonly quality: VisionQuality;
	readonly format: VisionFormat;
}

export interface GenerateImageInput {
	readonly agent: VisionAgent;
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
