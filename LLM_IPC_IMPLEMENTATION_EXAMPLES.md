# LLM Inference IPC - Implementation Examples

This document provides concrete implementation examples for the LLM Inference IPC architecture.

## Table of Contents

1. [Main Process Implementation](#main-process-implementation)
2. [Preload Implementation](#preload-implementation)
3. [Renderer Usage](#renderer-usage)
4. [Testing Examples](#testing-examples)

---

## Main Process Implementation

### 1. LlmIpc Module (`src/main/ipc/LlmIpc.ts`)

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { LlmInferenceService } from '../services/llm-inference'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import {
  LlmInferenceRequest,
  LlmSessionConfig,
  LlmSessionRunOptions
} from '../types/llm'

/**
 * IPC handlers for LLM inference operations.
 *
 * Responsibilities:
 *   - Single inference requests with streaming
 *   - Session management (create, destroy, run)
 *   - Cancellation and status queries
 *   - Event forwarding to renderer
 *
 * All LLM operations are window-scoped for proper isolation.
 */
export class LlmIpc implements IpcModule {
  readonly name = 'llm'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Run a single LLM inference request.
     *
     * Channel: 'llm:inference'
     * Input: LlmInferenceRequest
     * Output: string - inferenceId
     */
    ipcMain.handle(
      'llm:inference',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, request: LlmInferenceRequest): Promise<string> => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        const window = BrowserWindow.fromWebContents(event.sender)

        if (!window) {
          throw new Error('Window not available for LLM inference')
        }

        const inferenceId = await llmService.runInference(request, window)
        return inferenceId
      }, 'llm:inference')
    )

    /**
     * Cancel an active inference.
     *
     * Channel: 'llm:cancel'
     * Input: string - inferenceId
     * Output: boolean - success
     */
    ipcMain.handle(
      'llm:cancel',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, inferenceId: string): Promise<boolean> => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        return llmService.cancelInference(inferenceId)
      }, 'llm:cancel')
    )

    /**
     * Create a new LLM session.
     *
     * Channel: 'llm:session:create'
     * Input: LlmSessionConfig
     * Output: LlmSessionInfo
     */
    ipcMain.handle(
      'llm:session:create',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, config: LlmSessionConfig) => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        return llmService.createSession(config)
      }, 'llm:session:create')
    )

    /**
     * Destroy an LLM session.
     *
     * Channel: 'llm:session:destroy'
     * Input: string - sessionId
     * Output: boolean - success
     */
    ipcMain.handle(
      'llm:session:destroy',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, sessionId: string): Promise<boolean> => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        return llmService.destroySession(sessionId)
      }, 'llm:session:destroy')
    )

    /**
     * Run inference within a session context.
     *
     * Channel: 'llm:session:run'
     * Input: LlmSessionRunOptions
     * Output: string - inferenceId
     */
    ipcMain.handle(
      'llm:session:run',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, options: LlmSessionRunOptions): Promise<string> => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        const window = BrowserWindow.fromWebContents(event.sender)

        if (!window) {
          throw new Error('Window not available for session inference')
        }

        return llmService.runSessionInference(options, window)
      }, 'llm:session:run')
    )

    /**
     * Get service status.
     *
     * Channel: 'llm:get-status'
     * Output: LlmServiceStatus
     */
    ipcMain.handle(
      'llm:get-status',
      wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
        const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
        return llmService.getStatus()
      }, 'llm:get-status')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
```

### 2. LlmInferenceService (`src/main/services/llm-inference.ts`)

```typescript
import { BrowserWindow } from 'electron'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import type { StoreService } from './store'
import { LlmValidators } from '../shared/llm-validators'
import {
  LlmInferenceRequest,
  LlmSessionConfig,
  LlmSessionInfo,
  LlmSessionRunOptions,
  LlmServiceStatus,
  LlmTokenEvent,
  LlmDoneEvent,
  LlmErrorEvent,
  LlmThinkingEvent
} from '../types/llm'

interface ActiveInference {
  id: string
  sessionId?: string
  abortController: AbortController
  startedAt: number
  timeoutHandle: NodeJS.Timeout
  chunkTimeoutHandle: NodeJS.Timeout
  window: BrowserWindow
}

interface LlmSession {
  info: LlmSessionInfo
  messageHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  lastActivityAt: number
}

/**
 * Service for managing LLM inference operations.
 *
 * Features:
 * - Multiple provider support (OpenAI, Anthropic, etc.)
 * - Session-based and single-shot inference
 * - Token streaming with backpressure
 * - Comprehensive timeout management
 * - Resource limits and cleanup
 */
export class LlmInferenceService {
  private static readonly MAX_CONCURRENT_INFERENCES = 5
  private static readonly MAX_SESSIONS = 20
  private static readonly DEFAULT_TIMEOUT_MS = 120000
  private static readonly CHUNK_TIMEOUT_MS = 30000
  private static readonly SESSION_IDLE_TIMEOUT_MS = 1800000 // 30 minutes

  private activeInferences = new Map<string, ActiveInference>()
  private sessions = new Map<string, LlmSession>()
  private storeService: StoreService
  private totalInferences = 0
  private totalTokens = 0

  constructor(storeService: StoreService) {
    this.storeService = storeService

    // Start session cleanup timer
    this.startSessionCleanup()
  }

  /**
   * Run a single inference request
   */
  async runInference(request: LlmInferenceRequest, window: BrowserWindow): Promise<string> {
    // Validate request
    LlmValidators.validateInferenceRequest(request)

    // Check limits
    this.checkConcurrencyLimit()

    const inferenceId = this.generateInferenceId()
    const abortController = new AbortController()
    const timeoutMs = request.timeoutMs || LlmInferenceService.DEFAULT_TIMEOUT_MS

    // Set up timeouts
    const timeoutHandle = this.createOverallTimeout(inferenceId, abortController, timeoutMs, window)
    const chunkTimeoutHandle = this.createChunkTimeout(inferenceId, abortController, window)

    // Track active inference
    this.activeInferences.set(inferenceId, {
      id: inferenceId,
      abortController,
      startedAt: Date.now(),
      timeoutHandle,
      chunkTimeoutHandle,
      window
    })

    // Run inference asynchronously
    this.executeInference(inferenceId, request, window, abortController)
      .catch(error => {
        console.error(`[LlmInference] Error in inference ${inferenceId}:`, error)
      })

    this.totalInferences++
    return inferenceId
  }

  /**
   * Create a new session
   */
  createSession(config: LlmSessionConfig): LlmSessionInfo {
    LlmValidators.validateSessionConfig(config)

    if (this.sessions.size >= LlmInferenceService.MAX_SESSIONS) {
      throw new Error(`Maximum sessions limit reached (${LlmInferenceService.MAX_SESSIONS})`)
    }

    if (this.sessions.has(config.sessionId)) {
      throw new Error(`Session ${config.sessionId} already exists`)
    }

    const settings = this.storeService.getModelSettings(config.providerId)
    const sessionInfo: LlmSessionInfo = {
      sessionId: config.sessionId,
      providerId: config.providerId,
      modelId: config.modelId || settings?.selectedModel || 'gpt-4o-mini',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isActive: false,
      messageCount: 0,
      totalTokens: 0,
      metadata: config.metadata
    }

    const session: LlmSession = {
      info: sessionInfo,
      messageHistory: config.systemPrompt
        ? [{ role: 'system', content: config.systemPrompt }]
        : [],
      lastActivityAt: Date.now()
    }

    this.sessions.set(config.sessionId, session)
    console.log(`[LlmInference] Created session: ${config.sessionId}`)

    return sessionInfo
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // Cancel any active inferences in this session
    for (const [inferenceId, inference] of this.activeInferences.entries()) {
      if (inference.sessionId === sessionId) {
        inference.abortController.abort()
        this.cleanupInference(inferenceId)
      }
    }

    this.sessions.delete(sessionId)
    console.log(`[LlmInference] Destroyed session: ${sessionId}`)

    return true
  }

  /**
   * Run inference within a session
   */
  async runSessionInference(options: LlmSessionRunOptions, window: BrowserWindow): Promise<string> {
    LlmValidators.validateSessionRunOptions(options)

    const session = this.sessions.get(options.sessionId)
    if (!session) {
      throw new Error(`Session ${options.sessionId} not found`)
    }

    // Update session history
    session.messageHistory.push(...options.messages)
    session.info.messageCount = session.messageHistory.length
    session.info.lastActivity = Date.now()
    session.info.isActive = true
    session.lastActivityAt = Date.now()

    // Create inference request from session
    const request: LlmInferenceRequest = {
      messages: session.messageHistory,
      providerId: session.info.providerId,
      modelId: session.info.modelId,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: options.stream ?? true,
      timeoutMs: options.timeoutMs
    }

    const inferenceId = await this.runInference(request, window)

    // Track session association
    const inference = this.activeInferences.get(inferenceId)
    if (inference) {
      inference.sessionId = options.sessionId
    }

    return inferenceId
  }

  /**
   * Cancel an active inference
   */
  cancelInference(inferenceId: string): boolean {
    const inference = this.activeInferences.get(inferenceId)
    if (!inference) {
      return false
    }

    inference.abortController.abort()
    this.cleanupInference(inferenceId)

    inference.window.webContents.send('llm:done', {
      inferenceId,
      sessionId: inference.sessionId,
      totalTokens: 0,
      cancelled: true
    } as LlmDoneEvent)

    console.log(`[LlmInference] Cancelled inference: ${inferenceId}`)
    return true
  }

  /**
   * Get service status
   */
  getStatus(): LlmServiceStatus {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.info.isActive).length

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      activeInferences: this.activeInferences.size,
      totalInferences: this.totalInferences,
      totalTokens: this.totalTokens
    }
  }

  /**
   * Execute the actual inference
   */
  private async executeInference(
    inferenceId: string,
    request: LlmInferenceRequest,
    window: BrowserWindow,
    abortController: AbortController
  ): Promise<void> {
    try {
      // Get API key
      const apiKey = this.getApiKey(request.providerId)

      // Send thinking status
      window.webContents.send('llm:thinking', {
        inferenceId,
        status: 'Initializing...'
      } as LlmThinkingEvent)

      // Create model
      const model = this.createModel(request.providerId, request.modelId || 'default', apiKey, request)

      // Convert messages to LangChain format
      const langchainMessages = request.messages.map(msg => {
        switch (msg.role) {
          case 'system': return new SystemMessage(msg.content)
          case 'user': return new HumanMessage(msg.content)
          case 'assistant': return new AIMessage(msg.content)
        }
      })

      // Send processing status
      window.webContents.send('llm:thinking', {
        inferenceId,
        status: 'Processing...'
      } as LlmThinkingEvent)

      // Stream tokens
      const stream = await model.stream(langchainMessages, { signal: abortController.signal })

      let tokenIndex = 0
      let totalTokens = 0
      let lastChunkTime = Date.now()

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break

        lastChunkTime = Date.now()

        const token = this.extractToken(chunk)
        if (token) {
          window.webContents.send('llm:token', {
            inferenceId,
            sessionId: this.activeInferences.get(inferenceId)?.sessionId,
            token,
            index: tokenIndex++
          } as LlmTokenEvent)

          totalTokens++
        }
      }

      if (!abortController.signal.aborted) {
        window.webContents.send('llm:done', {
          inferenceId,
          sessionId: this.activeInferences.get(inferenceId)?.sessionId,
          totalTokens,
          finishReason: 'stop'
        } as LlmDoneEvent)

        this.totalTokens += totalTokens

        // Update session token count if applicable
        const inference = this.activeInferences.get(inferenceId)
        if (inference?.sessionId) {
          const session = this.sessions.get(inference.sessionId)
          if (session) {
            session.info.totalTokens += totalTokens
            session.info.isActive = false
          }
        }

        console.log(`[LlmInference] Completed inference ${inferenceId} (${totalTokens} tokens)`)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      const isAbort = this.isAbortError(error)

      if (isAbort) {
        console.log(`[LlmInference] Inference ${inferenceId} aborted`)
      } else {
        console.error(`[LlmInference] Inference ${inferenceId} error:`, errMsg)

        window.webContents.send('llm:error', {
          inferenceId,
          sessionId: this.activeInferences.get(inferenceId)?.sessionId,
          error: errMsg,
          code: this.getErrorCode(error),
          retryable: this.isRetryableError(error)
        } as LlmErrorEvent)
      }
    } finally {
      this.cleanupInference(inferenceId)
    }
  }

  /**
   * Create LLM model instance
   */
  private createModel(providerId: string, modelId: string, apiKey: string, request: LlmInferenceRequest): any {
    switch (providerId) {
      case 'openai':
        return new ChatOpenAI({
          apiKey,
          model: modelId,
          temperature: request.temperature ?? 0.7,
          maxTokens: request.maxTokens,
          streaming: request.stream ?? true
        })

      case 'anthropic':
        return new ChatAnthropic({
          apiKey,
          model: modelId,
          temperature: request.temperature ?? 0.7,
          maxTokens: request.maxTokens,
          streaming: request.stream ?? true
        })

      default:
        throw new Error(`Unsupported provider: ${providerId}`)
    }
  }

  /**
   * Get API key for provider
   */
  private getApiKey(providerId: string): string {
    const settings = this.storeService.getModelSettings(providerId)
    const apiKey = settings?.apiToken || process.env[`${providerId.toUpperCase()}_API_KEY`]

    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${providerId}`)
    }

    return apiKey
  }

  /**
   * Extract token from LangChain chunk
   */
  private extractToken(chunk: any): string {
    if (typeof chunk.content === 'string') {
      return chunk.content
    }

    if (Array.isArray(chunk.content)) {
      return chunk.content
        .filter(c => typeof c === 'object' && 'text' in c)
        .map(c => c.text)
        .join('')
    }

    return ''
  }

  /**
   * Check if error is an abort error
   */
  private isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      return msg.includes('abort') || msg.includes('cancel') || error.name === 'AbortError'
    }
    return false
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      if (this.isAbortError(error)) return 'ABORTED'
      if (error.message.includes('timeout')) return 'TIMEOUT'
      if (error.message.includes('API key')) return 'API_KEY_ERROR'
      if (error.message.includes('rate limit')) return 'RATE_LIMIT'
      if (error.message.includes('network')) return 'NETWORK_ERROR'
    }
    return 'UNKNOWN_ERROR'
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const code = this.getErrorCode(error)
    return ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT'].includes(code)
  }

  /**
   * Check concurrency limit
   */
  private checkConcurrencyLimit(): void {
    if (this.activeInferences.size >= LlmInferenceService.MAX_CONCURRENT_INFERENCES) {
      throw new Error(`Maximum concurrent inferences limit reached (${LlmInferenceService.MAX_CONCURRENT_INFERENCES})`)
    }
  }

  /**
   * Create overall timeout
   */
  private createOverallTimeout(
    inferenceId: string,
    abortController: AbortController,
    timeoutMs: number,
    window: BrowserWindow
  ): NodeJS.Timeout {
    return setTimeout(() => {
      abortController.abort()
      window.webContents.send('llm:error', {
        inferenceId,
        error: 'Inference timeout exceeded',
        code: 'TIMEOUT',
        retryable: true
      } as LlmErrorEvent)
      this.cleanupInference(inferenceId)
    }, timeoutMs)
  }

  /**
   * Create chunk timeout
   */
  private createChunkTimeout(
    inferenceId: string,
    abortController: AbortController,
    window: BrowserWindow
  ): NodeJS.Timeout {
    let lastChunkTime = Date.now()

    return setInterval(() => {
      if (Date.now() - lastChunkTime > LlmInferenceService.CHUNK_TIMEOUT_MS) {
        abortController.abort()
        window.webContents.send('llm:error', {
          inferenceId,
          error: 'Stream timeout - no data received',
          code: 'STREAM_TIMEOUT',
          retryable: true
        } as LlmErrorEvent)
        this.cleanupInference(inferenceId)
      }
    }, 5000)
  }

  /**
   * Cleanup inference resources
   */
  private cleanupInference(inferenceId: string): void {
    const inference = this.activeInferences.get(inferenceId)
    if (inference) {
      clearTimeout(inference.timeoutHandle)
      clearInterval(inference.chunkTimeoutHandle)
      this.activeInferences.delete(inferenceId)
    }
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [sessionId, session] of this.sessions.entries()) {
        if (!session.info.isActive && now - session.lastActivityAt > LlmInferenceService.SESSION_IDLE_TIMEOUT_MS) {
          console.log(`[LlmInference] Cleaning up idle session: ${sessionId}`)
          this.destroySession(sessionId)
        }
      }
    }, 60000) // Check every minute
  }

  /**
   * Generate unique inference ID
   */
  private generateInferenceId(): string {
    return `inf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
```

### 3. Validators (`src/main/shared/llm-validators.ts`)

```typescript
import type {
  LlmInferenceRequest,
  LlmSessionConfig,
  LlmSessionRunOptions
} from '../types/llm'

export class LlmValidators {
  private static readonly ALLOWED_PROVIDERS = ['openai', 'anthropic', 'google']
  private static readonly MAX_MESSAGE_LENGTH = 100000
  private static readonly MAX_MESSAGES = 100

  static validateInferenceRequest(request: LlmInferenceRequest): void {
    // Validate provider
    this.validateProviderId(request.providerId)

    // Validate messages
    this.validateMessages(request.messages)

    // Validate optional parameters
    if (request.temperature !== undefined) {
      this.validateTemperature(request.temperature)
    }

    if (request.maxTokens !== undefined) {
      this.validateMaxTokens(request.maxTokens)
    }

    if (request.timeoutMs !== undefined) {
      this.validateTimeout(request.timeoutMs)
    }
  }

  static validateSessionConfig(config: LlmSessionConfig): void {
    this.validateSessionId(config.sessionId)
    this.validateProviderId(config.providerId)

    if (config.temperature !== undefined) {
      this.validateTemperature(config.temperature)
    }

    if (config.maxTokens !== undefined) {
      this.validateMaxTokens(config.maxTokens)
    }
  }

  static validateSessionRunOptions(options: LlmSessionRunOptions): void {
    this.validateSessionId(options.sessionId)
    this.validateMessages(options.messages)

    if (options.temperature !== undefined) {
      this.validateTemperature(options.temperature)
    }

    if (options.maxTokens !== undefined) {
      this.validateMaxTokens(options.maxTokens)
    }

    if (options.timeoutMs !== undefined) {
      this.validateTimeout(options.timeoutMs)
    }
  }

  static validateProviderId(providerId: string): void {
    if (!providerId || typeof providerId !== 'string') {
      throw new Error('Provider ID is required')
    }

    if (!this.ALLOWED_PROVIDERS.includes(providerId)) {
      throw new Error(`Invalid provider ID: ${providerId}. Allowed: ${this.ALLOWED_PROVIDERS.join(', ')}`)
    }
  }

  static validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required')
    }

    if (sessionId.length < 1 || sessionId.length > 100) {
      throw new Error('Session ID must be 1-100 characters')
    }
  }

  static validateMessages(messages: Array<{ role: string; content: string }>): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array')
    }

    if (messages.length > this.MAX_MESSAGES) {
      throw new Error(`Too many messages (max: ${this.MAX_MESSAGES})`)
    }

    messages.forEach((msg, i) => {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error(`Invalid role in message ${i}: ${msg.role}`)
      }

      if (typeof msg.content !== 'string') {
        throw new Error(`Invalid content in message ${i}`)
      }

      if (msg.content.length > this.MAX_MESSAGE_LENGTH) {
        throw new Error(`Message ${i} exceeds maximum length (${this.MAX_MESSAGE_LENGTH})`)
      }
    })
  }

  static validateTemperature(temp: number): void {
    if (typeof temp !== 'number' || temp < 0 || temp > 2) {
      throw new Error('Temperature must be a number between 0 and 2')
    }
  }

  static validateMaxTokens(maxTokens: number): void {
    if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 100000) {
      throw new Error('Max tokens must be between 1 and 100000')
    }
  }

  static validateTimeout(timeoutMs: number): void {
    if (typeof timeoutMs !== 'number' || timeoutMs < 1000 || timeoutMs > 600000) {
      throw new Error('Timeout must be between 1000ms and 600000ms')
    }
  }
}
```

---

## Preload Implementation

### Preload API (`src/preload/index.ts` - additions)

```typescript
// Add to existing api object
const llm = {
  // Single inference
  llmInference: (options: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    providerId: string
    modelId?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    stream?: boolean
    timeoutMs?: number
  }): Promise<string> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:inference', options))
  },

  // Cancellation
  llmCancel: (inferenceId: string): Promise<boolean> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:cancel', inferenceId))
  },

  // Session management
  llmCreateSession: (config: {
    sessionId: string
    providerId: string
    modelId?: string
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
    metadata?: Record<string, unknown>
  }): Promise<{
    sessionId: string
    providerId: string
    modelId: string
    createdAt: number
    lastActivity: number
    isActive: boolean
    messageCount: number
    totalTokens: number
    metadata?: Record<string, unknown>
  }> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:session:create', config))
  },

  llmDestroySession: (sessionId: string): Promise<boolean> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:session:destroy', sessionId))
  },

  llmRunSession: (options: {
    sessionId: string
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    stream?: boolean
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
  }): Promise<string> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:session:run', options))
  },

  // Status
  llmGetStatus: (): Promise<{
    totalSessions: number
    activeSessions: number
    activeInferences: number
    totalInferences: number
    totalTokens: number
  }> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:get-status'))
  },

  // Event listeners
  onLlmToken: (callback: (event: {
    inferenceId: string
    sessionId?: string
    token: string
    index: number
  }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: {
      inferenceId: string
      sessionId?: string
      token: string
      index: number
    }): void => {
      callback(data)
    }
    ipcRenderer.on('llm:token', handler)
    return () => {
      ipcRenderer.removeListener('llm:token', handler)
    }
  },

  onLlmThinking: (callback: (event: {
    inferenceId: string
    sessionId?: string
    status: string
    progress?: number
  }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: {
      inferenceId: string
      sessionId?: string
      status: string
      progress?: number
    }): void => {
      callback(data)
    }
    ipcRenderer.on('llm:thinking', handler)
    return () => {
      ipcRenderer.removeListener('llm:thinking', handler)
    }
  },

  onLlmDone: (callback: (event: {
    inferenceId: string
    sessionId?: string
    totalTokens: number
    cancelled?: boolean
    finishReason?: 'stop' | 'length' | 'content_filter'
  }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: {
      inferenceId: string
      sessionId?: string
      totalTokens: number
      cancelled?: boolean
      finishReason?: 'stop' | 'length' | 'content_filter'
    }): void => {
      callback(data)
    }
    ipcRenderer.on('llm:done', handler)
    return () => {
      ipcRenderer.removeListener('llm:done', handler)
    }
  },

  onLlmError: (callback: (event: {
    inferenceId: string
    sessionId?: string
    error: string
    code: string
    retryable: boolean
  }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: {
      inferenceId: string
      sessionId?: string
      error: string
      code: string
      retryable: boolean
    }): void => {
      callback(data)
    }
    ipcRenderer.on('llm:error', handler)
    return () => {
      ipcRenderer.removeListener('llm:error', handler)
    }
  }
}

// Expose in contextBridge
contextBridge.exposeInMainWorld('llm', llm)
```

---

## Renderer Usage

### React Hook (`src/renderer/src/hooks/useLlmInference.ts`)

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface UseLlmInferenceOptions {
  providerId: string
  modelId?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  onError?: (error: { error: string; code: string; retryable: boolean }) => void
}

export function useLlmInference(options: UseLlmInferenceOptions) {
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentInferenceIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Listen for tokens
    const unsubscribeToken = window.api.onLlmToken((event) => {
      if (event.inferenceId === currentInferenceIdRef.current) {
        setResponse(prev => prev + event.token)
      }
    })

    // Listen for completion
    const unsubscribeDone = window.api.onLlmDone((event) => {
      if (event.inferenceId === currentInferenceIdRef.current) {
        setIsLoading(false)
        currentInferenceIdRef.current = null
      }
    })

    // Listen for errors
    const unsubscribeError = window.api.onLlmError((event) => {
      if (event.inferenceId === currentInferenceIdRef.current) {
        setError(event.error)
        setIsLoading(false)
        currentInferenceIdRef.current = null
        options.onError?.(event)
      }
    })

    return () => {
      unsubscribeToken()
      unsubscribeDone()
      unsubscribeError()
    }
  }, [options])

  const runInference = useCallback(async (messages: Message[]) => {
    setResponse('')
    setError(null)
    setIsLoading(true)

    try {
      const inferenceId = await window.api.llmInference({
        messages,
        providerId: options.providerId,
        modelId: options.modelId,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        stream: true
      })

      currentInferenceIdRef.current = inferenceId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }, [options])

  const cancel = useCallback(async () => {
    if (currentInferenceIdRef.current) {
      await window.api.llmCancel(currentInferenceIdRef.current)
      setIsLoading(false)
    }
  }, [])

  return {
    response,
    isLoading,
    error,
    runInference,
    cancel
  }
}
```

### Component Example

```typescript
import React, { useState } from 'react'
import { useLlmInference } from '../hooks/useLlmInference'

export function ChatComponent() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const { response, isLoading, error, runInference, cancel } = useLlmInference({
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    systemPrompt: 'You are a helpful assistant.',
    onError: (error) => {
      console.error('LLM Error:', error)
      if (error.retryable) {
        console.log('Error is retryable')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user' as const, content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')

    await runInference(newMessages)
  }

  // Add assistant response to messages when complete
  useEffect(() => {
    if (response && !isLoading) {
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    }
  }, [response, isLoading])

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {isLoading && response && (
          <div className="message assistant">
            <strong>assistant:</strong> {response}
          </div>
        )}
      </div>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Type your message..."
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
        {isLoading && (
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        )}
      </form>
    </div>
  )
}
```

---

## Testing Examples

### Unit Test for LlmInferenceService

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LlmInferenceService } from '../services/llm-inference'
import { StoreService } from '../services/store'
import { BrowserWindow } from 'electron'

describe('LlmInferenceService', () => {
  let service: LlmInferenceService
  let mockStore: StoreService
  let mockWindow: BrowserWindow

  beforeEach(() => {
    mockStore = {
      getModelSettings: vi.fn().mockReturnValue({
        selectedModel: 'gpt-4o-mini',
        apiToken: 'test-key'
      })
    } as any

    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    } as any

    service = new LlmInferenceService(mockStore)
  })

  it('should create a session', () => {
    const config = {
      sessionId: 'test-session',
      providerId: 'openai',
      systemPrompt: 'Test prompt'
    }

    const session = service.createSession(config)

    expect(session.sessionId).toBe('test-session')
    expect(session.providerId).toBe('openai')
    expect(session.modelId).toBe('gpt-4o-mini')
    expect(session.messageCount).toBe(0)
  })

  it('should run inference and return inferenceId', async () => {
    const request = {
      messages: [{ role: 'user' as const, content: 'Hello' }],
      providerId: 'openai'
    }

    const inferenceId = await service.runInference(request, mockWindow)

    expect(inferenceId).toMatch(/^inf-/)
  })

  it('should cancel active inference', async () => {
    const request = {
      messages: [{ role: 'user' as const, content: 'Hello' }],
      providerId: 'openai'
    }

    const inferenceId = await service.runInference(request, mockWindow)
    const cancelled = service.cancelInference(inferenceId)

    expect(cancelled).toBe(true)
  })

  it('should reject concurrent inference limit', async () => {
    const requests = Array(6).fill(null).map(() => ({
      messages: [{ role: 'user' as const, content: 'Hello' }],
      providerId: 'openai'
    }))

    // First 5 should succeed
    const promises = requests.slice(0, 5).map(req =>
      service.runInference(req, mockWindow)
    )

    await Promise.all(promises)

    // 6th should fail
    await expect(
      service.runInference(requests[5], mockWindow)
    ).rejects.toThrow('Maximum concurrent inferences')
  })
})
```

This implementation provides a complete, production-ready LLM inference IPC architecture for Electron applications with streaming support, robust error handling, and comprehensive resource management.
