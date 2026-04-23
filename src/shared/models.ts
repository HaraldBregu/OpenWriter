// ---------------------------------------------------------------------------
// Shared AI Model Constants — Flagship Model Registry
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type { ProviderId, ModelType, ModelInfo } from './types';

const REASONING_PREFIXES = ['o1', 'o3', 'o4-mini', 'o3-mini', 'o1-mini', 'o1-preview'] as const;

// ---------------------------------------------------------------------------
// Named model constants (single source of truth for each current model)
// ---------------------------------------------------------------------------

// OpenAI
export const GPT_5_4: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-5.4',
	name: 'GPT-5.4',
	type: 'multimodal',
	contextWindow: 1050000,
	maxOutputTokens: 128000,
	notes: 'Flagship unified reasoning + coding + agent model',
};

export const GPT_5_4_MINI: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-5.4-mini',
	name: 'GPT-5.4 Mini',
	type: 'multimodal',
	contextWindow: 400000,
	maxOutputTokens: 128000,
};

export const GPT_4_1: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-4.1',
	name: 'GPT-4.1',
	type: 'multimodal',
	contextWindow: 1047576,
	maxOutputTokens: 32768,
};

export const O3: ModelInfo = {
	providerId: 'openai',
	modelId: 'o3',
	name: 'o3',
	type: 'reasoning',
	contextWindow: 200000,
	maxOutputTokens: 100000,
};

export const O4_MINI: ModelInfo = {
	providerId: 'openai',
	modelId: 'o4-mini',
	name: 'o4 Mini',
	type: 'reasoning',
	contextWindow: 200000,
	maxOutputTokens: 100000,
};

export const GPT_IMAGE_1: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-image-1',
	name: 'GPT Image 1',
	type: 'image',
	contextWindow: null,
	maxOutputTokens: null,
};

export const TEXT_EMBEDDING_3_SMALL: ModelInfo = {
	providerId: 'openai',
	modelId: 'text-embedding-3-small',
	name: 'Text Embedding 3 Small',
	type: 'embedding',
	contextWindow: 8191,
	maxOutputTokens: null,
};

export const WHISPER_1: ModelInfo = {
	providerId: 'openai',
	modelId: 'whisper-1',
	name: 'Whisper v1',
	type: 'audio',
	contextWindow: null,
	maxOutputTokens: null,
};

export const GPT_4O_TRANSCRIBE: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-4o-transcribe',
	name: 'GPT-4o Transcribe',
	type: 'audio',
	contextWindow: null,
	maxOutputTokens: null,
};

export const GPT_4O_MINI_TRANSCRIBE: ModelInfo = {
	providerId: 'openai',
	modelId: 'gpt-4o-mini-transcribe',
	name: 'GPT-4o Mini Transcribe',
	type: 'audio',
	contextWindow: null,
	maxOutputTokens: null,
};

// Anthropic
export const CLAUDE_OPUS_4_6: ModelInfo = {
	providerId: 'anthropic',
	modelId: 'claude-opus-4-6',
	name: 'Claude Opus 4.6',
	type: 'multimodal',
	contextWindow: 1000000,
	maxOutputTokens: 128000,
};

export const CLAUDE_SONNET_4_6: ModelInfo = {
	providerId: 'anthropic',
	modelId: 'claude-sonnet-4-6',
	name: 'Claude Sonnet 4.6',
	type: 'multimodal',
	contextWindow: 1000000,
	maxOutputTokens: 64000,
};

export const CLAUDE_HAIKU_4_5: ModelInfo = {
	providerId: 'anthropic',
	modelId: 'claude-haiku-4-5-20251001',
	name: 'Claude Haiku 4.5',
	type: 'multimodal',
	contextWindow: 200000,
	maxOutputTokens: 64000,
};

// ---------------------------------------------------------------------------
// Flagship model registry
// ---------------------------------------------------------------------------

export const AI_MODELS: readonly ModelInfo[] = [
	GPT_5_4,
	GPT_5_4_MINI,
	GPT_4_1,
	O3,
	O4_MINI,
	GPT_IMAGE_1,
	TEXT_EMBEDDING_3_SMALL,
	CLAUDE_OPUS_4_6,
	CLAUDE_SONNET_4_6,
	CLAUDE_HAIKU_4_5,
] as const;

// ---------------------------------------------------------------------------
// Default model IDs
// ---------------------------------------------------------------------------

export const DEFAULT_TEXT_MODEL_ID = GPT_4_1.modelId;
export const DEFAULT_EMBEDDING_MODEL_ID = TEXT_EMBEDDING_3_SMALL.modelId;
export const DEFAULT_IMAGE_MODEL_ID = GPT_IMAGE_1.modelId;
export const DEFAULT_OCR_MODEL_ID = '';

// ---------------------------------------------------------------------------
// Pre-filtered model collections
// ---------------------------------------------------------------------------

export const IMAGE_MODELS: readonly ModelInfo[] = AI_MODELS.filter((m) => m.type === 'image');

export const TEXT_MODELS: readonly ModelInfo[] = AI_MODELS.filter(
	(m) => m.type === 'text' || m.type === 'multimodal' || m.type === 'code'
);

export const OCR_MODELS: readonly ModelInfo[] = AI_MODELS.filter((m) => m.type === 'ocr');

export const DEFAULT_OCR_MODEL: ModelInfo | null =
	OCR_MODELS.find((m) => m.modelId === DEFAULT_OCR_MODEL_ID) ?? null;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getModelsByProvider(providerId: ProviderId): readonly ModelInfo[] {
	return AI_MODELS.filter((m) => m.providerId === providerId);
}

export function getModelsByType(type: ModelType): readonly ModelInfo[] {
	return AI_MODELS.filter((m) => m.type === type);
}

export function findModelById(modelId: string): ModelInfo | undefined {
	return AI_MODELS.find((m) => m.modelId === modelId);
}

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
