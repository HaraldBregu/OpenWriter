// ---------------------------------------------------------------------------
// Shared AI Model Constants — Comprehensive Model Registry
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Provider type
// ---------------------------------------------------------------------------

export type AppProviderNameName =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google'
  | 'Meta'
  | 'Mistral'
  | 'Cohere'
  | 'xAI'
  | 'Amazon'
  | 'DeepSeek'
  | 'Qwen'
  | 'Inception'
  | 'Zhipu AI'
  | 'Perplexity'
  | 'AI21 Labs';

// ---------------------------------------------------------------------------
// Model type
// ---------------------------------------------------------------------------

export type ModelType =
  | 'text'
  | 'image'
  | 'video'
  | 'multimodal'
  | 'embedding'
  | 'audio'
  | 'code'
  | 'reasoning';

// ---------------------------------------------------------------------------
// Model info
// ---------------------------------------------------------------------------

export interface ModelInfo {
  readonly provider: AppProviderName;
  readonly modelId: string;
  readonly name: string;
  readonly type: ModelType;
  readonly contextWindow: number | null;
  readonly maxOutputTokens: number | null;
}

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

export const AI_MODELS: readonly ModelInfo[] = [
  // ========================== OpenAI ========================================
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
    modelId: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    type: 'multimodal',
    contextWindow: 1047576,
    maxOutputTokens: 32768,
  },
  {
    provider: 'OpenAI',
    modelId: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    type: 'multimodal',
    contextWindow: 1047576,
    maxOutputTokens: 32768,
  },
  {
    provider: 'OpenAI',
    modelId: 'gpt-4o',
    name: 'GPT-4o',
    type: 'multimodal',
    contextWindow: 128000,
    maxOutputTokens: 16384,
  },
  {
    provider: 'OpenAI',
    modelId: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    type: 'multimodal',
    contextWindow: 128000,
    maxOutputTokens: 16384,
  },
  {
    provider: 'OpenAI',
    modelId: 'o1',
    name: 'o1',
    type: 'reasoning',
    contextWindow: 200000,
    maxOutputTokens: 100000,
  },
  {
    provider: 'OpenAI',
    modelId: 'o1-mini',
    name: 'o1 Mini',
    type: 'reasoning',
    contextWindow: 128000,
    maxOutputTokens: 65536,
  },
  {
    provider: 'OpenAI',
    modelId: 'o1-pro',
    name: 'o1 Pro',
    type: 'reasoning',
    contextWindow: 200000,
    maxOutputTokens: 100000,
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
    modelId: 'o3-mini',
    name: 'o3 Mini',
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
    modelId: 'dall-e-3',
    name: 'DALL-E 3',
    type: 'image',
    contextWindow: 4000,
    maxOutputTokens: null,
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
    modelId: 'whisper-1',
    name: 'Whisper',
    type: 'audio',
    contextWindow: null,
    maxOutputTokens: null,
  },
  {
    provider: 'OpenAI',
    modelId: 'tts-1',
    name: 'TTS',
    type: 'audio',
    contextWindow: 4096,
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
  {
    provider: 'OpenAI',
    modelId: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    type: 'embedding',
    contextWindow: 8191,
    maxOutputTokens: null,
  },

  // ========================== Anthropic =====================================
  {
    provider: 'Anthropic',
    modelId: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    type: 'multimodal',
    contextWindow: 200000,
    maxOutputTokens: 32000,
  },
  {
    provider: 'Anthropic',
    modelId: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    type: 'multimodal',
    contextWindow: 200000,
    maxOutputTokens: 16000,
  },
  {
    provider: 'Anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku 3.5',
    type: 'multimodal',
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },

  // ========================== Google ========================================
  {
    provider: 'Google',
    modelId: 'gemini-2.5-pro-preview-05-06',
    name: 'Gemini 2.5 Pro',
    type: 'multimodal',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
  },
  {
    provider: 'Google',
    modelId: 'gemini-2.5-flash-preview-04-17',
    name: 'Gemini 2.5 Flash',
    type: 'multimodal',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
  },
  {
    provider: 'Google',
    modelId: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    type: 'multimodal',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Google',
    modelId: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    type: 'multimodal',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Google',
    modelId: 'gemini-embedding-exp',
    name: 'Gemini Embedding',
    type: 'embedding',
    contextWindow: 8192,
    maxOutputTokens: null,
  },
  {
    provider: 'Google',
    modelId: 'imagen-3.0-generate-002',
    name: 'Imagen 3',
    type: 'image',
    contextWindow: null,
    maxOutputTokens: null,
  },
  {
    provider: 'Google',
    modelId: 'veo-2.0-generate-001',
    name: 'Veo 2',
    type: 'video',
    contextWindow: null,
    maxOutputTokens: null,
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
  {
    provider: 'Meta',
    modelId: 'llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },
  {
    provider: 'Meta',
    modelId: 'llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 11B Vision',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },
  {
    provider: 'Meta',
    modelId: 'llama-3.2-90b-vision-instruct',
    name: 'Llama 3.2 90B Vision',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },
  {
    provider: 'Meta',
    modelId: 'llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },

  // ========================== Mistral =======================================
  {
    provider: 'Mistral',
    modelId: 'mistral-large-latest',
    name: 'Mistral Large',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Mistral',
    modelId: 'mistral-small-latest',
    name: 'Mistral Small',
    type: 'text',
    contextWindow: 32768,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Mistral',
    modelId: 'mistral-medium-latest',
    name: 'Mistral Medium',
    type: 'text',
    contextWindow: 131072,
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
    modelId: 'pixtral-large-latest',
    name: 'Pixtral Large',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Mistral',
    modelId: 'pixtral-12b-2409',
    name: 'Pixtral 12B',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Mistral',
    modelId: 'mistral-embed',
    name: 'Mistral Embed',
    type: 'embedding',
    contextWindow: 8192,
    maxOutputTokens: null,
  },

  // ========================== Cohere ========================================
  {
    provider: 'Cohere',
    modelId: 'command-r-plus-08-2024',
    name: 'Command R+',
    type: 'text',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    provider: 'Cohere',
    modelId: 'command-r-08-2024',
    name: 'Command R',
    type: 'text',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    provider: 'Cohere',
    modelId: 'command-a-03-2025',
    name: 'Command A',
    type: 'text',
    contextWindow: 256000,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Cohere',
    modelId: 'embed-v4.0',
    name: 'Embed v4',
    type: 'embedding',
    contextWindow: 128000,
    maxOutputTokens: null,
  },
  {
    provider: 'Cohere',
    modelId: 'c4ai-aya-expanse-32b',
    name: 'Aya Expanse 32B',
    type: 'text',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },

  // ========================== xAI ===========================================
  {
    provider: 'xAI',
    modelId: 'grok-3',
    name: 'Grok 3',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },
  {
    provider: 'xAI',
    modelId: 'grok-3-mini',
    name: 'Grok 3 Mini',
    type: 'reasoning',
    contextWindow: 131072,
    maxOutputTokens: 16384,
  },
  {
    provider: 'xAI',
    modelId: 'grok-2-1212',
    name: 'Grok 2',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'xAI',
    modelId: 'grok-2-vision-1212',
    name: 'Grok 2 Vision',
    type: 'multimodal',
    contextWindow: 32768,
    maxOutputTokens: 8192,
  },
  {
    provider: 'xAI',
    modelId: 'aurora',
    name: 'Aurora',
    type: 'image',
    contextWindow: null,
    maxOutputTokens: null,
  },

  // ========================== Amazon ========================================
  {
    provider: 'Amazon',
    modelId: 'amazon.nova-pro-v1:0',
    name: 'Nova Pro',
    type: 'multimodal',
    contextWindow: 300000,
    maxOutputTokens: 5120,
  },
  {
    provider: 'Amazon',
    modelId: 'amazon.nova-lite-v1:0',
    name: 'Nova Lite',
    type: 'multimodal',
    contextWindow: 300000,
    maxOutputTokens: 5120,
  },
  {
    provider: 'Amazon',
    modelId: 'amazon.nova-micro-v1:0',
    name: 'Nova Micro',
    type: 'text',
    contextWindow: 128000,
    maxOutputTokens: 5120,
  },
  {
    provider: 'Amazon',
    modelId: 'amazon.nova-canvas-v1:0',
    name: 'Nova Canvas',
    type: 'image',
    contextWindow: null,
    maxOutputTokens: null,
  },
  {
    provider: 'Amazon',
    modelId: 'amazon.nova-reel-v1:0',
    name: 'Nova Reel',
    type: 'video',
    contextWindow: null,
    maxOutputTokens: null,
  },

  // ========================== DeepSeek ======================================
  {
    provider: 'DeepSeek',
    modelId: 'deepseek-chat',
    name: 'DeepSeek V3',
    type: 'text',
    contextWindow: 65536,
    maxOutputTokens: 8192,
  },
  {
    provider: 'DeepSeek',
    modelId: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    type: 'reasoning',
    contextWindow: 65536,
    maxOutputTokens: 8192,
  },
  {
    provider: 'DeepSeek',
    modelId: 'deepseek-coder',
    name: 'DeepSeek Coder V2',
    type: 'code',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },

  // ========================== Qwen (Alibaba) ================================
  {
    provider: 'Qwen',
    modelId: 'qwen-max',
    name: 'Qwen 2.5 Max',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Qwen',
    modelId: 'qwen-plus',
    name: 'Qwen 2.5 Plus',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Qwen',
    modelId: 'qwen2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    type: 'text',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Qwen',
    modelId: 'qwen2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    type: 'code',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Qwen',
    modelId: 'qwen-vl-max',
    name: 'Qwen-VL Max',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 8192,
  },
  {
    provider: 'Qwen',
    modelId: 'qvq-72b-preview',
    name: 'QVQ 72B',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutputTokens: 8192,
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
  {
    provider: 'Inception',
    modelId: 'mercury-coder-mini',
    name: 'Mercury Coder Mini',
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
  {
    provider: 'Zhipu AI',
    modelId: 'glm-4-air',
    name: 'GLM-4 Air',
    type: 'text',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    provider: 'Zhipu AI',
    modelId: 'glm-4v-plus',
    name: 'GLM-4V Plus',
    type: 'multimodal',
    contextWindow: 8192,
    maxOutputTokens: 4096,
  },
  {
    provider: 'Zhipu AI',
    modelId: 'cogvideox',
    name: 'CogVideoX',
    type: 'video',
    contextWindow: null,
    maxOutputTokens: null,
  },
  {
    provider: 'Zhipu AI',
    modelId: 'cogview-4',
    name: 'CogView 4',
    type: 'image',
    contextWindow: null,
    maxOutputTokens: null,
  },

  // ========================== Perplexity ====================================
  {
    provider: 'Perplexity',
    modelId: 'sonar',
    name: 'Sonar',
    type: 'text',
    contextWindow: 127072,
    maxOutputTokens: 8192,
  },
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
    modelId: 'sonar-reasoning',
    name: 'Sonar Reasoning',
    type: 'reasoning',
    contextWindow: 127072,
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
  {
    provider: 'AI21 Labs',
    modelId: 'jamba-1.5-mini',
    name: 'Jamba 1.5 Mini',
    type: 'text',
    contextWindow: 256000,
    maxOutputTokens: 4096,
  },
] as const;

// ---------------------------------------------------------------------------
// All provider names (derived)
// ---------------------------------------------------------------------------

export const APP_PROVIDERS: readonly AppProviderName[] = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Meta',
  'Mistral',
  'Cohere',
  'xAI',
  'Amazon',
  'DeepSeek',
  'Qwen',
  'Inception',
  'Zhipu AI',
  'Perplexity',
  'AI21 Labs',
] as const;

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
