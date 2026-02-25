# LLM Inference IPC Architecture - Executive Summary

## Overview

This document provides a high-level summary of the LLM inference IPC architecture designed for OpenWriter's Electron application. The architecture follows existing patterns while introducing specialized capabilities for streaming LLM responses, session management, and robust error handling.

## Key Documents

1. **LLM_INFERENCE_IPC_ARCHITECTURE.md** - Complete architectural design with patterns, types, and workflows
2. **LLM_IPC_IMPLEMENTATION_EXAMPLES.md** - Concrete implementation examples for all layers
3. This summary document

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Components & Hooks                             │  │
│  │  - useLlmInference()                                 │  │
│  │  - ChatComponent                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │ window.api.llm*()                │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Preload API (Context Bridge)                        │  │
│  │  - llmInference()                                     │  │
│  │  - llmCreateSession()                                 │  │
│  │  - onLlmToken()                                       │  │
│  │  - Type-safe wrappers with unwrapIpcResult()         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ IPC (invoke/send)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LlmIpc Module                                        │  │
│  │  - ipcMain.handle('llm:inference')                    │  │
│  │  - ipcMain.handle('llm:session:create')               │  │
│  │  - wrapIpcHandler for standardized errors            │  │
│  │  - getWindowService for window-scoped access         │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LlmInferenceService                                  │  │
│  │  - Session management (Map<sessionId, LlmSession>)   │  │
│  │  - Active inference tracking                          │  │
│  │  - Streaming with AbortController                    │  │
│  │  - Timeout management (overall + chunk)              │  │
│  │  - Token counting & limits                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LLM Providers (via LangChain)                       │  │
│  │  - ChatOpenAI                                         │  │
│  │  - ChatAnthropic                                      │  │
│  │  - Token streaming                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Streaming Architecture

**Token Streaming Flow:**
```
LLM Provider → LlmInferenceService → window.send('llm:token') → onLlmToken() → React State
```

**Benefits:**
- Real-time response display (like ChatGPT)
- Improved user experience
- Efficient memory usage
- Cancellable mid-stream

### 2. Session Management

**Two Modes:**

**Single-Shot Inference:**
```typescript
const inferenceId = await window.api.llmInference({
  messages: [{ role: 'user', content: 'Hello' }],
  providerId: 'openai'
})
```

**Session-Based (for conversations):**
```typescript
// Create session once
const session = await window.api.llmCreateSession({
  sessionId: 'chat-1',
  providerId: 'openai',
  systemPrompt: 'You are helpful'
})

// Run multiple inferences
await window.api.llmRunSession({
  sessionId: 'chat-1',
  messages: conversationHistory
})

// Cleanup
await window.api.llmDestroySession('chat-1')
```

### 3. Error Handling

**Error Categories:**
- **Configuration Errors** (non-retryable): Missing API keys, invalid parameters
- **Network Errors** (retryable): Connection timeouts, DNS failures
- **API Errors** (contextual): Rate limits (retryable), invalid requests (non-retryable)
- **Timeout Errors** (retryable): Inference timeout, stream timeout
- **Cancellation** (expected): User-initiated, window closure

**Error Response Format:**
```typescript
{
  inferenceId: string
  error: string
  code: 'TIMEOUT' | 'API_KEY_ERROR' | 'RATE_LIMIT' | ...
  retryable: boolean
}
```

### 4. Timeout Management

**Multi-Level Strategy:**
1. **Request Timeout** - Overall inference timeout (default: 2 minutes)
2. **Stream Chunk Timeout** - Time between tokens (default: 30 seconds)
3. **Session Idle Timeout** - Auto-cleanup inactive sessions (default: 30 minutes)

### 5. Security

**Key Security Measures:**
- Context isolation via preload scripts
- API keys never exposed to renderer
- Input validation at all layers (shared validators)
- Resource limits (max concurrent inferences, max sessions)
- Proper cleanup on window close

## IPC Channels

### Invoke Channels (Request/Response)

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `llm:inference` | `LlmInferenceRequest` | `inferenceId` | Start inference |
| `llm:cancel` | `inferenceId` | `boolean` | Cancel inference |
| `llm:session:create` | `LlmSessionConfig` | `LlmSessionInfo` | Create session |
| `llm:session:destroy` | `sessionId` | `boolean` | Destroy session |
| `llm:session:run` | `LlmSessionRunOptions` | `inferenceId` | Session inference |
| `llm:get-status` | none | `LlmServiceStatus` | Get status |

### Send Channels (Events)

| Channel | Payload | When |
|---------|---------|------|
| `llm:token` | `{ inferenceId, token, index }` | Each token streamed |
| `llm:thinking` | `{ inferenceId, status }` | Processing status |
| `llm:done` | `{ inferenceId, totalTokens, finishReason }` | Inference complete |
| `llm:error` | `{ inferenceId, error, code, retryable }` | Error occurred |

## Type System

### Request Types
```typescript
interface LlmInferenceRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  providerId: string
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
```

### Response Types
```typescript
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
```

## Implementation Patterns

### Pattern 1: IPC Module Registration

```typescript
export class LlmIpc implements IpcModule {
  readonly name = 'llm'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    ipcMain.handle(
      'llm:inference',
      wrapIpcHandler(async (event, request: LlmInferenceRequest) => {
        const llmService = getWindowService<LlmInferenceService>(
          event,
          container,
          'llmInference'
        )
        // ... handler logic
      }, 'llm:inference')
    )
  }
}
```

**Key Points:**
- Implements `IpcModule` interface for consistency
- Uses `wrapIpcHandler` for standardized error handling
- Uses `getWindowService` for window-scoped service access
- All errors automatically converted to `IpcResult` format

### Pattern 2: Service Layer

```typescript
export class LlmInferenceService {
  private activeInferences = new Map<string, ActiveInference>()
  private sessions = new Map<string, LlmSession>()

  async runInference(
    request: LlmInferenceRequest,
    window: BrowserWindow
  ): Promise<string> {
    // 1. Validate
    LlmValidators.validateInferenceRequest(request)

    // 2. Check limits
    this.checkConcurrencyLimit()

    // 3. Setup abort controller & timeouts
    const abortController = new AbortController()
    const inferenceId = this.generateInferenceId()

    // 4. Execute async (non-blocking)
    this.executeInference(inferenceId, request, window, abortController)

    // 5. Return immediately
    return inferenceId
  }
}
```

**Key Points:**
- Non-blocking: Returns inferenceId immediately, executes async
- AbortController for cancellation
- Window reference for sending events
- Comprehensive timeout management

### Pattern 3: Preload API

```typescript
const llmApi = {
  llmInference: (options: LlmInferenceRequest): Promise<string> => {
    return unwrapIpcResult(ipcRenderer.invoke('llm:inference', options))
  },

  onLlmToken: (callback: (event: LlmTokenEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: LlmTokenEvent) => {
      callback(data)
    }
    ipcRenderer.on('llm:token', handler)
    return () => ipcRenderer.removeListener('llm:token', handler)
  }
}

contextBridge.exposeInMainWorld('llm', llmApi)
```

**Key Points:**
- `unwrapIpcResult` converts `IpcResult` to clean Promise (throws on error)
- Event listeners return cleanup functions
- Type-safe throughout
- Secure via context bridge

### Pattern 4: React Integration

```typescript
export function useLlmInference(options: UseLlmInferenceOptions) {
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.onLlmToken((event) => {
      if (event.inferenceId === currentInferenceId) {
        setResponse(prev => prev + event.token)
      }
    })
    return unsubscribe
  }, [])

  const runInference = useCallback(async (messages: Message[]) => {
    setResponse('')
    setIsLoading(true)
    const inferenceId = await window.api.llmInference({
      messages,
      ...options
    })
    setCurrentInferenceId(inferenceId)
  }, [options])

  return { response, isLoading, runInference }
}
```

**Key Points:**
- Custom hook for reusable logic
- Automatic cleanup of event listeners
- State management for streaming responses
- Cancellation support

## Resource Management

### Limits

```typescript
const MAX_CONCURRENT_INFERENCES = 5
const MAX_SESSIONS = 20
const MAX_MESSAGES = 100
const MAX_MESSAGE_LENGTH = 100000
const MAX_TOKENS = 100000
```

### Timeouts

```typescript
const DEFAULT_TIMEOUT_MS = 120000        // 2 minutes
const CHUNK_TIMEOUT_MS = 30000           // 30 seconds
const SESSION_IDLE_TIMEOUT_MS = 1800000  // 30 minutes
```

### Cleanup

**Automatic cleanup on:**
- Inference completion/error
- Session idle timeout (30 min)
- Window close (via window-scoped services)
- Cancellation

**Manual cleanup:**
```typescript
await window.api.llmDestroySession(sessionId)
await window.api.llmCancel(inferenceId)
```

## Performance Optimizations

### 1. Non-Blocking Execution
- Service returns inferenceId immediately
- Actual execution happens async
- Multiple inferences can queue

### 2. Stream Batching (Optional)
```typescript
// Send tokens in batches to reduce IPC overhead
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 16  // ~60fps
```

### 3. Response Caching (Future)
```typescript
// Cache identical requests
const cacheKey = hash({ messages, options })
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

### 4. Session Pooling (Future)
```typescript
// Reuse initialized sessions
sessionPool.acquire(providerId, modelId)
```

## Migration from AgentService

**Current:**
```typescript
await window.api.agentRun(messages, runId, providerId)

window.api.onAgentEvent((eventType, data) => {
  if (eventType === 'agent:token') {
    // handle token
  }
})
```

**New:**
```typescript
const inferenceId = await window.api.llmInference({
  messages,
  providerId,
  stream: true
})

window.api.onLlmToken((event) => {
  // handle token
})
```

**Migration Strategy:**
1. Keep AgentService for backward compatibility
2. Add LlmInferenceService alongside
3. Gradually migrate features
4. Eventually deprecate AgentService

## Testing Strategy

### Unit Tests
- Service layer logic
- Validation functions
- Error handling
- Session management
- Timeout behavior

### Integration Tests
- IPC handler responses
- Event emission
- Window-scoped service access
- Error propagation

### E2E Tests
- Full inference flow
- Streaming behavior
- Cancellation
- Session lifecycle
- Multi-window scenarios

## File Structure

```
src/
├── main/
│   ├── ipc/
│   │   └── LlmIpc.ts                    # IPC module
│   ├── services/
│   │   ├── llm-inference.ts             # Core service
│   │   ├── llm-session.ts               # Session management (optional)
│   │   └── llm-provider.ts              # Provider abstraction (optional)
│   ├── shared/
│   │   └── llm-validators.ts            # Validation
│   └── types/
│       └── llm.ts                        # Type definitions
├── preload/
│   ├── index.ts                          # Add LLM API
│   └── index.d.ts                        # Type definitions
└── renderer/
    └── src/
        └── hooks/
            └── useLlmInference.ts        # React hook
```

## Quick Start

### 1. Create Session
```typescript
const session = await window.api.llmCreateSession({
  sessionId: 'my-chat',
  providerId: 'openai',
  systemPrompt: 'You are helpful'
})
```

### 2. Run Inference
```typescript
const inferenceId = await window.api.llmRunSession({
  sessionId: 'my-chat',
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

### 3. Listen for Tokens
```typescript
window.api.onLlmToken((event) => {
  console.log(event.token)
})
```

### 4. Handle Completion
```typescript
window.api.onLlmDone((event) => {
  console.log(`Done! ${event.totalTokens} tokens`)
})
```

### 5. Cleanup
```typescript
await window.api.llmDestroySession('my-chat')
```

## Advantages Over Current AgentService

1. **Better Separation of Concerns** - IPC, Service, Provider layers
2. **Session Management** - Explicit session lifecycle
3. **Improved Error Handling** - Standardized, retryable errors
4. **Better Timeouts** - Multi-level timeout strategy
5. **Resource Management** - Limits, cleanup, idle timeouts
6. **Type Safety** - Full TypeScript support
7. **Consistent Patterns** - Follows existing IpcModule pattern
8. **Better Testing** - Cleaner separation enables better tests
9. **Extensibility** - Easy to add new providers, features

## Next Steps

1. Review architecture documents
2. Implement Phase 1: Core infrastructure
3. Add streaming support (Phase 2)
4. Implement session management (Phase 3)
5. Add comprehensive error handling (Phase 4)
6. Security & validation (Phase 5)
7. Performance optimizations (Phase 6)
8. Testing & documentation (Phase 7)

## References

- **LLM_INFERENCE_IPC_ARCHITECTURE.md** - Complete architecture
- **LLM_IPC_IMPLEMENTATION_EXAMPLES.md** - Implementation code
- Existing IPC patterns: `src/main/ipc/DocumentsIpc.ts`
- Existing service patterns: `src/main/services/agent.ts`
- Error handling: `src/main/ipc/IpcErrorHandler.ts`
