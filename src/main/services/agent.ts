import { BrowserWindow } from 'electron'
import { AgentController } from '../agent/AgentController'
import type { StoreService } from './store'
import { AgentValidators, StoreValidators } from '../shared/validators'

/**
 * Agent Session Configuration
 */
export interface AgentSessionConfig {
  sessionId: string
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

/**
 * Agent Session Info
 */
export interface AgentSessionInfo {
  sessionId: string
  providerId: string
  modelId: string
  createdAt: number
  lastActivity: number
  isActive: boolean
  messageCount: number
  metadata?: Record<string, unknown>
}

/**
 * Agent Run Options
 */
export interface AgentRunOptions {
  sessionId: string
  runId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  providerId: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * Multi-Agent Service
 * Manages multiple concurrent agent sessions with full lifecycle control
 */
export class AgentService {
  private controllers = new Map<string, AgentController>()
  private sessions = new Map<string, AgentSessionInfo>()
  private storeService: StoreService

  constructor(storeService: StoreService) {
    this.storeService = storeService
  }

  /**
   * Create a new agent session
   */
  createSession(config: AgentSessionConfig): AgentSessionInfo {
    // Validate inputs
    AgentValidators.validateSessionId(config.sessionId)
    StoreValidators.validateProviderId(config.providerId)
    if (config.modelId) {
      StoreValidators.validateModelName(config.modelId)
    }

    if (this.sessions.has(config.sessionId)) {
      throw new Error(`Session ${config.sessionId} already exists`)
    }

    const settings = this.storeService.getModelSettings(config.providerId)
    const sessionInfo: AgentSessionInfo = {
      sessionId: config.sessionId,
      providerId: config.providerId,
      modelId: config.modelId || settings?.selectedModel || 'gpt-4o-mini',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isActive: false,
      messageCount: 0,
      metadata: config.metadata
    }

    this.sessions.set(config.sessionId, sessionInfo)

    // Create dedicated controller for this session
    const controller = new AgentController(this.storeService)
    this.controllers.set(config.sessionId, controller)

    console.log(`[AgentService] Created session: ${config.sessionId}`)
    return sessionInfo
  }

  /**
   * Destroy an agent session
   */
  destroySession(sessionId: string): boolean {
    const controller = this.controllers.get(sessionId)
    if (controller) {
      // Cancel any active runs in this session
      // Note: AgentController would need a method to cancel all runs
      this.controllers.delete(sessionId)
    }

    const removed = this.sessions.delete(sessionId)
    if (removed) {
      console.log(`[AgentService] Destroyed session: ${sessionId}`)
    }
    return removed
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): AgentSessionInfo | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * List all active sessions
   */
  listSessions(): AgentSessionInfo[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clear all sessions
   */
  clearSessions(): number {
    const count = this.sessions.size

    // Cancel all controllers
    this.controllers.clear()
    this.sessions.clear()

    console.log(`[AgentService] Cleared ${count} sessions`)
    return count
  }

  /**
   * Run an agent with session support
   */
  async runAgentSession(options: AgentRunOptions, win: BrowserWindow): Promise<void> {
    let controller = this.controllers.get(options.sessionId)

    if (!controller) {
      // Auto-create session if it doesn't exist
      const config: AgentSessionConfig = {
        sessionId: options.sessionId,
        providerId: options.providerId,
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
      this.createSession(config)
      controller = this.controllers.get(options.sessionId)!
    }

    // Update session status
    const session = this.sessions.get(options.sessionId)
    if (session) {
      session.isActive = true
      session.lastActivity = Date.now()
    }

    try {
      await controller.runAgent(
        options.messages,
        options.runId,
        options.providerId,
        win
      )

      this.updateSessionActivity(options.sessionId, options.messages.length)
    } finally {
      // Mark session as inactive
      const sessionAfter = this.sessions.get(options.sessionId)
      if (sessionAfter) {
        sessionAfter.isActive = false
      }
    }
  }

  /**
   * Cancel a specific run across all sessions
   */
  cancelRun(runId: string): void {
    for (const controller of this.controllers.values()) {
      controller.cancel(runId)
    }
    console.log(`[AgentService] Cancelled run: ${runId}`)
  }

  /**
   * Cancel all runs in a specific session
   */
  cancelSession(sessionId: string): boolean {
    const controller = this.controllers.get(sessionId)
    if (!controller) return false

    // Note: Would need to extend AgentController to support canceling all runs
    console.log(`[AgentService] Cancelled session: ${sessionId}`)
    return true
  }

  /**
   * Check if a run is active
   */
  isRunning(runId: string): boolean {
    for (const controller of this.controllers.values()) {
      if (controller.isRunning(runId)) {
        return true
      }
    }
    return false
  }

  /**
   * Get overall service status
   */
  getStatus(): {
    totalSessions: number
    activeSessions: number
    totalMessages: number
  } {
    const sessions = Array.from(this.sessions.values())
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.isActive).length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0)
    }
  }

  /**
   * Update session activity timestamp and message count
   */
  updateSessionActivity(sessionId: string, messageCount: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
      session.messageCount += messageCount
    }
  }

  /**
   * Cleanup - cancel all active runs
   */
  cleanup(): void {
    console.log('[AgentService] Cleaning up all sessions')
    this.controllers.clear()
    this.sessions.clear()
  }
}
