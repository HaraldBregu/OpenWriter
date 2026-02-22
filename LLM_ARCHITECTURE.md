# LLM Integration Architecture for Brain Subsection Pages

**Author:** Design Patterns Architect
**Date:** 2026-02-22
**Version:** 1.0

## Executive Summary

This document outlines a comprehensive architecture for integrating LLM (Large Language Model) inference capabilities into the brain subsection pages (Consciousness, Reasoning, Memory, Perception, Principles). The design follows existing patterns in the Tesseract AI codebase, ensuring consistency, maintainability, and scalability.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Main Process: LLM Service Layer](#main-process-llm-service-layer)
3. [State Management](#state-management)
4. [Caching Strategy](#caching-strategy)
5. [Configuration Management](#configuration-management)
6. [Integration with Brain Pages](#integration-with-brain-pages)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)
10. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Design Principles

1. **Service-Oriented Architecture**: Follow the existing pattern where business logic resides in the main process as services
2. **Window Isolation**: Support window-scoped LLM contexts for multi-window workspace architecture
3. **Provider Abstraction**: Support multiple LLM providers (OpenAI, Anthropic, local models, etc.)
4. **Stream-First**: Prioritize streaming responses for better UX
5. **Conversation Persistence**: Support both in-memory and persistent conversation storage
6. **Caching**: Implement multi-level caching for improved performance and cost reduction

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Brain Pages (UI Components)                         │   │
│  │  - ConsciousnessPage, ReasoningPage, MemoryPage      │   │
│  │  - PerceptionPage, PrinciplesPage                    │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  React Hooks Layer                                   │   │
│  │  - useLLMConversation, useLLMStream                  │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Redux Store (State Management)                      │   │
│  │  - llmSlice: conversations, providers, cache         │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────────┘
                        │ IPC (electron)
┌───────────────────────▼──────────────────────────────────────┐
│                    Main Process                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Module: LlmIpc                                  │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Service Layer                                       │   │
│  │  - LLMService (orchestration)                        │   │
│  │  - LLMProviderRegistry (provider management)         │   │
│  │  - LLMCacheService (response caching)                │   │
│  │  - LLMConversationService (conversation mgmt)        │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Provider Implementations                            │   │
│  │  - OpenAIProvider                                    │   │
│  │  - AnthropicProvider                                 │   │
│  │  - LocalModelProvider (Ollama, LMStudio)             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Main Process: LLM Service Layer

### 1. LLMService (Core Orchestrator)

**Location:** `/src/main/services/llm.ts`

The main orchestration service that coordinates between providers, conversations, and caching.

```typescript
import type { StoreService } from './store'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import type { BrowserWindow } from 'electron'

/**
 * Configuration for an LLM inference request
 */
export interface LLMInferenceConfig {
  conversationId: string
  messages: LLMMessage[]
  providerId: string
  modelId?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
  metadata?: {
    brainSection?: 'consciousness' | 'reasoning' | 'memory' | 'perception' | 'principles'
    [key: string]: unknown
  }
}

/**
 * Message in an LLM conversation
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: number
  metadata?: Record<string, unknown>
}

/**
 * Result of an LLM inference request
 */
export interface LLMInferenceResult {
  conversationId: string
  response: string
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  model: string
  provider: string
  cached: boolean
  latency: number
}

/**
 * LLMService manages LLM inference across different providers.
 *
 * Responsibilities:
 *   - Coordinate LLM inference requests with appropriate providers
 *   - Manage streaming responses and send tokens to renderer
 *   - Integrate with caching layer for response optimization
 *   - Track usage statistics and costs
 *   - Emit events for monitoring and logging
 *
 * This service is registered once in the ServiceContainer and accessed by key.
 */
export class LLMService implements Disposable {
  constructor(
    private readonly store: StoreService,
    private readonly eventBus: EventBus,
    private readonly providerRegistry: LLMProviderRegistry,
    private readonly cache: LLMCacheService,
    private readonly conversationService: LLMConversationService
  ) {}

  /**
   * Execute an LLM inference request
   */
  async infer(
    config: LLMInferenceConfig,
    window: BrowserWindow,
    runId: string
  ): Promise<LLMInferenceResult> {
    const startTime = Date.now()

    // Check cache first
    const cachedResponse = await this.cache.get(config)
    if (cachedResponse) {
      this.eventBus.broadcast('llm:cache-hit', {
        conversationId: config.conversationId,
        providerId: config.providerId
      })

      // Send cached response to renderer
      window.webContents.send('llm:token', {
        runId,
        token: cachedResponse.response,
        done: true
      })

      return {
        ...cachedResponse,
        cached: true,
        latency: Date.now() - startTime
      }
    }

    // Get provider
    const provider = this.providerRegistry.get(config.providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${config.providerId}`)
    }

    // Execute inference
    let fullResponse = ''

    if (config.stream) {
      // Streaming mode
      const stream = await provider.streamInference(config)

      for await (const chunk of stream) {
        fullResponse += chunk.token
        window.webContents.send('llm:token', {
          runId,
          token: chunk.token,
          done: false
        })
      }

      window.webContents.send('llm:done', { runId })
    } else {
      // Non-streaming mode
      const result = await provider.infer(config)
      fullResponse = result.response

      window.webContents.send('llm:token', {
        runId,
        token: fullResponse,
        done: true
      })
    }

    // Build result
    const result: LLMInferenceResult = {
      conversationId: config.conversationId,
      response: fullResponse,
      tokensUsed: await provider.getTokenUsage(config.messages, fullResponse),
      model: config.modelId || 'default',
      provider: config.providerId,
      cached: false,
      latency: Date.now() - startTime
    }

    // Cache the response
    await this.cache.set(config, result)

    // Update conversation
    await this.conversationService.addMessage(config.conversationId, {
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now()
    })

    // Emit event for monitoring
    this.eventBus.broadcast('llm:inference-complete', {
      conversationId: config.conversationId,
      provider: config.providerId,
      tokensUsed: result.tokensUsed.total,
      latency: result.latency,
      cached: false
    })

    return result
  }

  /**
   * Cancel an ongoing inference request
   */
  async cancel(runId: string): Promise<void> {
    // Implementation will delegate to active provider
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(providerId?: string): Promise<LLMUsageStats> {
    // Implementation returns aggregated usage stats
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    console.log('[LLMService] Destroyed')
  }
}
```

### 2. LLMProviderRegistry

**Location:** `/src/main/llm/LLMProviderRegistry.ts`

Manages multiple LLM provider implementations with a plugin-like architecture.

```typescript
export interface LLMProvider {
  readonly id: string
  readonly name: string
  readonly models: LLMModelInfo[]

  initialize(config: LLMProviderConfig): Promise<void>
  infer(config: LLMInferenceConfig): Promise<LLMInferenceResult>
  streamInference(config: LLMInferenceConfig): AsyncIterator<LLMStreamChunk>
  getTokenUsage(messages: LLMMessage[], response: string): Promise<TokenUsage>
  isAvailable(): boolean
  destroy(): void
}

export interface LLMModelInfo {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  supportsFunctions: boolean
  supportsStreaming: boolean
  pricing?: {
    promptTokens: number  // per 1M tokens
    completionTokens: number  // per 1M tokens
  }
}

export class LLMProviderRegistry {
  private providers = new Map<string, LLMProvider>()

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider)
    console.log(`[LLMProviderRegistry] Registered provider: ${provider.id}`)
  }

  get(providerId: string): LLMProvider | undefined {
    return this.providers.get(providerId)
  }

  list(): LLMProvider[] {
    return Array.from(this.providers.values())
  }

  async initializeAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        await provider.initialize({})
      } catch (error) {
        console.error(`Failed to initialize provider ${provider.id}:`, error)
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      provider.destroy()
    }
    this.providers.clear()
  }
}
```

### 3. Provider Implementations

**Location:** `/src/main/llm/providers/`

#### OpenAIProvider

```typescript
// /src/main/llm/providers/OpenAIProvider.ts
import { ChatOpenAI } from '@langchain/openai'
import type { LLMProvider, LLMInferenceConfig } from '../types'

export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai'
  readonly name = 'OpenAI'
  readonly models: LLMModelInfo[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      contextWindow: 128000,
      maxTokens: 16384,
      supportsFunctions: true,
      supportsStreaming: true,
      pricing: { promptTokens: 2.50, completionTokens: 10.00 }
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      contextWindow: 128000,
      maxTokens: 16384,
      supportsFunctions: true,
      supportsStreaming: true,
      pricing: { promptTokens: 0.15, completionTokens: 0.60 }
    }
  ]

  private client: ChatOpenAI | null = null
  private apiKey: string | null = null

  async initialize(config: LLMProviderConfig): Promise<void> {
    this.apiKey = config.apiKey || process.env.VITE_OPENAI_API_KEY || null
    if (!this.apiKey) {
      throw new Error('OpenAI API key not provided')
    }
  }

  async infer(config: LLMInferenceConfig): Promise<LLMInferenceResult> {
    // Implementation using ChatOpenAI
  }

  async *streamInference(config: LLMInferenceConfig): AsyncIterator<LLMStreamChunk> {
    // Implementation using streaming
  }

  isAvailable(): boolean {
    return this.apiKey !== null
  }

  destroy(): void {
    this.client = null
  }
}
```

#### AnthropicProvider

```typescript
// /src/main/llm/providers/AnthropicProvider.ts
export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic'
  readonly name = 'Anthropic'
  readonly models: LLMModelInfo[] = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      pricing: { promptTokens: 3.00, completionTokens: 15.00 }
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      maxTokens: 8192,
      supportsFunctions: false,
      supportsStreaming: true,
      pricing: { promptTokens: 0.80, completionTokens: 4.00 }
    }
  ]

  // Implementation similar to OpenAIProvider
}
```

### 4. LLMCacheService

**Location:** `/src/main/services/llm-cache.ts`

Multi-level caching strategy for LLM responses.

```typescript
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'

export interface CacheEntry {
  key: string
  response: string
  tokensUsed: TokenUsage
  model: string
  provider: string
  timestamp: number
  expiresAt: number
  hitCount: number
}

export interface CacheConfig {
  maxMemoryEntries: number  // Default: 100
  maxDiskEntries: number     // Default: 1000
  ttl: number                // Default: 24 hours in ms
  enableDiskCache: boolean   // Default: true
}

/**
 * LLMCacheService provides multi-level caching for LLM responses.
 *
 * Levels:
 *   1. Memory cache (LRU) - fast, limited capacity
 *   2. Disk cache (persistent) - slower, larger capacity
 *
 * Cache key is derived from:
 *   - Provider ID
 *   - Model ID
 *   - System prompt
 *   - Message history (content only, not timestamps)
 *   - Temperature
 *   - Max tokens
 */
export class LLMCacheService implements Disposable {
  private memoryCache = new Map<string, CacheEntry>()
  private cacheDir: string
  private config: CacheConfig

  constructor(
    private readonly eventBus: EventBus,
    config?: Partial<CacheConfig>
  ) {
    this.config = {
      maxMemoryEntries: 100,
      maxDiskEntries: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      enableDiskCache: true,
      ...config
    }

    this.cacheDir = path.join(app.getPath('userData'), 'llm-cache')
  }

  async initialize(): Promise<void> {
    if (this.config.enableDiskCache) {
      await fs.mkdir(this.cacheDir, { recursive: true })
      await this.loadIndexFromDisk()
    }
  }

  /**
   * Get cached response if available
   */
  async get(config: LLMInferenceConfig): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(config)

    // Check memory cache first
    const memoryCached = this.memoryCache.get(key)
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      memoryCached.hitCount++
      this.eventBus.broadcast('llm:cache-hit', { level: 'memory', key })
      return memoryCached
    }

    // Check disk cache
    if (this.config.enableDiskCache) {
      const diskCached = await this.getFromDisk(key)
      if (diskCached && diskCached.expiresAt > Date.now()) {
        // Promote to memory cache
        this.memoryCache.set(key, diskCached)
        this.evictLRU()

        diskCached.hitCount++
        this.eventBus.broadcast('llm:cache-hit', { level: 'disk', key })
        return diskCached
      }
    }

    return null
  }

  /**
   * Store response in cache
   */
  async set(config: LLMInferenceConfig, result: LLMInferenceResult): Promise<void> {
    const key = this.generateCacheKey(config)

    const entry: CacheEntry = {
      key,
      response: result.response,
      tokensUsed: result.tokensUsed,
      model: result.model,
      provider: result.provider,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.ttl,
      hitCount: 0
    }

    // Store in memory cache
    this.memoryCache.set(key, entry)
    this.evictLRU()

    // Store in disk cache
    if (this.config.enableDiskCache) {
      await this.saveToDisk(key, entry)
    }

    this.eventBus.broadcast('llm:cache-set', { key })
  }

  /**
   * Generate deterministic cache key from config
   */
  private generateCacheKey(config: LLMInferenceConfig): string {
    // Extract only relevant fields for cache key
    const keyData = {
      providerId: config.providerId,
      modelId: config.modelId,
      systemPrompt: config.systemPrompt,
      messages: config.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      maxTokens: config.maxTokens
    }

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')

    return `${config.providerId}:${config.modelId}:${hash}`
  }

  /**
   * Evict least recently used entries from memory cache
   */
  private evictLRU(): void {
    if (this.memoryCache.size <= this.config.maxMemoryEntries) {
      return
    }

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.config.maxMemoryEntries)
    for (const [key] of toRemove) {
      this.memoryCache.delete(key)
    }
  }

  /**
   * Get entry from disk cache
   */
  private async getFromDisk(key: string): Promise<CacheEntry | null> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data) as CacheEntry
    } catch {
      return null
    }
  }

  /**
   * Save entry to disk cache
   */
  private async saveToDisk(key: string, entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`)
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
    } catch (error) {
      console.error('[LLMCacheService] Failed to save to disk:', error)
    }
  }

  /**
   * Load cache index from disk
   */
  private async loadIndexFromDisk(): Promise<void> {
    // Implementation to build in-memory index of disk cache
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()

    if (this.config.enableDiskCache) {
      const files = await fs.readdir(this.cacheDir)
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      )
    }

    this.eventBus.broadcast('llm:cache-cleared', {})
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number
    diskEntries: number
    totalHits: number
  } {
    // Implementation returns cache statistics
  }

  destroy(): void {
    this.memoryCache.clear()
  }
}
```

### 5. LLMConversationService

**Location:** `/src/main/services/llm-conversation.ts`

Manages conversation persistence and retrieval.

```typescript
export interface LLMConversation {
  id: string
  title: string
  brainSection: 'consciousness' | 'reasoning' | 'memory' | 'perception' | 'principles'
  messages: LLMMessage[]
  providerId: string
  modelId: string
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
}

/**
 * LLMConversationService manages conversation persistence.
 *
 * Storage Strategy:
 *   - Active conversations: In-memory + Disk (for recovery)
 *   - Historical conversations: Disk only
 *   - Workspace-scoped: Conversations tied to workspace directory
 */
export class LLMConversationService implements Disposable {
  private conversations = new Map<string, LLMConversation>()
  private conversationsDir: string

  constructor(
    private readonly eventBus: EventBus,
    private readonly workspaceService: WorkspaceService
  ) {
    // Conversations are stored in workspace directory
    // Format: <workspace>/.tesseract/conversations/
    this.conversationsDir = ''

    // Listen for workspace changes
    this.eventBus.subscribe('workspace:changed', this.handleWorkspaceChange.bind(this))
  }

  async initialize(): Promise<void> {
    await this.loadConversationsFromWorkspace()
  }

  /**
   * Create a new conversation
   */
  async create(config: {
    title: string
    brainSection: string
    providerId: string
    modelId: string
    systemPrompt?: string
  }): Promise<LLMConversation> {
    const conversation: LLMConversation = {
      id: crypto.randomUUID(),
      title: config.title,
      brainSection: config.brainSection as any,
      messages: config.systemPrompt
        ? [{ role: 'system', content: config.systemPrompt, timestamp: Date.now() }]
        : [],
      providerId: config.providerId,
      modelId: config.modelId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.conversations.set(conversation.id, conversation)
    await this.saveToDisk(conversation)

    this.eventBus.broadcast('llm:conversation-created', { conversationId: conversation.id })
    return conversation
  }

  /**
   * Add message to conversation
   */
  async addMessage(conversationId: string, message: LLMMessage): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    conversation.messages.push({
      ...message,
      timestamp: message.timestamp || Date.now()
    })
    conversation.updatedAt = Date.now()

    await this.saveToDisk(conversation)

    this.eventBus.broadcast('llm:message-added', {
      conversationId,
      messageRole: message.role
    })
  }

  /**
   * Get conversation by ID
   */
  get(conversationId: string): LLMConversation | undefined {
    return this.conversations.get(conversationId)
  }

  /**
   * List conversations for a brain section
   */
  list(brainSection?: string): LLMConversation[] {
    const all = Array.from(this.conversations.values())
    if (!brainSection) {
      return all
    }
    return all.filter(c => c.brainSection === brainSection)
  }

  /**
   * Delete conversation
   */
  async delete(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId)
    await this.deleteFromDisk(conversationId)

    this.eventBus.broadcast('llm:conversation-deleted', { conversationId })
  }

  /**
   * Handle workspace change
   */
  private async handleWorkspaceChange(event: any): Promise<void> {
    // Clear current conversations
    this.conversations.clear()

    // Load conversations from new workspace
    if (event.currentPath) {
      await this.loadConversationsFromWorkspace()
    }
  }

  /**
   * Load conversations from current workspace
   */
  private async loadConversationsFromWorkspace(): Promise<void> {
    const workspacePath = this.workspaceService.getCurrent()
    if (!workspacePath) {
      return
    }

    this.conversationsDir = path.join(workspacePath, '.tesseract', 'conversations')

    try {
      await fs.mkdir(this.conversationsDir, { recursive: true })
      const files = await fs.readdir(this.conversationsDir)

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.conversationsDir, file),
            'utf-8'
          )
          const conversation = JSON.parse(data) as LLMConversation
          this.conversations.set(conversation.id, conversation)
        }
      }

      console.log(`[LLMConversationService] Loaded ${this.conversations.size} conversations`)
    } catch (error) {
      console.error('[LLMConversationService] Failed to load conversations:', error)
    }
  }

  /**
   * Save conversation to disk
   */
  private async saveToDisk(conversation: LLMConversation): Promise<void> {
    if (!this.conversationsDir) {
      return
    }

    try {
      const filePath = path.join(this.conversationsDir, `${conversation.id}.json`)
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8')
    } catch (error) {
      console.error('[LLMConversationService] Failed to save conversation:', error)
    }
  }

  /**
   * Delete conversation from disk
   */
  private async deleteFromDisk(conversationId: string): Promise<void> {
    if (!this.conversationsDir) {
      return
    }

    try {
      const filePath = path.join(this.conversationsDir, `${conversationId}.json`)
      await fs.unlink(filePath)
    } catch (error) {
      console.error('[LLMConversationService] Failed to delete conversation:', error)
    }
  }

  destroy(): void {
    this.conversations.clear()
  }
}
```

### 6. LlmIpc Module

**Location:** `/src/main/ipc/LlmIpc.ts`

IPC handlers for LLM operations.

```typescript
import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { LLMService } from '../services/llm'
import type { LLMConversationService } from '../services/llm-conversation'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'

export class LlmIpc implements IpcModule {
  readonly name = 'llm'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    // Create conversation
    ipcMain.handle(
      'llm:create-conversation',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, config: any) => {
        const conversationService = getWindowService<LLMConversationService>(
          event,
          container,
          'llmConversation'
        )
        return conversationService.create(config)
      }, 'llm:create-conversation')
    )

    // Execute inference
    ipcMain.handle(
      'llm:infer',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, config: any, runId: string) => {
        const llmService = getWindowService<LLMService>(event, container, 'llm')
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')

        return llmService.infer(config, win, runId)
      }, 'llm:infer')
    )

    // Get conversation
    ipcMain.handle(
      'llm:get-conversation',
      wrapIpcHandler((event: IpcMainInvokeEvent, conversationId: string) => {
        const conversationService = getWindowService<LLMConversationService>(
          event,
          container,
          'llmConversation'
        )
        return conversationService.get(conversationId)
      }, 'llm:get-conversation')
    )

    // List conversations
    ipcMain.handle(
      'llm:list-conversations',
      wrapIpcHandler((event: IpcMainInvokeEvent, brainSection?: string) => {
        const conversationService = getWindowService<LLMConversationService>(
          event,
          container,
          'llmConversation'
        )
        return conversationService.list(brainSection)
      }, 'llm:list-conversations')
    )

    // Delete conversation
    ipcMain.handle(
      'llm:delete-conversation',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, conversationId: string) => {
        const conversationService = getWindowService<LLMConversationService>(
          event,
          container,
          'llmConversation'
        )
        return conversationService.delete(conversationId)
      }, 'llm:delete-conversation')
    )

    // Cancel inference
    ipcMain.handle(
      'llm:cancel',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, runId: string) => {
        const llmService = getWindowService<LLMService>(event, container, 'llm')
        return llmService.cancel(runId)
      }, 'llm:cancel')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
```

---

## State Management

### Redux Store Structure

**Location:** `/src/renderer/src/store/llmSlice.ts`

```typescript
import { createSlice, createSelector, nanoid, PayloadAction } from '@reduxjs/toolkit'

export interface LLMMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface LLMConversation {
  id: string
  title: string
  brainSection: 'consciousness' | 'reasoning' | 'memory' | 'perception' | 'principles'
  messages: LLMMessage[]
  providerId: string
  modelId: string
  createdAt: number
  updatedAt: number
  isStreaming: boolean
  currentRunId: string | null
}

export interface LLMProvider {
  id: string
  name: string
  models: Array<{
    id: string
    name: string
    contextWindow: number
    maxTokens: number
  }>
  configured: boolean
}

interface LLMState {
  // Conversations
  conversations: Record<string, LLMConversation>
  activeConversationId: string | null

  // Providers
  providers: Record<string, LLMProvider>
  selectedProviderId: string | null

  // UI State
  isStreaming: boolean
  streamingConversationId: string | null

  // Cache stats
  cacheStats: {
    memoryEntries: number
    diskEntries: number
    totalHits: number
  }
}

const initialState: LLMState = {
  conversations: {},
  activeConversationId: null,
  providers: {},
  selectedProviderId: null,
  isStreaming: false,
  streamingConversationId: null,
  cacheStats: {
    memoryEntries: 0,
    diskEntries: 0,
    totalHits: 0
  }
}

export const llmSlice = createSlice({
  name: 'llm',
  initialState,
  reducers: {
    // Conversation management
    conversationCreated(state, action: PayloadAction<LLMConversation>) {
      state.conversations[action.payload.id] = action.payload
      state.activeConversationId = action.payload.id
    },

    setActiveConversation(state, action: PayloadAction<string>) {
      state.activeConversationId = action.payload
    },

    conversationDeleted(state, action: PayloadAction<string>) {
      delete state.conversations[action.payload]
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null
      }
    },

    // Message management
    userMessageAdded(state, action: PayloadAction<{
      conversationId: string
      content: string
    }>) {
      const conversation = state.conversations[action.payload.conversationId]
      if (!conversation) return

      conversation.messages.push({
        id: nanoid(),
        role: 'user',
        content: action.payload.content,
        timestamp: Date.now()
      })
      conversation.updatedAt = Date.now()
    },

    assistantMessageStarted(state, action: PayloadAction<{
      conversationId: string
      runId: string
    }>) {
      const conversation = state.conversations[action.payload.conversationId]
      if (!conversation) return

      conversation.messages.push({
        id: nanoid(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      })
      conversation.isStreaming = true
      conversation.currentRunId = action.payload.runId

      state.isStreaming = true
      state.streamingConversationId = action.payload.conversationId
    },

    tokenAppended(state, action: PayloadAction<{
      conversationId: string
      token: string
    }>) {
      const conversation = state.conversations[action.payload.conversationId]
      if (!conversation) return

      const lastMessage = conversation.messages[conversation.messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        lastMessage.content += action.payload.token
        conversation.updatedAt = Date.now()
      }
    },

    streamingCompleted(state, action: PayloadAction<{
      conversationId: string
    }>) {
      const conversation = state.conversations[action.payload.conversationId]
      if (!conversation) return

      conversation.isStreaming = false
      conversation.currentRunId = null

      state.isStreaming = false
      state.streamingConversationId = null
    },

    // Provider management
    providersLoaded(state, action: PayloadAction<LLMProvider[]>) {
      state.providers = action.payload.reduce((acc, provider) => {
        acc[provider.id] = provider
        return acc
      }, {} as Record<string, LLMProvider>)

      // Set default provider if none selected
      if (!state.selectedProviderId && action.payload.length > 0) {
        state.selectedProviderId = action.payload[0].id
      }
    },

    providerSelected(state, action: PayloadAction<string>) {
      state.selectedProviderId = action.payload
    },

    // Cache stats
    cacheStatsUpdated(state, action: PayloadAction<{
      memoryEntries: number
      diskEntries: number
      totalHits: number
    }>) {
      state.cacheStats = action.payload
    }
  }
})

export const {
  conversationCreated,
  setActiveConversation,
  conversationDeleted,
  userMessageAdded,
  assistantMessageStarted,
  tokenAppended,
  streamingCompleted,
  providersLoaded,
  providerSelected,
  cacheStatsUpdated
} = llmSlice.actions

// Selectors
export const selectConversations = (state: { llm: LLMState }) =>
  Object.values(state.llm.conversations)

export const selectActiveConversation = createSelector(
  [(state: { llm: LLMState }) => state.llm.conversations, (state: { llm: LLMState }) => state.llm.activeConversationId],
  (conversations, activeId) => activeId ? conversations[activeId] : null
)

export const selectConversationsBySection = (brainSection: string) =>
  createSelector(
    [selectConversations],
    conversations => conversations.filter(c => c.brainSection === brainSection)
  )

export const selectProviders = (state: { llm: LLMState }) =>
  Object.values(state.llm.providers)

export const selectSelectedProvider = createSelector(
  [(state: { llm: LLMState }) => state.llm.providers, (state: { llm: LLMState }) => state.llm.selectedProviderId],
  (providers, selectedId) => selectedId ? providers[selectedId] : null
)

export const selectIsStreaming = (state: { llm: LLMState }) =>
  state.llm.isStreaming

export const selectCacheStats = (state: { llm: LLMState }) =>
  state.llm.cacheStats

export default llmSlice.reducer
```

### Register in Store

**Location:** `/src/renderer/src/store/index.ts`

```typescript
import llmReducer from './llmSlice'

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    posts: postsReducer,
    directories: directoriesReducer,
    llm: llmReducer  // Add LLM reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(postsSyncMiddleware)
})
```

---

## Caching Strategy

### Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cache Hierarchy                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: Memory Cache (LRU)                           │
│  - Capacity: 100 entries                               │
│  - Hit time: < 1ms                                     │
│  - Eviction: LRU policy                                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 2: Disk Cache (Persistent)                      │
│  - Capacity: 1000 entries                              │
│  - Hit time: < 10ms                                    │
│  - Location: <userData>/llm-cache/                     │
│  - TTL: 24 hours (configurable)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Cache Key Generation Strategy

Cache keys are generated deterministically from:
1. Provider ID (e.g., "openai", "anthropic")
2. Model ID (e.g., "gpt-4o-mini", "claude-3-5-sonnet")
3. System prompt (if present)
4. Message history (content only, timestamps excluded)
5. Temperature parameter
6. Max tokens parameter

**Rationale:**
- Deterministic keys enable cache hits for identical requests
- Excludes timestamps to maximize cache hit rate
- Includes all parameters that affect model output
- SHA-256 hash ensures fixed-length keys

### Cache Invalidation

**Time-based:**
- Default TTL: 24 hours
- Configurable per deployment

**Event-based:**
- Provider configuration changes
- Model updates
- Manual cache clear

### Cache Performance Metrics

Track and expose via EventBus:
- Hit rate (memory vs disk)
- Average response time
- Cache size
- Eviction count
- Cost savings (estimated)

---

## Configuration Management

### Configuration Storage

**Location:** Extend existing `/src/main/services/store.ts`

```typescript
export interface LLMProviderSettings {
  apiKey: string
  selectedModel: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

export interface LLMConfig {
  providers: Record<string, LLMProviderSettings>
  defaultProvider: string
  cache: {
    enabled: boolean
    maxMemoryEntries: number
    maxDiskEntries: number
    ttl: number
  }
}

// Extend StoreSchema
export interface StoreSchema {
  modelSettings: Record<string, ModelSettings>
  currentWorkspace: string | null
  recentWorkspaces: WorkspaceInfo[]
  llmConfig: LLMConfig  // Add LLM config
}

// Add methods to StoreService
export class StoreService {
  // ... existing methods ...

  getLLMConfig(): LLMConfig {
    return this.data.llmConfig || this.getDefaultLLMConfig()
  }

  setLLMProviderSettings(providerId: string, settings: LLMProviderSettings): void {
    if (!this.data.llmConfig) {
      this.data.llmConfig = this.getDefaultLLMConfig()
    }
    this.data.llmConfig.providers[providerId] = settings
    this.save()
  }

  getLLMProviderSettings(providerId: string): LLMProviderSettings | null {
    return this.data.llmConfig?.providers[providerId] ?? null
  }

  private getDefaultLLMConfig(): LLMConfig {
    return {
      providers: {},
      defaultProvider: 'openai',
      cache: {
        enabled: true,
        maxMemoryEntries: 100,
        maxDiskEntries: 1000,
        ttl: 24 * 60 * 60 * 1000
      }
    }
  }
}
```

### Secure API Key Storage

**Strategy:**
1. Use Electron's `safeStorage` API for encryption
2. Store encrypted keys in settings.json
3. Decrypt on demand in main process
4. Never expose keys to renderer process

**Implementation:**

```typescript
// /src/main/services/secure-storage.ts
import { safeStorage } from 'electron'

export class SecureStorageService {
  encryptString(plaintext: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[SecureStorage] Encryption not available, storing in plaintext')
      return plaintext
    }

    const buffer = safeStorage.encryptString(plaintext)
    return buffer.toString('base64')
  }

  decryptString(encrypted: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return encrypted
    }

    const buffer = Buffer.from(encrypted, 'base64')
    return safeStorage.decryptString(buffer)
  }
}
```

### Environment Variables

Support multiple configuration sources:
1. Environment variables (development)
2. Encrypted settings file (production)
3. User settings UI (runtime configuration)

**Priority:** User Settings > Settings File > Environment Variables

---

## Integration with Brain Pages

### React Hook for LLM Conversations

**Location:** `/src/renderer/src/hooks/useLLMConversation.ts`

```typescript
import { useEffect, useCallback, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  conversationCreated,
  userMessageAdded,
  assistantMessageStarted,
  tokenAppended,
  streamingCompleted,
  selectActiveConversation,
  selectIsStreaming
} from '@/store/llmSlice'
import { nanoid } from '@reduxjs/toolkit'

export interface UseLLMConversationOptions {
  brainSection: 'consciousness' | 'reasoning' | 'memory' | 'perception' | 'principles'
  providerId?: string
  modelId?: string
  systemPrompt?: string
}

export function useLLMConversation(options: UseLLMConversationOptions) {
  const dispatch = useAppDispatch()
  const activeConversation = useAppSelector(selectActiveConversation)
  const isStreaming = useAppSelector(selectIsStreaming)
  const [error, setError] = useState<string | null>(null)

  // Initialize conversation if needed
  useEffect(() => {
    if (!activeConversation || activeConversation.brainSection !== options.brainSection) {
      createNewConversation()
    }
  }, [options.brainSection])

  // Listen for streaming events
  useEffect(() => {
    const handleToken = (_event: any, data: { runId: string; token: string; done: boolean }) => {
      if (!activeConversation) return

      if (data.done) {
        dispatch(streamingCompleted({ conversationId: activeConversation.id }))
      } else {
        dispatch(tokenAppended({
          conversationId: activeConversation.id,
          token: data.token
        }))
      }
    }

    const handleError = (_event: any, data: { runId: string; error: string }) => {
      setError(data.error)
      if (activeConversation) {
        dispatch(streamingCompleted({ conversationId: activeConversation.id }))
      }
    }

    window.api.onLLMToken(handleToken)
    window.api.onLLMError(handleError)

    return () => {
      window.api.offLLMToken(handleToken)
      window.api.offLLMError(handleError)
    }
  }, [activeConversation, dispatch])

  const createNewConversation = useCallback(async () => {
    try {
      const result = await window.api.createLLMConversation({
        title: `New ${options.brainSection} conversation`,
        brainSection: options.brainSection,
        providerId: options.providerId || 'openai',
        modelId: options.modelId || 'gpt-4o-mini',
        systemPrompt: options.systemPrompt
      })

      dispatch(conversationCreated(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
    }
  }, [options, dispatch])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation || isStreaming) {
      return
    }

    setError(null)
    const runId = nanoid()

    // Add user message to store
    dispatch(userMessageAdded({
      conversationId: activeConversation.id,
      content
    }))

    // Start assistant message
    dispatch(assistantMessageStarted({
      conversationId: activeConversation.id,
      runId
    }))

    try {
      // Build messages array
      const messages = [
        ...activeConversation.messages,
        { role: 'user' as const, content }
      ]

      // Execute inference
      await window.api.llmInfer({
        conversationId: activeConversation.id,
        messages,
        providerId: activeConversation.providerId,
        modelId: activeConversation.modelId,
        stream: true
      }, runId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      dispatch(streamingCompleted({ conversationId: activeConversation.id }))
    }
  }, [activeConversation, isStreaming, dispatch])

  const cancelMessage = useCallback(async () => {
    if (!activeConversation || !activeConversation.currentRunId) {
      return
    }

    try {
      await window.api.llmCancel(activeConversation.currentRunId)
      dispatch(streamingCompleted({ conversationId: activeConversation.id }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }, [activeConversation, dispatch])

  return {
    conversation: activeConversation,
    sendMessage,
    cancelMessage,
    isStreaming,
    error,
    createNewConversation
  }
}
```

### Example Brain Page Integration

**Location:** `/src/renderer/src/pages/brain/ConsciousnessPage.tsx`

```typescript
import React, { useState } from 'react'
import { Lightbulb, Send, StopCircle } from 'lucide-react'
import { useLLMConversation } from '@/hooks/useLLMConversation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const ConsciousnessPage: React.FC = () => {
  const [input, setInput] = useState('')
  const { conversation, sendMessage, cancelMessage, isStreaming, error } = useLLMConversation({
    brainSection: 'consciousness',
    systemPrompt: 'You are a metacognitive assistant specializing in self-awareness and consciousness. Help users explore their thoughts and internal states.'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    await sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Consciousness</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {conversation?.messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary/10 ml-8'
                  : 'bg-card border border-border mr-8'
              }`}
            >
              <div className="text-sm font-medium mb-2 text-muted-foreground">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="mx-auto max-w-4xl flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about consciousness, self-awareness, or metacognition..."
            className="resize-none"
            rows={3}
            disabled={isStreaming}
          />
          <div className="flex flex-col gap-2">
            {isStreaming ? (
              <Button
                type="button"
                onClick={cancelMessage}
                variant="destructive"
                size="icon"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default ConsciousnessPage
```

### Preload API Extensions

**Location:** `/src/preload/index.ts`

```typescript
const api = {
  // ... existing methods ...

  // LLM methods
  createLLMConversation: (config: any): Promise<any> => {
    return ipcRenderer.invoke('llm:create-conversation', config)
  },

  llmInfer: (config: any, runId: string): Promise<any> => {
    return ipcRenderer.invoke('llm:infer', config, runId)
  },

  llmCancel: (runId: string): Promise<void> => {
    return ipcRenderer.invoke('llm:cancel', runId)
  },

  getLLMConversation: (conversationId: string): Promise<any> => {
    return ipcRenderer.invoke('llm:get-conversation', conversationId)
  },

  listLLMConversations: (brainSection?: string): Promise<any[]> => {
    return ipcRenderer.invoke('llm:list-conversations', brainSection)
  },

  deleteLLMConversation: (conversationId: string): Promise<void> => {
    return ipcRenderer.invoke('llm:delete-conversation', conversationId)
  },

  // Event listeners
  onLLMToken: (callback: (data: { runId: string; token: string; done: boolean }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any): void => {
      callback(data)
    }
    ipcRenderer.on('llm:token', handler)
    return () => {
      ipcRenderer.removeListener('llm:token', handler)
    }
  },

  onLLMError: (callback: (data: { runId: string; error: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any): void => {
      callback(data)
    }
    ipcRenderer.on('llm:error', handler)
    return () => {
      ipcRenderer.removeListener('llm:error', handler)
    }
  },

  offLLMToken: (callback: any): void => {
    ipcRenderer.removeListener('llm:token', callback)
  },

  offLLMError: (callback: any): void => {
    ipcRenderer.removeListener('llm:error', callback)
  }
}
```

### TypeScript Definitions

**Location:** `/src/preload/index.d.ts`

```typescript
export interface ElectronAPI {
  // ... existing methods ...

  // LLM methods
  createLLMConversation: (config: {
    title: string
    brainSection: string
    providerId: string
    modelId: string
    systemPrompt?: string
  }) => Promise<LLMConversation>

  llmInfer: (config: LLMInferenceConfig, runId: string) => Promise<LLMInferenceResult>
  llmCancel: (runId: string) => Promise<void>
  getLLMConversation: (conversationId: string) => Promise<LLMConversation | null>
  listLLMConversations: (brainSection?: string) => Promise<LLMConversation[]>
  deleteLLMConversation: (conversationId: string) => Promise<void>

  // Event listeners
  onLLMToken: (callback: (data: { runId: string; token: string; done: boolean }) => void) => () => void
  onLLMError: (callback: (data: { runId: string; error: string }) => void) => () => void
  offLLMToken: (callback: any) => void
  offLLMError: (callback: any) => void
}
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

**Tasks:**
1. Implement LLMProviderRegistry
2. Create OpenAIProvider implementation
3. Build LLMService core orchestration
4. Set up LlmIpc module
5. Add Redux llmSlice
6. Create useLLMConversation hook

**Deliverables:**
- Basic OpenAI integration working
- Streaming responses functional
- Redux state management in place

### Phase 2: Caching & Persistence (Week 3)

**Tasks:**
1. Implement LLMCacheService (memory + disk)
2. Create LLMConversationService
3. Integrate workspace-scoped conversation storage
4. Add cache statistics tracking

**Deliverables:**
- Multi-level caching operational
- Conversation persistence working
- Cache hit rate monitoring

### Phase 3: Multi-Provider Support (Week 4)

**Tasks:**
1. Implement AnthropicProvider
2. Add LocalModelProvider (Ollama)
3. Create provider selection UI
4. Implement secure API key storage

**Deliverables:**
- Multiple providers supported
- Provider switching functional
- Secure credential management

### Phase 4: Brain Page Integration (Week 5)

**Tasks:**
1. Update all brain pages with LLM integration
2. Create specialized system prompts per section
3. Build conversation history UI
4. Add conversation management features

**Deliverables:**
- All brain pages with LLM chat
- Section-specific AI behaviors
- Conversation history and management

### Phase 5: Advanced Features (Week 6)

**Tasks:**
1. Implement usage tracking and cost estimation
2. Add conversation export/import
3. Create settings UI for LLM configuration
4. Add keyboard shortcuts and UX improvements

**Deliverables:**
- Cost tracking dashboard
- Conversation portability
- Polished UX

### Phase 6: Testing & Optimization (Week 7-8)

**Tasks:**
1. Write unit tests for services
2. Create integration tests for IPC layer
3. Performance profiling and optimization
4. Documentation and code comments

**Deliverables:**
- >80% test coverage
- Optimized performance
- Complete documentation

---

## Security Considerations

### 1. API Key Protection

**Threats:**
- Exposure in renderer process
- Leakage through logs
- Unauthorized access to settings file

**Mitigations:**
- Use Electron's safeStorage for encryption
- Never send API keys to renderer process
- Sanitize logs to remove sensitive data
- Implement access controls on settings file

### 2. Prompt Injection Prevention

**Threats:**
- Malicious user input manipulating system prompts
- Context extraction attacks
- Model jailbreaking attempts

**Mitigations:**
- Input validation and sanitization
- Clear separation of system and user messages
- Implement content filtering
- Monitor and log suspicious patterns

### 3. Data Privacy

**Threats:**
- Conversation data leakage
- Caching sensitive information
- Persistence of private data

**Mitigations:**
- Workspace-scoped conversation storage
- User-controlled cache clearing
- Option to disable caching
- Clear data retention policies

### 4. Network Security

**Threats:**
- Man-in-the-middle attacks
- Unauthorized API access
- Data interception

**Mitigations:**
- Use HTTPS for all API calls
- Implement request signing
- Validate TLS certificates
- Network request monitoring

---

## Performance Optimization

### 1. Streaming Optimization

**Strategy:**
- Use WebSocket connections for streaming where supported
- Implement backpressure handling
- Batch token updates to renderer (e.g., every 50ms)

**Benefits:**
- Reduced IPC overhead
- Smoother UI updates
- Better resource utilization

### 2. Cache Optimization

**Strategy:**
- LRU eviction for memory cache
- Asynchronous disk cache operations
- Index-based lookup for disk cache
- Compression for large responses

**Benefits:**
- Reduced API costs
- Faster response times
- Lower latency for repeated queries

### 3. Message Batching

**Strategy:**
- Batch token updates to renderer
- Coalesce state updates in Redux
- Debounce UI re-renders

**Benefits:**
- Reduced CPU usage
- Smoother animations
- Better battery life

### 4. Lazy Loading

**Strategy:**
- Load conversation history on demand
- Virtualize long conversation lists
- Paginate message history

**Benefits:**
- Faster initial load
- Lower memory footprint
- Improved scrolling performance

---

## Testing Strategy

### 1. Unit Tests

**Main Process:**
```typescript
// /tests/unit/main/services/llm.test.ts
describe('LLMService', () => {
  it('should execute inference with caching', async () => {
    // Test implementation
  })

  it('should handle streaming responses', async () => {
    // Test implementation
  })

  it('should cancel ongoing inference', async () => {
    // Test implementation
  })
})
```

**Renderer:**
```typescript
// /tests/unit/renderer/hooks/useLLMConversation.test.ts
describe('useLLMConversation', () => {
  it('should create new conversation', async () => {
    // Test implementation
  })

  it('should send message and receive streaming response', async () => {
    // Test implementation
  })

  it('should handle errors gracefully', async () => {
    // Test implementation
  })
})
```

### 2. Integration Tests

```typescript
// /tests/integration/llm-flow.test.ts
describe('LLM End-to-End Flow', () => {
  it('should complete full conversation flow', async () => {
    // 1. Create conversation
    // 2. Send message
    // 3. Receive streaming response
    // 4. Verify cache
    // 5. Verify persistence
  })
})
```

### 3. Performance Tests

```typescript
// /tests/performance/llm-cache.test.ts
describe('LLM Cache Performance', () => {
  it('should achieve >90% cache hit rate for repeated queries', async () => {
    // Test implementation
  })

  it('should handle 1000 concurrent requests', async () => {
    // Test implementation
  })
})
```

### 4. E2E Tests

```typescript
// /tests/e2e/brain-pages.spec.ts
test('Consciousness page LLM interaction', async ({ page }) => {
  await page.goto('/#/brain/consciousness')
  await page.fill('[data-testid="llm-input"]', 'What is consciousness?')
  await page.click('[data-testid="send-button"]')
  await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible()
})
```

---

## Appendix: File Structure

```
tesseract-ai/
├── src/
│   ├── main/
│   │   ├── llm/
│   │   │   ├── types.ts
│   │   │   ├── LLMProviderRegistry.ts
│   │   │   └── providers/
│   │   │       ├── OpenAIProvider.ts
│   │   │       ├── AnthropicProvider.ts
│   │   │       └── LocalModelProvider.ts
│   │   ├── services/
│   │   │   ├── llm.ts
│   │   │   ├── llm-cache.ts
│   │   │   ├── llm-conversation.ts
│   │   │   └── secure-storage.ts
│   │   ├── ipc/
│   │   │   └── LlmIpc.ts
│   │   └── bootstrap.ts (update)
│   ├── renderer/src/
│   │   ├── hooks/
│   │   │   └── useLLMConversation.ts
│   │   ├── store/
│   │   │   ├── llmSlice.ts
│   │   │   └── index.ts (update)
│   │   └── pages/brain/
│   │       ├── ConsciousnessPage.tsx (update)
│   │       ├── ReasoningPage.tsx (update)
│   │       ├── MemoryPage.tsx (update)
│   │       ├── PerceptionPage.tsx (update)
│   │       └── PrinciplesPage.tsx (update)
│   └── preload/
│       ├── index.ts (update)
│       └── index.d.ts (update)
└── tests/
    ├── unit/
    │   ├── main/
    │   │   └── services/
    │   │       ├── llm.test.ts
    │   │       └── llm-cache.test.ts
    │   └── renderer/
    │       └── hooks/
    │           └── useLLMConversation.test.ts
    ├── integration/
    │   └── llm-flow.test.ts
    └── e2e/
        └── brain-pages.spec.ts
```

---

## Summary

This architecture provides a robust, scalable foundation for integrating LLM capabilities into the brain subsection pages. Key design decisions:

1. **Service-Oriented:** Business logic in main process services, following existing patterns
2. **Window-Scoped:** Conversations isolated per workspace window
3. **Provider Abstraction:** Easy to add new LLM providers
4. **Multi-Level Caching:** Optimizes cost and performance
5. **Streaming-First:** Better UX with real-time responses
6. **Secure:** API keys encrypted, sensitive data protected
7. **Testable:** Clear separation of concerns enables comprehensive testing

The implementation follows the existing Tesseract AI architecture patterns, ensuring consistency and maintainability. The roadmap provides a clear path from basic functionality to advanced features over 8 weeks.
