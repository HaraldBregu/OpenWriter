// ---------------------------------------------------------------------------
// Shared AI Provider Constants — Provider Catalogue & Service Providers
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

import type { ModelDescriptor, ModelCapabilities } from './models';

// ---------------------------------------------------------------------------
// Provider descriptor
// ---------------------------------------------------------------------------

export interface ProviderDescriptor {
	id: string;
	name: string;
	models: readonly ModelDescriptor[];
}

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
// Provider IDs
// ---------------------------------------------------------------------------

export const PROVIDER_IDS = ['anthropic', 'openai', 'google', 'meta', 'mistral'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

// ---------------------------------------------------------------------------
// Provider catalogue
// ---------------------------------------------------------------------------

export const PROVIDER_CATALOGUE: readonly ProviderDescriptor[] = [
	{
		id: 'anthropic',
		name: 'Anthropic',
		models: [
			{
				id: 'claude-opus-4-6',
				name: 'Claude Opus 4.6',
				description: 'Most capable, best for complex tasks',
				contextWindow: '200K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'claude-sonnet-4-5-20250929',
				name: 'Claude Sonnet 4.5',
				description: 'Balanced performance and speed',
				contextWindow: '200K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'claude-haiku-4-5-20251001',
				name: 'Claude Haiku 4.5',
				description: 'Fastest, ideal for simple tasks',
				contextWindow: '200K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
		],
	},
	{
		id: 'openai',
		name: 'OpenAI',
		models: [
			{
				id: 'gpt-4o',
				name: 'GPT-4o',
				description: 'Most capable multimodal model',
				contextWindow: '128K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'gpt-4o-mini',
				name: 'GPT-4o mini',
				description: 'Fast and affordable',
				contextWindow: '128K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'o1',
				name: 'o1',
				description: 'Reasoning model for complex problems',
				contextWindow: '200K',
				category: 'chat',
				capabilities: REASONING,
			},
			{
				id: 'o3-mini',
				name: 'o3-mini',
				description: 'Fast reasoning at lower cost',
				contextWindow: '200K',
				category: 'chat',
				capabilities: REASONING,
			},
			{
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
		],
	},
	{
		id: 'google',
		name: 'Google',
		models: [
			{
				id: 'gemini-2-0-flash',
				name: 'Gemini 2.0 Flash',
				description: 'Fast multimodal with low latency',
				contextWindow: '1M',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'gemini-2-0-pro',
				name: 'Gemini 2.0 Pro',
				description: 'Best quality for complex reasoning',
				contextWindow: '2M',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'gemini-1-5-flash',
				name: 'Gemini 1.5 Flash',
				description: 'Efficient for high-volume tasks',
				contextWindow: '1M',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
		],
	},
	{
		id: 'meta',
		name: 'Meta',
		models: [
			{
				id: 'llama-3-3-70b',
				name: 'Llama 3.3 70B',
				description: 'Powerful open-weight model',
				contextWindow: '128K',
				category: 'chat',
				capabilities: CHAT,
			},
			{
				id: 'llama-3-2-11b',
				name: 'Llama 3.2 11B',
				description: 'Multimodal, efficient inference',
				contextWindow: '128K',
				category: 'chat',
				capabilities: VISION_CHAT,
			},
			{
				id: 'llama-3-1-8b',
				name: 'Llama 3.1 8B',
				description: 'Lightweight, fast local inference',
				contextWindow: '128K',
				category: 'chat',
				capabilities: CHAT,
			},
		],
	},
	{
		id: 'mistral',
		name: 'Mistral',
		models: [
			{
				id: 'mistral-large-2',
				name: 'Mistral Large 2',
				description: 'Top-tier reasoning and code',
				contextWindow: '128K',
				category: 'chat',
				capabilities: CHAT,
			},
			{
				id: 'mistral-small-3',
				name: 'Mistral Small 3',
				description: 'Efficient for everyday tasks',
				contextWindow: '32K',
				category: 'chat',
				capabilities: CHAT,
			},
			{
				id: 'codestral-latest',
				name: 'Codestral',
				description: 'Specialized for code generation',
				contextWindow: '256K',
				category: 'chat',
				capabilities: CHAT,
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Derived lookup map (built once at module load)
// ---------------------------------------------------------------------------

const PROVIDER_MAP: Readonly<Record<string, ProviderDescriptor>> = Object.fromEntries(
	PROVIDER_CATALOGUE.map((p) => [p.id, p])
);

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Look up a provider by ID. */
export function getProvider(providerId: string): ProviderDescriptor | undefined {
	return PROVIDER_MAP[providerId];
}

/** Find a model by ID across all providers. */
export function findModel(
	modelId: string
): { provider: ProviderDescriptor; model: ModelDescriptor } | undefined {
	for (const provider of PROVIDER_CATALOGUE) {
		const model = provider.models.find((m) => m.id === modelId);
		if (model) {
			return { provider, model };
		}
	}
	return undefined;
}

/** Get the image generation config for a model, if it supports image generation. */
export function getImageGenerationConfig(
	modelId: string
): ModelDescriptor['imageGenerationConfig'] {
	const result = findModel(modelId);
	return result?.model.imageGenerationConfig;
}

/** Get chat models for a provider (the models shown in the settings UI). */
export function getChatModelsForProvider(providerId: string): readonly ModelDescriptor[] {
	const provider = PROVIDER_MAP[providerId];
	if (!provider) return [];
	return provider.models.filter((m) => m.category === 'chat');
}

/** Get all providers with only their chat models (for UI display). */
export function getProvidersForDisplay(): readonly ProviderDescriptor[] {
	return PROVIDER_CATALOGUE.map((p) => ({
		...p,
		models: p.models.filter((m) => m.category === 'chat'),
	}));
}

/** Returns `true` if the provider ID is in the catalogue. */
export function isKnownProvider(providerId: string): providerId is ProviderId {
	return providerId in PROVIDER_MAP;
}

// ---------------------------------------------------------------------------
// Service Provider (user-configured provider connections)
// ---------------------------------------------------------------------------

export interface ServiceProvider {
	name: string;
	apikey: string;
	baseurl: string;
}

function slugify(segment: string): string {
	return segment
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function hashModelIdentity(value: string): string {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(36);
}

export function createProviderId(
	provider: Pick<ServiceProvider, 'name' | 'apikey' | 'baseurl'>,
	index: number
): string {
	return `model-${slugify(provider.name)}-${index}-${hashModelIdentity(
		[provider.name, provider.baseurl, provider.apikey].join('\u0000')
	)}`;
}

export function toProviderConfig(
	provider: ServiceProvider,
	index: number
): ServiceProvider & { id: string } {
	const normalizedName = provider.name.trim();
	return {
		id: createProviderId(
			{ name: normalizedName, apikey: provider.apikey, baseurl: provider.baseurl },
			index
		),
		name: normalizedName,
		apikey: provider.apikey,
		baseurl: provider.baseurl,
	};
}

// Re-export model types used by provider catalogue consumers
export type { ModelDescriptor, ModelCapabilities } from './models';
export type {
	ImageGenerationConfig,
	ImageSize,
	ImageQuality,
	ImageOutputFormat,
	ModelCategory,
	InferenceCapabilities,
	GenerationCapabilities,
} from './models';
