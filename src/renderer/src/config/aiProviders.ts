// ---------------------------------------------------------------------------
// Shared AI Provider & Model configuration
// ---------------------------------------------------------------------------

export interface ModelOption {
  id: string
  name: string
  description: string
  contextWindow: string
}

export interface AIProvider {
  id: string
  name: string
  models: ModelOption[]
}

export const aiProviders: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most capable, best for complex tasks', contextWindow: '200K' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Balanced performance and speed', contextWindow: '200K' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest, ideal for simple tasks', contextWindow: '200K' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable multimodal model', contextWindow: '128K' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast and affordable', contextWindow: '128K' },
      { id: 'o1', name: 'o1', description: 'Reasoning model for complex problems', contextWindow: '200K' },
      { id: 'o3-mini', name: 'o3-mini', description: 'Fast reasoning at lower cost', contextWindow: '200K' }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', description: 'Fast multimodal with low latency', contextWindow: '1M' },
      { id: 'gemini-2-0-pro', name: 'Gemini 2.0 Pro', description: 'Best quality for complex reasoning', contextWindow: '2M' },
      { id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', description: 'Efficient for high-volume tasks', contextWindow: '1M' }
    ]
  },
  {
    id: 'meta',
    name: 'Meta',
    models: [
      { id: 'llama-3-3-70b', name: 'Llama 3.3 70B', description: 'Powerful open-weight model', contextWindow: '128K' },
      { id: 'llama-3-2-11b', name: 'Llama 3.2 11B', description: 'Multimodal, efficient inference', contextWindow: '128K' },
      { id: 'llama-3-1-8b', name: 'Llama 3.1 8B', description: 'Lightweight, fast local inference', contextWindow: '128K' }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: [
      { id: 'mistral-large-2', name: 'Mistral Large 2', description: 'Top-tier reasoning and code', contextWindow: '128K' },
      { id: 'mistral-small-3', name: 'Mistral Small 3', description: 'Efficient for everyday tasks', contextWindow: '32K' },
      { id: 'codestral-latest', name: 'Codestral', description: 'Specialized for code generation', contextWindow: '256K' }
    ]
  }
]

const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o3-mini', 'o1-mini', 'o1-preview']

export function isReasoningModel(modelId: string): boolean {
  const normalized = modelId.toLowerCase()
  return REASONING_MODEL_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`)
  )
}

export function getDefaultModelId(providerId: string): string {
  const provider = aiProviders.find((p) => p.id === providerId)
  return provider?.models[0]?.id ?? ''
}
