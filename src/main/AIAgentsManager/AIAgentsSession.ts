/**
 * AIAgentsSession — pure class owning conversation config and bounded history.
 *
 * No external dependencies. Designed to be serialized via `toSnapshot()`.
 */

import { randomUUID } from 'node:crypto'
import type { AgentSessionConfig, AgentSessionSnapshot } from './aiAgentsManagerTypes'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { CompiledStateGraph } from '@langchain/langgraph'

const DEFAULT_MAX_HISTORY = 50
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.'

export interface AIAgentsHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export class AIAgentsSession {
  readonly sessionId: string
  readonly providerId: string
  readonly modelId: string
  readonly systemPrompt: string
  readonly temperature: number
  readonly maxTokens: number | undefined
  readonly maxHistoryMessages: number
  readonly createdAt: number
  readonly metadata?: Record<string, unknown>
  /**
   * Optional LangGraph factory — not serialized in toSnapshot() because
   * functions cannot be transmitted over Electron IPC.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>

  private history: AIAgentsHistoryMessage[] = []
  private activeRuns = new Set<string>()
  private _lastActivity: number

  constructor(config: AgentSessionConfig) {
    this.sessionId = randomUUID()
    this.providerId = config.providerId
    this.modelId = config.modelId ?? ''
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE
    this.maxTokens = config.maxTokens && config.maxTokens > 0 ? config.maxTokens : undefined
    this.maxHistoryMessages = config.maxHistoryMessages ?? DEFAULT_MAX_HISTORY
    this.metadata = config.metadata
    this.buildGraph = config.buildGraph
    this.createdAt = Date.now()
    this._lastActivity = this.createdAt
  }

  get lastActivity(): number {
    return this._lastActivity
  }

  get historyLength(): number {
    return this.history.length
  }

  get isActive(): boolean {
    return this.activeRuns.size > 0
  }

  getHistory(): AIAgentsHistoryMessage[] {
    return [...this.history]
  }

  appendExchange(userMessage: string, assistantMessage: string): void {
    this.history.push({ role: 'user', content: userMessage })
    this.history.push({ role: 'assistant', content: assistantMessage })

    // Keep only the tail of history
    if (this.history.length > this.maxHistoryMessages) {
      this.history = this.history.slice(-this.maxHistoryMessages)
    }

    this._lastActivity = Date.now()
  }

  addRun(runId: string): void {
    this.activeRuns.add(runId)
    this._lastActivity = Date.now()
  }

  removeRun(runId: string): void {
    this.activeRuns.delete(runId)
  }

  getActiveRunIds(): string[] {
    return [...this.activeRuns]
  }

  toSnapshot(): AgentSessionSnapshot {
    return {
      sessionId: this.sessionId,
      providerId: this.providerId,
      modelId: this.modelId,
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      maxHistoryMessages: this.maxHistoryMessages,
      historyLength: this.history.length,
      activeRunIds: [...this.activeRuns],
      createdAt: this.createdAt,
      lastActivity: this._lastActivity,
      metadata: this.metadata,
    }
  }
}
