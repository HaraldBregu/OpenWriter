// ---------------------------------------------------------------------------
// Shared AI Model Constants — Flagship Model Registry
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type {
	AppProviderName,
	ModelType,
	ModelInfo,
	ModelCapabilities,
	ModelDescriptor,
	ImageGenerationConfig,
} from './types';

// ---------------------------------------------------------------------------
// Capability presets (reduce boilerplate in catalogue entries)
// ---------------------------------------------------------------------------

const CHAT: ModelCapabilities = {
	inference: { reasoning: false, vision: false, streaming: true },
	generation: { imageGeneration: false, embeddings: false },
};

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
export const DEFAULT_OCR_MODEL_ID = 'mistral-ocr-latest';

// ---------------------------------------------------------------------------
// Flagship model registry
// ---------------------------------------------------------------------------

export const AI_MODELS: readonly ModelInfo[] = [
	// ========================== OpenAI ========================================
	{
		provider: 'OpenAI',
		modelId: 'gpt-5.4',
		name: 'GPT-5.4',
		type: 'multimodal',
		contextWindow: 1050000,
		maxOutputTokens: 128000,
		notes: 'Flagship unified reasoning + coding + agent model',
	},
	{
		provider: 'OpenAI',
		modelId: 'gpt-5.4-mini',
		name: 'GPT-5.4 Mini',
		type: 'multimodal',
		contextWindow: 400000,
		maxOutputTokens: 128000,
	},
	{
		provider: 'OpenAI',
		modelId: 'gpt-4.1',
		name: 'GPT-4.1',
		type: 'multimodal',
		contextWindow: 1047576,
		maxOutputTokens: 32768,
	},
	{
		provider: 'OpenAI',
		modelId: 'o3',
		name: 'o3',
		type: 'reasoning',
		contextWindow: 200000,
		maxOutputTokens: 100000,
	},
	{
		provider: 'OpenAI',
		modelId: 'o4-mini',
		name: 'o4 Mini',
		type: 'reasoning',
		contextWindow: 200000,
		maxOutputTokens: 100000,
	},
	{
		provider: 'OpenAI',
		modelId: 'gpt-image-1',
		name: 'GPT Image 1',
		type: 'image',
		contextWindow: null,
		maxOutputTokens: null,
	},
	{
		provider: 'OpenAI',
		modelId: 'text-embedding-3-small',
		name: 'Text Embedding 3 Small',
		type: 'embedding',
		contextWindow: 8191,
		maxOutputTokens: null,
	},

	// ========================== Anthropic =====================================
	{
		provider: 'Anthropic',
		modelId: 'claude-opus-4-6',
		name: 'Claude Opus 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 128000,
	},
	{
		provider: 'Anthropic',
		modelId: 'claude-sonnet-4-6',
		name: 'Claude Sonnet 4.6',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 64000,
	},
	{
		provider: 'Anthropic',
		modelId: 'claude-haiku-4-5-20251001',
		name: 'Claude Haiku 4.5',
		type: 'multimodal',
		contextWindow: 200000,
		maxOutputTokens: 64000,
	},

	// ========================== Google ========================================
	{
		provider: 'Google',
		modelId: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		type: 'multimodal',
		contextWindow: 2000000,
		maxOutputTokens: 65536,
	},
	{
		provider: 'Google',
		modelId: 'gemini-2.5-pro',
		name: 'Gemini 2.5 Pro',
		type: 'multimodal',
		contextWindow: 1048576,
		maxOutputTokens: 65536,
	},
	{
		provider: 'Google',
		modelId: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		type: 'multimodal',
		contextWindow: 1048576,
		maxOutputTokens: 65536,
	},

	// ========================== Meta ==========================================
	{
		provider: 'Meta',
		modelId: 'llama-4-scout-17b-16e-instruct',
		name: 'Llama 4 Scout',
		type: 'multimodal',
		contextWindow: 10000000,
		maxOutputTokens: 16384,
	},
	{
		provider: 'Meta',
		modelId: 'llama-4-maverick-17b-128e-instruct',
		name: 'Llama 4 Maverick',
		type: 'multimodal',
		contextWindow: 1048576,
		maxOutputTokens: 16384,
	},

	// ========================== Mistral =======================================
	{
		provider: 'Mistral',
		modelId: 'mistral-large-latest',
		name: 'Mistral Large',
		type: 'multimodal',
		contextWindow: 262144,
		maxOutputTokens: 8192,
	},
	{
		provider: 'Mistral',
		modelId: 'codestral-latest',
		name: 'Codestral',
		type: 'code',
		contextWindow: 262144,
		maxOutputTokens: 8192,
	},
	{
		provider: 'Mistral',
		modelId: 'mistral-ocr-latest',
		name: 'Mistral OCR',
		type: 'ocr',
		contextWindow: 262144,
		maxOutputTokens: 8192,
	},

	// ========================== Cohere ========================================
	{
		provider: 'Cohere',
		modelId: 'command-a-03-2025',
		name: 'Command A',
		type: 'text',
		contextWindow: 256000,
		maxOutputTokens: 8192,
	},

	// ========================== xAI ===========================================
	{
		provider: 'xAI',
		modelId: 'grok-4.20-0309-non-reasoning',
		name: 'Grok 4.20',
		type: 'text',
		contextWindow: 2000000,
		maxOutputTokens: 16384,
	},
	{
		provider: 'xAI',
		modelId: 'grok-4.20-0309-reasoning',
		name: 'Grok 4.20 Reasoning',
		type: 'reasoning',
		contextWindow: 2000000,
		maxOutputTokens: 16384,
	},

	// ========================== Amazon ========================================
	{
		provider: 'Amazon',
		modelId: 'amazon.nova-2-pro-v1:0',
		name: 'Nova 2 Pro',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 16384,
	},
	{
		provider: 'Amazon',
		modelId: 'amazon.nova-2-lite-v1:0',
		name: 'Nova 2 Lite',
		type: 'multimodal',
		contextWindow: 1000000,
		maxOutputTokens: 16384,
	},

	// ========================== DeepSeek ======================================
	{
		provider: 'DeepSeek',
		modelId: 'deepseek-chat',
		name: 'DeepSeek V3',
		type: 'text',
		contextWindow: 128000,
		maxOutputTokens: 8192,
	},
	{
		provider: 'DeepSeek',
		modelId: 'deepseek-reasoner',
		name: 'DeepSeek R1',
		type: 'reasoning',
		contextWindow: 128000,
		maxOutputTokens: 65536,
	},

	// ========================== Qwen (Alibaba) ================================
	{
		provider: 'Qwen',
		modelId: 'qwen3.6-plus',
		name: 'Qwen 3.6 Plus',
		type: 'text',
		contextWindow: 1000000,
		maxOutputTokens: 65536,
	},
	{
		provider: 'Qwen',
		modelId: 'qwen3.5-flash',
		name: 'Qwen 3.5 Flash',
		type: 'text',
		contextWindow: 1000000,
		maxOutputTokens: 65536,
	},

	// ========================== Inception =====================================
	{
		provider: 'Inception',
		modelId: 'mercury-coder-small',
		name: 'Mercury Coder Small',
		type: 'code',
		contextWindow: 32768,
		maxOutputTokens: 8192,
	},

	// ========================== Zhipu AI (GLM) ================================
	{
		provider: 'Zhipu AI',
		modelId: 'glm-4-plus',
		name: 'GLM-4 Plus',
		type: 'text',
		contextWindow: 128000,
		maxOutputTokens: 4096,
	},

	// ========================== Perplexity ====================================
	{
		provider: 'Perplexity',
		modelId: 'sonar-pro',
		name: 'Sonar Pro',
		type: 'text',
		contextWindow: 200000,
		maxOutputTokens: 8192,
	},
	{
		provider: 'Perplexity',
		modelId: 'sonar-reasoning-pro',
		name: 'Sonar Reasoning Pro',
		type: 'reasoning',
		contextWindow: 127072,
		maxOutputTokens: 8192,
	},

	// ========================== AI21 Labs =====================================
	{
		provider: 'AI21 Labs',
		modelId: 'jamba-1.5-large',
		name: 'Jamba 1.5 Large',
		type: 'text',
		contextWindow: 256000,
		maxOutputTokens: 4096,
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

/** Dedicated OCR models (Mistral OCR, Qwen VL OCR). */
export const OCR_MODELS: readonly ModelInfo[] = AI_MODELS.filter((m) => m.type === 'ocr');

const _defaultOcrModel = OCR_MODELS.find((m) => m.modelId === DEFAULT_OCR_MODEL_ID);
if (!_defaultOcrModel) {
	throw new Error(`Default OCR model "${DEFAULT_OCR_MODEL_ID}" not found in OCR_MODELS`);
}
export const DEFAULT_OCR_MODEL: ModelInfo = _defaultOcrModel;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get all models for a specific provider. */
export function getModelsByProvider(provider: AppProviderName): readonly ModelInfo[] {
	return AI_MODELS.filter((m) => m.provider === provider);
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

	// ---- Google
	{
		providerId: 'google',
		id: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		description: 'Most advanced reasoning model',
		contextWindow: '2M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'google',
		id: 'gemini-2.5-pro',
		name: 'Gemini 2.5 Pro',
		description: 'Advanced reasoning, stable release',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'google',
		id: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		description: 'Fast multimodal with low latency',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},

	// ---- Meta
	{
		providerId: 'meta',
		id: 'llama-4-scout-17b-16e-instruct',
		name: 'Llama 4 Scout',
		description: 'Efficient multimodal with 10M context',
		contextWindow: '10M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'meta',
		id: 'llama-4-maverick-17b-128e-instruct',
		name: 'Llama 4 Maverick',
		description: 'Powerful open-weight multimodal',
		contextWindow: '1M',
		category: 'chat',
		capabilities: VISION_CHAT,
	},

	// ---- Mistral
	{
		providerId: 'mistral',
		id: 'mistral-large-latest',
		name: 'Mistral Large',
		description: 'Flagship multimodal reasoning',
		contextWindow: '256K',
		category: 'chat',
		capabilities: VISION_CHAT,
	},
	{
		providerId: 'mistral',
		id: 'codestral-latest',
		name: 'Codestral',
		description: 'Specialized for code generation',
		contextWindow: '256K',
		category: 'chat',
		capabilities: CHAT,
	},

	// ---- xAI
	{
		providerId: 'xai',
		id: 'grok-4.20-0309-non-reasoning',
		name: 'Grok 4.20',
		description: 'Flagship model with 2M context',
		contextWindow: '2M',
		category: 'chat',
		capabilities: CHAT,
	},
	{
		providerId: 'xai',
		id: 'grok-4.20-0309-reasoning',
		name: 'Grok 4.20 Reasoning',
		description: 'Advanced reasoning model',
		contextWindow: '2M',
		category: 'chat',
		capabilities: REASONING,
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
