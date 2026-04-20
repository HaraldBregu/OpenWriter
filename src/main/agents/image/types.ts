export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
export type ImageResponseFormat = 'url' | 'b64_json';

export interface ImageAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	size?: ImageSize;
	count?: number;
	responseFormat?: ImageResponseFormat;
}

export interface GeneratedImage {
	url?: string;
	b64?: string;
}

export interface ImageAgentOutput {
	images: GeneratedImage[];
	model: string;
}
