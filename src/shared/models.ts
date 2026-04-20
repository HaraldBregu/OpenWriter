// ---------------------------------------------------------------------------
// Shared AI Model Constants — Flagship Model Registry
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type {
	ProviderId,
	ModelType,
	ModelInfo,
	ModelCapabilities,
	ModelDescriptor,
	ImageGenerationConfig,
} from './types';

// ---------------------------------------------------------------------------
// Capability presets (reduce boilerplate in catalogue entries)
// ---------------------------------------------------------------------------

const VISION_CHAT: ModelCapabilities = {
	inference: { reasoning: false, vision: true, streaming: true },
	generation: { imageGeneration: false, embeddings: false },
};

const REASONING: ModelCapabilities = {
	inference: { reasoning: true, vision: false, streaming: false },
	generation: { imageGeneration: false, embeddings: false },
};

// ---------------------------------------------------------------------------
// Reasoning prefix fallback (catches date-stamped variants like "o1-2024-12-17")
// ---------------------------------------------------------------------------

const REASONING_PREFIXES = ['o1', 'o3', 'o4-mini', 'o3-mini', 'o1-mini', 'o1-preview'] as const;

// ---------------------------------------------------------------------------
// Default model IDs
// ---------------------------------------------------------------------------

export const DEFAULT_EMBEDDING_MODEL_ID = 'text-embedding-3-small';
export const DEFAULT_IMAGE_MODEL_ID = 'gpt-image-1';
export const DEFAULT_OCR_MODEL_ID = '';

// ---------------------------------------------------------------------------
// Flagship model registry
// ---------------------------------------------------------------------------

export const AI_MODELS: readonly ModelInfo[] = [
	// ========================== OpenAI ========================================
	{
		providerId: 'openai',
		modelId: 'gpt-5.4',
		name: 'GPT-5.4',
		type: 'multimodal',
		contextWindow: 1050000,
		maxOutputTokens: 128000,
		notes: 'Flagship unified reasoning + coding + agent model',
	},
	{
		providerId: 'openai',
		modelId: 'gpt-5.4-mini',
		name: 'GPT-5.4 Mini',
		type: 'multimodal',
		contextWindow: 400000,
		maxOutputTokens: 128000,
	},
	{
		providerId: 'openai',
		modelId: 'gpt-4.1',
		name: 'GPT-4.1',
		type: 'multimodal',
		contextWindow: 1047576,
		maxOutputTokens: 32768,
	},
	{
		providerId: 'openai',
		modelId: 'o3',
		name: 'o3',
		type: 'reasoning',
		contextWindow: 200000,
		maxOutputTokens: 100000,
	},
	{
		providerId: 'openai',
		modelId: 'o4-mini',
		name: 'o4 Mini',
		type: 'reasoning',
		contextWindow: 200000,
		maxOutputTokens: 100000,
	},
	{
		providerId: 'openai',
		modelId: 'gpt-image-1',
		name: 'GPT Image 1',
		type: 'image',
		contextWindow: null,
		maxOutputTokens: null,
	},
	{
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		name: 'Text Embedding 3 Small',
		type: 'embedding',
		contextWindow: 8191,
		maxOutputTokens: null,
	},

	// ========================== Anthropic =====================================
	{
		providerId: 'anthropic',
		modelId: 'claude-opus-4-6',
		name: 'Claude Opus 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 128000,
	},
	{
		providerId: 'anthropic',
		modelId: 'claude-sonnet-4-6',
		name: 'Claude Sonnet 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 64000,
	},
	{
		providerId: 'anthropic',
		modelId: 'claude-haiku-4-5-20251001',
		name: 'Claude Haiku 4.5',
		type: 'multimodal',
		contextWindow: 200000,
		maxOutputTokens: 64000,
	},
] as const;

// ---------------------------------------------------------------------------
// Pre-filtered model collections
// ---------------------------------------------------------------------------

/** All models whose type is `'image'` (e.g. GPT Image 1). */
export const IMAGE_MODELS: readonly ModelInfo[] = AI_MODELS.filter((m) => m.type === 'image');

/** Models suitable for text generation: text, multimodal, and code types. */
export const TEXT_MODELS: readonly ModelInfo[] = AI_MODELS.filter(
	(m) => m.type === 'text' || m.type === 'multimodal' || m.type === 'code'
);

/** Dedicated OCR models. Empty — no OCR provider available. */
export const OCR_MODELS: readonly ModelInfo[] = AI_MODELS.filter((m) => m.type === 'ocr');

export const DEFAULT_OCR_MODEL: ModelInfo | null =
	OCR_MODELS.find((m) => m.modelId === DEFAULT_OCR_MODEL_ID) ?? null;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get all models for a specific provider. */
export function getModelsByProvider(providerId: ProviderId): readonly ModelInfo[] {
	return AI_MODELS.filter((m) => m.providerId === providerId);
}

/** Get all models of a specific type. */
export function getModelsByType(type: ModelType): readonly ModelInfo[] {
	return AI_MODELS.filter((m) => m.type === type);
}

/** Find a model by its model ID. */
export function findModelById(modelId: string): ModelInfo | undefined {
	return AI_MODELS.find((m) => m.modelId === modelId);
}

/** Returns `true` when `modelId` matches a known reasoning model. */
export function isReasoningModel(modelId: string): boolean {
	const normalized = modelId.toLowerCase();

	const match = AI_MODELS.find((m) => m.modelId.toLowerCase() === normalized);
	if (match) {
		return match.type === 'reasoning';
	}

	return REASONING_PREFIXES.some(
		(prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`)
	);
}

// ---------------------------------------------------------------------------
// Model catalogue (provider-facing model descriptors for the settings UI)
// ---------------------------------------------------------------------------

export const MODEL_CATALOGUE: readonly ModelDescriptor[] = [
	// ---- Anthropic
	{
		providerId: 'anthropic',
		id: 'claude-opus-4-6',
		name: 'Claude Opus 4.6',
		description: 'Most capable, best for complex tasks',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'anthropic',
		id: 'claude-sonnet-4-6',
		name: 'Claude Sonnet 4.6',
		description: 'Balanced performance and speed',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'anthropic',
		id: 'claude-haiku-4-5-20251001',
		name: 'Claude Haiku 4.5',
		description: 'Fastest, ideal for simple tasks',
		contextWindow: '200K',
		category: 'chat',
		capabilities: VISION_CHAT,
	},

	// ---- OpenAI
	{
		providerId: 'openai',
		id: 'gpt-5.4',
		name: 'GPT-5.4',
		description: 'Flagship reasoning and coding model',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'openai',
		id: 'gpt-5.4-mini',
		name: 'GPT-5.4 Mini',
		description: 'Fast and efficient for high-volume tasks',
		contextWindow: '400K',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'openai',
		id: 'gpt-4.1',
		name: 'GPT-4.1',
		description: 'Specialized for coding tasks',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'openai',
		id: 'o3',
		name: 'o3',
		description: 'Advanced reasoning model',
		contextWindow: '200K',
		category: 'chat',
		capabilities: REASONING,
	},
	{
		providerId: 'openai',
		id: 'o4-mini',
		name: 'o4 Mini',
		description: 'Fast reasoning at lower cost',
		contextWindow: '200K',
		category: 'chat',
		capabilities: REASONING,
	},
	{
		providerId: 'openai',
		id: 'gpt-image-1',
		name: 'GPT Image 1',
		description: 'Image generation from text prompts',
		contextWindow: 'N/A',
		category: 'image',
		capabilities: {
			inference: { reasoning: false, vision: true, streaming: false },
			generation: { imageGeneration: true, embeddings: false },
		},
		imageGenerationConfig: {
			defaultSize: '1536x1024',
			defaultQuality: 'low',
			maxImagesPerRequest: 1,
			outputFormat: 'b64_json',
			supportedSizes: ['1024x1024', '1024x1792', '1792x1024', '1536x1024', '1024x1536'],
			supportedQualities: ['low', 'medium', 'high'],
		},
	},
	{
		providerId: 'openai',
		id: 'text-embedding-3-small',
		name: 'Text Embedding 3 Small',
		description: 'Efficient text embeddings',
		contextWindow: '8K',
		category: 'embedding',
		capabilities: {
			inference: { reasoning: false, vision: false, streaming: false },
			generation: { imageGeneration: false, embeddings: true },
		},
	},
];

// ---------------------------------------------------------------------------
// Model catalogue query helpers
// ---------------------------------------------------------------------------

/** Find a model descriptor by ID across the catalogue. */
export function findCatalogueModel(modelId: string): ModelDescriptor | undefined {
	return MODEL_CATALOGUE.find((m) => m.id === modelId);
}

/** Get the image generation config for a catalogue model, if it supports it. */
export function getImageGenerationConfig(modelId: string): ImageGenerationConfig | undefined {
	return findCatalogueModel(modelId)?.imageGenerationConfig;
}

/** Get chat models for a provider (the models shown in the settings UI). */
export function getChatModelsForProvider(providerId: string): readonly ModelDescriptor[] {
	return MODEL_CATALOGUE.filter((m) => m.providerId === providerId && m.category === 'chat');
}
