# LLM Inference IPC Architecture Design

## Overview

This document outlines the Electron IPC architecture for LLM inference integration in OpenWriter. The design follows the existing IPC patterns established in the codebase while introducing specialized features for LLM operations including streaming, session management, and robust error handling.

## Architecture Principles

1. **Consistency**: Follow existing IPC module patterns (`IpcModule` interface)
2. **Security**: Use context isolation and preload scripts for secure communication
3. **Streaming**: Support real-time token streaming from LLM responses
4. **Session Management**: Handle multiple concurrent LLM sessions
5. **Error Handling**: Standardized error responses with timeout management
6. **Type Safety**: Full TypeScript type definitions across main and renderer processes

## System Components

### 1. IPC Module Layer (`src/main/ipc/LlmIpc.ts`)

**Responsibilities:**
- Register IPC handlers for LLM operations
- Route requests to appropriate services
- Handle standardized error wrapping
- Manage window-scoped service access

**Key Features:**
```typescript
export class LlmIpc implements IpcModule {
  readonly name = 'llm'

  // Handlers:
  // - llm:inference - Single inference request with streaming
  // - llm:session:create - Create new LLM session
  // - llm:session:destroy - Destroy LLM session
  // - llm:session:run - Run inference in session context
  // - llm:cancel - Cancel active inference
  // - llm:get-status - Get service status
}
```

### 2. Service Layer (`src/main/services/llm-inference.ts`)

**Responsibilities:**
- Manage LLM inference lifecycle
- Handle session state management
- Coordinate with LLM providers (OpenAI, Anthropic, etc.)
- Stream management and cancellation
- Token usage tracking

**Core Features:**
```typescript
export class LlmInferenceService {
  // Session Management
  private sessions: Map<string, LlmSession>
  private activeInferences: Map<string, AbortController>

  // Methods:
  createSession(config: LlmSessionConfig): LlmSessionInfo
  destroySession(sessionId: string): boolean
  runInference(options: LlmInferenceOptions, window: BrowserWindow): Promise<void>
  cancelInference(inferenceId: string): void
  getStatus(): LlmServiceStatus
}
```

### 3. Preload API Layer (`src/preload/index.ts`)

**Responsibilities:**
- Expose secure LLM API to renderer process
- Type-safe method signatures
- Event listener management
- IpcResult unwrapping for clean renderer experience

**API Surface:**
```typescript
interface LlmApi {
  // Inference Methods
  llmInference(options: LlmInferenceRequest): Promise<string> // inferenceId
  llmCancel(inferenceId: string): Promise<boolean>
  llmGetStatus(): Promise<LlmServiceStatus>

  // Session Management
  llmCreateSession(config: LlmSessionConfig): Promise<LlmSessionInfo>
  llmDestroySession(sessionId: string): Promise<boolean>
  llmRunSession(options: LlmSessionRunOptions): Promise<string> // inferenceId

  // Event Listeners
  onLlmToken(callback: (event: LlmTokenEvent) => void): () => void
  onLlmThinking(callback: (event: LlmThinkingEvent) => void): () => void
  onLlmDone(callback: (event: LlmDoneEvent) => void): () => void
  onLlmError(callback: (event: LlmErrorEvent) => void): () => void
}
```

### 4. Type Definitions (`src/preload/index.d.ts`)

Complete TypeScript definitions for all LLM-related types exposed to renderer.

## Detailed Design

### IPC Channels

| Channel | Type | Direction | Purpose |
|---------|------|-----------|---------|
| `llm:inference` | invoke | Renderer → Main | Start new inference request |
| `llm:cancel` | invoke | Renderer → Main | Cancel active inference |
| `llm:session:create` | invoke | Renderer → Main | Create LLM session |
| `llm:session:destroy` | invoke | Renderer → Main | Destroy LLM session |
| `llm:session:run` | invoke | Renderer → Main | Run inference in session |
| `llm:get-status` | invoke | Renderer → Main | Get service status |
| `llm:token` | send | Main → Renderer | Stream token chunk |
| `llm:thinking` | send | Main → Renderer | Thinking/processing status |
| `llm:done` | send | Main → Renderer | Inference completed |
| `llm:error` | send | Main → Renderer | Error occurred |
| `llm:progress` | send | Main → Renderer | Progress update |

### Data Flow

#### 1. Simple Inference Flow

```
Renderer Process                Main Process
     |                               |
     |-- llm:inference (options) --> |
     |                               | LlmInferenceService
     |                               |   ↓ validate & init
     |                               |   ↓ create AbortController
     |                               |   ↓ call LLM provider
     | <---- { inferenceId } --------|
     |                               |
     | <---- llm:thinking ---------- | (optional)
     |                               |
     | <---- llm:token ------------- | (streaming)
     | <---- llm:token ------------- | (streaming)
     | <---- llm:token ------------- | (streaming)
     |                               |
     | <---- llm:done -------------- | (complete)
     |                               |
```

#### 2. Session-Based Inference Flow

```
Renderer Process                Main Process
     |                               |
     |-- llm:session:create -------> |
     | <---- { sessionInfo } --------|
     |                               |
     |-- llm:session:run ----------> |
     | <---- { inferenceId } --------|
     |                               |
     | <---- llm:token (streaming)---|
     | <---- llm:done --------------- |
     |                               |
     |-- llm:session:destroy ------> |
     | <---- { success: true } ------|
```

#### 3. Cancellation Flow

```
Renderer Process                Main Process
     |                               |
     | (inference running...)        | (streaming tokens...)
     |                               |
     |-- llm:cancel(inferenceId) --> |
     |                               |   ↓ abort stream
     |                               |   ↓ cleanup resources
     | <---- { success: true } ------|
     |                               |
     | <---- llm:done(cancelled) ----|
```

### Type Definitions

```typescript
// Request Types
interface LlmInferenceRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  providerId: string  // 'openai', 'anthropic', etc.
  modelId?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  stream?: boolean
  timeoutMs?: number
}

interface LlmSessionConfig {
  sessionId: string
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

interface LlmSessionRunOptions {
  sessionId: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  stream?: boolean
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

// Response Types
interface LlmSessionInfo {
  sessionId: string
  providerId: string
  modelId: string
  createdAt: number
  lastActivity: number
  isActive: boolean
  messageCount: number
  totalTokens: number
  metadata?: Record<string, unknown>
}

interface LlmServiceStatus {
  totalSessions: number
  activeSessions: number
  activeInferences: number
  totalInferences: number
  totalTokens: number
}

// Event Types
interface LlmTokenEvent {
  inferenceId: string
  sessionId?: string
  token: string
  index: number
}

interface LlmThinkingEvent {
  inferenceId: string
  sessionId?: string
  status: string
  progress?: number
}

interface LlmDoneEvent {
  inferenceId: string
  sessionId?: string
  totalTokens: number
  cancelled?: boolean
  finishReason?: 'stop' | 'length' | 'content_filter'
}

interface LlmErrorEvent {
  inferenceId: string
  sessionId?: string
  error: string
  code: string
  retryable: boolean
}

interface LlmProgressEvent {
  inferenceId: string
  sessionId?: string
  current: number
  total?: number
  message?: string
}
```

### Error Handling

#### Error Categories

1. **Configuration Errors** (Non-retryable)
   - Missing API keys
   - Invalid provider ID
   - Invalid model ID
   - Invalid parameters

2. **Network Errors** (Retryable)
   - Connection timeout
   - Network unavailable
   - DNS resolution failure

3. **API Errors** (Contextual)
   - Rate limit exceeded (retryable after delay)
   - Invalid request (non-retryable)
   - Insufficient quota (non-retryable)
   - Server error (retryable)

4. **Timeout Errors** (Retryable)
   - Inference timeout
   - Stream timeout

5. **Cancellation** (Expected)
   - User-initiated cancellation
   - Window closure

#### Error Response Format

```typescript
interface LlmError {
  success: false
  error: {
    code: string  // 'API_KEY_MISSING', 'NETWORK_ERROR', 'TIMEOUT', etc.
    message: string
    retryable: boolean
    retryAfterMs?: number  // For rate limits
    details?: Record<string, unknown>
    stack?: string  // Only in development
  }
}
```

#### Error Handling Implementation

```typescript
// In LlmIpc
ipcMain.handle(
  'llm:inference',
  wrapIpcHandler(async (event, options: LlmInferenceRequest) => {
    try {
      const llmService = getWindowService<LlmInferenceService>(event, container, 'llmInference')
      const window = BrowserWindow.fromWebContents(event.sender)

      if (!window) {
        throw new LlmError('WINDOW_NOT_FOUND', 'Window not available', false)
      }

      const inferenceId = await llmService.runInference(options, window)
      return inferenceId
    } catch (error) {
      // wrapIpcHandler automatically converts to IpcError format
      throw error
    }
  }, 'llm:inference')
)
```

### Timeout Management

#### Multi-Level Timeout Strategy

1. **Request-Level Timeout**
   - Specified in `LlmInferenceRequest.timeoutMs`
   - Default: 120000ms (2 minutes)
   - Cancels entire inference if exceeded

2. **Stream Chunk Timeout**
   - Time between token chunks
   - Default: 30000ms (30 seconds)
   - Prevents hanging streams

3. **Session Idle Timeout**
   - Automatic cleanup of inactive sessions
   - Default: 1800000ms (30 minutes)
   - Configurable per session

#### Timeout Implementation

```typescript
class LlmInferenceService {
  private async runInference(options: LlmInferenceRequest, window: BrowserWindow): Promise<string> {
    const inferenceId = generateId()
    const abortController = new AbortController()
    const timeoutMs = options.timeoutMs || 120000

    // Overall timeout
    const timeoutHandle = setTimeout(() => {
      abortController.abort()
      window.webContents.send('llm:error', {
        inferenceId,
        error: 'Inference timeout exceeded',
        code: 'TIMEOUT',
        retryable: true
      })
    }, timeoutMs)

    // Stream chunk timeout
    let lastChunkTime = Date.now()
    const chunkTimeoutMs = 30000
    const chunkTimeoutHandle = setInterval(() => {
      if (Date.now() - lastChunkTime > chunkTimeoutMs) {
        abortController.abort()
        clearInterval(chunkTimeoutHandle)
        window.webContents.send('llm:error', {
          inferenceId,
          error: 'Stream timeout - no data received',
          code: 'STREAM_TIMEOUT',
          retryable: true
        })
      }
    }, 5000)

    try {
      this.activeInferences.set(inferenceId, abortController)

      // ... LLM streaming logic ...

      for await (const chunk of stream) {
        lastChunkTime = Date.now()
        window.webContents.send('llm:token', { inferenceId, token: chunk })
      }

      window.webContents.send('llm:done', { inferenceId })

    } finally {
      clearTimeout(timeoutHandle)
      clearInterval(chunkTimeoutHandle)
      this.activeInferences.delete(inferenceId)
    }

    return inferenceId
  }
}
```

### Streaming Implementation

#### Token Streaming Pattern

```typescript
// Main Process - LlmInferenceService
async function* streamLlmTokens(
  messages: Message[],
  options: LlmOptions,
  signal: AbortSignal
): AsyncGenerator<string> {
  const provider = getProvider(options.providerId)
  const model = provider.createModel({
    model: options.modelId,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    streaming: true
  })

  const stream = await model.stream(messages, { signal })

  for await (const chunk of stream) {
    if (signal.aborted) break

    const token = extractToken(chunk)
    if (token) {
      yield token
    }
  }
}

// Usage in service
let tokenIndex = 0
for await (const token of streamLlmTokens(messages, options, abortController.signal)) {
  window.webContents.send('llm:token', {
    inferenceId,
    sessionId: options.sessionId,
    token,
    index: tokenIndex++
  })
}
```

#### Renderer Process - Token Accumulation

```typescript
// React hook example
function useLlmInference() {
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.onLlmToken((event) => {
      if (event.inferenceId === currentInferenceId) {
        setResponse(prev => prev + event.token)
      }
    })

    return unsubscribe
  }, [currentInferenceId])

  const runInference = async (messages: Message[]) => {
    setResponse('')
    setIsStreaming(true)

    try {
      const inferenceId = await window.api.llmInference({
        messages,
        providerId: 'openai',
        stream: true
      })
      setCurrentInferenceId(inferenceId)
    } catch (error) {
      setIsStreaming(false)
      throw error
    }
  }

  return { response, isStreaming, runInference }
}
```

### Security Considerations

#### 1. Context Isolation

All IPC communication uses context bridge with strict type checking:

```typescript
// Preload script
const llmApi = {
  llmInference: (options: LlmInferenceRequest): Promise<string> => {
    // Validate options before sending
    validateInferenceRequest(options)
    return unwrapIpcResult(ipcRenderer.invoke('llm:inference', options))
  }
}

contextBridge.exposeInMainWorld('llm', llmApi)
```

#### 2. Input Validation

All inputs validated at multiple layers:

```typescript
// Shared validators
export class LlmValidators {
  static validateProviderId(providerId: string): void {
    const allowed = ['openai', 'anthropic', 'google']
    if (!allowed.includes(providerId)) {
      throw new Error(`Invalid provider ID: ${providerId}`)
    }
  }

  static validateMessages(messages: Message[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array')
    }

    messages.forEach((msg, i) => {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error(`Invalid role in message ${i}`)
      }
      if (typeof msg.content !== 'string') {
        throw new Error(`Invalid content in message ${i}`)
      }
    })
  }

  static validateTemperature(temp?: number): void {
    if (temp !== undefined && (temp < 0 || temp > 2)) {
      throw new Error('Temperature must be between 0 and 2')
    }
  }
}
```

#### 3. API Key Protection

API keys never exposed to renderer process:

```typescript
// Main process only
class LlmInferenceService {
  private getApiKey(providerId: string): string {
    const settings = this.storeService.getModelSettings(providerId)
    const apiKey = settings?.apiToken || process.env[`${providerId.toUpperCase()}_API_KEY`]

    if (!apiKey) {
      throw new LlmError(
        'API_KEY_MISSING',
        `No API key configured for provider: ${providerId}`,
        false
      )
    }

    return apiKey
  }
}
```

#### 4. Resource Limits

Prevent resource exhaustion:

```typescript
class LlmInferenceService {
  private static readonly MAX_CONCURRENT_INFERENCES = 5
  private static readonly MAX_SESSIONS_PER_WINDOW = 10
  private static readonly MAX_MESSAGE_LENGTH = 100000
  private static readonly MAX_TOKENS = 4000

  private checkLimits(): void {
    if (this.activeInferences.size >= LlmInferenceService.MAX_CONCURRENT_INFERENCES) {
      throw new LlmError(
        'RATE_LIMIT',
        'Too many concurrent inferences',
        true
      )
    }
  }
}
```

### Performance Optimization

#### 1. Session Pooling

Reuse sessions to avoid initialization overhead:

```typescript
class SessionPool {
  private pool: Map<string, LlmSession[]> = new Map()

  acquire(providerId: string, modelId: string): LlmSession {
    const key = `${providerId}:${modelId}`
    const sessions = this.pool.get(key) || []

    return sessions.pop() || this.createSession(providerId, modelId)
  }

  release(session: LlmSession): void {
    const key = `${session.providerId}:${session.modelId}`
    const sessions = this.pool.get(key) || []

    if (sessions.length < 3) {
      sessions.push(session)
      this.pool.set(key, sessions)
    }
  }
}
```

#### 2. Response Caching

Cache recent responses for identical requests:

```typescript
interface CacheEntry {
  key: string
  response: string
  timestamp: number
  tokens: number
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map()
  private static readonly MAX_CACHE_SIZE = 100
  private static readonly CACHE_TTL_MS = 3600000 // 1 hour

  getCacheKey(messages: Message[], options: LlmOptions): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ messages, options }))
      .digest('hex')
  }

  get(key: string): string | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > ResponseCache.CACHE_TTL_MS) {
      this.cache.delete(key)
      return null
    }

    return entry.response
  }

  set(key: string, response: string, tokens: number): void {
    if (this.cache.size >= ResponseCache.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
      this.cache.delete(oldest[0])
    }

    this.cache.set(key, {
      key,
      response,
      timestamp: Date.now(),
      tokens
    })
  }
}
```

#### 3. Backpressure Handling

Prevent overwhelming the renderer with tokens:

```typescript
class StreamThrottle {
  private queue: string[] = []
  private sending = false
  private readonly BATCH_SIZE = 5
  private readonly BATCH_DELAY_MS = 16 // ~60fps

  async sendToken(token: string, window: BrowserWindow, inferenceId: string): Promise<void> {
    this.queue.push(token)

    if (!this.sending) {
      this.sending = true
      this.flush(window, inferenceId)
    }
  }

  private async flush(window: BrowserWindow, inferenceId: string): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.BATCH_SIZE)

      window.webContents.send('llm:token', {
        inferenceId,
        tokens: batch // Send multiple tokens at once
      })

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY_MS))
      }
    }

    this.sending = false
  }
}
```

## File Structure

```
src/
├── main/
│   ├── ipc/
│   │   └── LlmIpc.ts              # IPC module for LLM operations
│   ├── services/
│   │   ├── llm-inference.ts       # LLM inference service
│   │   ├── llm-session.ts         # Session management
│   │   └── llm-provider.ts        # Provider abstraction layer
│   └── shared/
│       └── llm-validators.ts      # Shared validation logic
├── preload/
│   ├── index.ts                   # Add LLM API to preload
│   └── index.d.ts                 # Add LLM type definitions
└── renderer/
    └── src/
        └── hooks/
            └── useLlmInference.ts # React hook for LLM usage
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `LlmIpc` module implementing `IpcModule` interface
- [ ] Create `LlmInferenceService` with basic inference support
- [ ] Add preload API methods for LLM operations
- [ ] Add TypeScript type definitions
- [ ] Implement basic error handling with `wrapIpcHandler`

### Phase 2: Streaming Support
- [ ] Implement token streaming in service
- [ ] Add streaming event channels to preload
- [ ] Create token accumulation in renderer
- [ ] Add stream timeout handling
- [ ] Implement backpressure controls

### Phase 3: Session Management
- [ ] Add session creation/destruction
- [ ] Implement session-based inference
- [ ] Add session state tracking
- [ ] Implement session cleanup on window close
- [ ] Add session idle timeout

### Phase 4: Error Handling & Timeouts
- [ ] Implement comprehensive error categories
- [ ] Add timeout management at all levels
- [ ] Add retry logic for retryable errors
- [ ] Implement graceful cancellation
- [ ] Add error recovery strategies

### Phase 5: Security & Validation
- [ ] Add input validation for all requests
- [ ] Implement resource limits
- [ ] Add API key protection
- [ ] Implement rate limiting
- [ ] Add security audit logging

### Phase 6: Performance Optimization
- [ ] Implement response caching
- [ ] Add session pooling
- [ ] Optimize token batching
- [ ] Add performance metrics
- [ ] Implement memory management

### Phase 7: Testing & Documentation
- [ ] Unit tests for service layer
- [ ] Integration tests for IPC handlers
- [ ] E2E tests for streaming
- [ ] Performance benchmarks
- [ ] API documentation

## Usage Examples

### Simple Inference

```typescript
// Renderer process
import { useState } from 'react'

function ChatComponent() {
  const [response, setResponse] = useState('')

  const handleSubmit = async (message: string) => {
    // Start inference
    const inferenceId = await window.api.llmInference({
      messages: [{ role: 'user', content: message }],
      providerId: 'openai',
      stream: true
    })

    // Listen for tokens
    const unsubscribe = window.api.onLlmToken((event) => {
      if (event.inferenceId === inferenceId) {
        setResponse(prev => prev + event.token)
      }
    })

    // Listen for completion
    window.api.onLlmDone((event) => {
      if (event.inferenceId === inferenceId) {
        unsubscribe()
        console.log('Inference complete')
      }
    })
  }

  return (
    <div>
      <textarea value={response} readOnly />
      <button onClick={() => handleSubmit('Hello!')}>Send</button>
    </div>
  )
}
```

### Session-Based Inference

```typescript
// Renderer process
function ConversationComponent() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Create session on mount
    const initSession = async () => {
      const session = await window.api.llmCreateSession({
        sessionId: `conv-${Date.now()}`,
        providerId: 'openai',
        systemPrompt: 'You are a helpful assistant'
      })
      setSessionId(session.sessionId)
    }

    initSession()

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        window.api.llmDestroySession(sessionId)
      }
    }
  }, [])

  const sendMessage = async (content: string) => {
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)

    const inferenceId = await window.api.llmRunSession({
      sessionId: sessionId!,
      messages: newMessages,
      stream: true
    })

    // Handle streaming...
  }

  return <div>...</div>
}
```

### Error Handling

```typescript
function useLlmWithRetry() {
  const [error, setError] = useState<LlmErrorEvent | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.onLlmError((event) => {
      setError(event)

      // Auto-retry for retryable errors
      if (event.retryable) {
        const retryDelay = event.retryAfterMs || 1000
        setTimeout(() => {
          // Retry logic
        }, retryDelay)
      }
    })

    return unsubscribe
  }, [])

  return { error }
}
```

## Migration Path

For projects currently using the `AgentService`:

1. **Keep existing `AgentService`** for backward compatibility
2. **Add new `LlmInferenceService`** alongside it
3. **Migrate incrementally** by feature
4. **Eventually deprecate** `AgentService` in favor of `LlmInferenceService`

```typescript
// Migration example
// Old code:
await window.api.agentRun(messages, runId, providerId)

// New code:
const inferenceId = await window.api.llmInference({
  messages,
  providerId,
  stream: true
})
```

## Conclusion

This architecture provides a robust, secure, and performant foundation for LLM inference in OpenWriter. It follows established patterns while introducing specialized features for streaming, session management, and comprehensive error handling. The design is extensible, allowing for future enhancements such as multi-modal support, custom providers, and advanced caching strategies.
