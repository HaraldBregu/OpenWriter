/**
 * Types for the AgentManager subsystem.
 *
 * AgentManager is the single entry point for all AI operations —
 * usable from IPC, task handlers, and any main-process service.
 */

// ---------------------------------------------------------------------------
// Session configuration
// ---------------------------------------------------------------------------

export interface AgentSessionConfig {
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  maxHistoryMessages?: number
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface AgentRequest {
  /** User prompt text */
  prompt: string
  /** Optional conversation history override (bypasses session history) */
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Override provider for this request only */
  providerId?: string
  /** Override model for this request only */
  modelId?: string
  /** Override temperature for this request only */
  temperature?: number
  /** Override maxTokens for this request only */
  maxTokens?: number
}

// ---------------------------------------------------------------------------
// Stream events
// ---------------------------------------------------------------------------

export type AgentStreamEvent =
  | { type: 'token'; token: string; runId: string }
  | { type: 'thinking'; content: string; runId: string }
  | { type: 'done'; content: string; tokenCount: number; runId: string }
  | { type: 'error'; error: string; code: string; runId: string }

// ---------------------------------------------------------------------------
// Snapshots (serializable state)
// ---------------------------------------------------------------------------

export interface AgentSessionSnapshot {
  sessionId: string
  providerId: string
  modelId: string
  systemPrompt: string
  temperature: number
  maxTokens: number | undefined
  maxHistoryMessages: number
  historyLength: number
  activeRunIds: string[]
  createdAt: number
  lastActivity: number
  metadata?: Record<string, unknown>
}

export interface AgentRunSnapshot {
  runId: string
  sessionId: string
  startedAt: number
}

export interface AgentManagerStatus {
  totalSessions: number
  activeSessions: number
  activeRuns: number
}
