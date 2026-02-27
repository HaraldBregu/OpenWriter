/**
 * Types for the AIAgentsManager subsystem.
 *
 * AIAgentsManager is the single entry point for all AI operations —
 * usable from IPC, task handlers, and any main-process service.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { CompiledStateGraph } from '@langchain/langgraph'

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
  /**
   * LangGraph factory — when set, the session runs the agent as a StateGraph
   * instead of a plain chat completion. Not serialized over IPC.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>
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

export interface AIAgentsManagerStatus {
  totalSessions: number
  activeSessions: number
  activeRuns: number
}
