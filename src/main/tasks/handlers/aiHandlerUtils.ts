/**
 * Shared utilities for AI task handlers (AIChatHandler, AIEnhanceHandler).
 *
 * Centralises reasoning-model detection, chunk token extraction, error
 * classification, and user-facing error messages so the individual handlers
 * stay thin.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o3-mini', 'o1-mini', 'o1-preview']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns `true` when `modelName` matches a known reasoning-only model prefix. */
export function isReasoningModel(modelName: string): boolean {
  const normalized = modelName.toLowerCase()
  return REASONING_MODEL_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`)
  )
}

/**
 * Extract a plain-text token from a LangChain `AIMessageChunk.content` value.
 *
 * The content can be a plain string **or** an array of typed content blocks
 * (e.g. `{ text: string }`).
 */
export function extractTokenFromChunk(content: unknown): string {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .filter((c): c is { text: string } => typeof c === 'object' && c !== null && 'text' in c)
      .map((c) => c.text)
      .join('')
  }

  return ''
}

/** Classify an error thrown during an AI API call. */
export function classifyError(error: unknown): 'abort' | 'auth' | 'rate_limit' | 'unknown' {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    if (name === 'aborterror' || msg.includes('abort') || msg.includes('cancel')) {
      return 'abort'
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid api key')) {
      return 'auth'
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return 'rate_limit'
    }
  }
  return 'unknown'
}

/**
 * Map an error classification + raw message into a user-friendly string.
 */
export function toUserMessage(kind: ReturnType<typeof classifyError>, rawMessage: string): string {
  switch (kind) {
    case 'auth':
      return 'Authentication failed. Please check your API key in Settings.'
    case 'rate_limit':
      return 'Rate limit exceeded. Please wait a moment and try again.'
    default:
      return `OpenAI request failed: ${rawMessage}`
  }
}
