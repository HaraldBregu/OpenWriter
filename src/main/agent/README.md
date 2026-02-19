# Multi-Agent API Documentation

## Overview

The multi-agent API provides comprehensive support for managing multiple concurrent AI agent sessions with full lifecycle control.

## Architecture

```
Renderer Process          Preload (IPC Bridge)        Main Process
─────────────────        ──────────────────────      ─────────────────
   React App       <-->   window.api.agent*    <-->   AgentService
                                                            |
                                                      ┌─────┴──────┐
                                                      │            │
                                               AgentController AgentController
                                                (Session 1)    (Session 2)
```

## Key Features

- **Session Management**: Create, list, destroy agent sessions
- **Multi-Agent Support**: Run multiple agents concurrently
- **Session Isolation**: Each session has its own controller and state
- **Cancellation**: Cancel individual runs or entire sessions
- **Status Tracking**: Monitor active sessions and message counts
- **Event Streaming**: Real-time token, thinking, and error events

## API Reference

### Session Management

#### Create Session
```typescript
const session = await window.api.agentCreateSession({
  sessionId: 'chat-123',
  providerId: 'openai',
  modelId: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  maxTokens: 2000,
  metadata: { userId: '123', context: 'support' }
})
```

#### List Sessions
```typescript
const sessions = await window.api.agentListSessions()
// Returns array of AgentSessionInfo
```

#### Get Session
```typescript
const session = await window.api.agentGetSession('chat-123')
```

#### Destroy Session
```typescript
const destroyed = await window.api.agentDestroySession('chat-123')
```

#### Clear All Sessions
```typescript
const count = await window.api.agentClearSessions()
console.log(`Cleared ${count} sessions`)
```

### Agent Execution

#### Run Agent (Legacy - uses default session)
```typescript
await window.api.agentRun(
  [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' }
  ],
  'run-456',
  'openai'
)
```

#### Run Agent with Session
```typescript
await window.api.agentRunSession({
  sessionId: 'chat-123',
  runId: 'run-456',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  providerId: 'openai',
  temperature: 0.8,
  maxTokens: 1000,
  stream: true
})
```

#### Cancel Run
```typescript
window.api.agentCancel('run-456')
```

#### Cancel Session
```typescript
await window.api.agentCancelSession('chat-123')
```

### Status & Monitoring

#### Get Overall Status
```typescript
const status = await window.api.agentGetStatus()
console.log(status)
// {
//   totalSessions: 3,
//   activeSessions: 1,
//   totalMessages: 45
// }
```

#### Check if Run is Active
```typescript
const isRunning = await window.api.agentIsRunning('run-456')
```

### Event Listening

```typescript
// Subscribe to all agent events
const unsubscribe = window.api.onAgentEvent((eventType, data) => {
  switch (eventType) {
    case 'agent:token':
      console.log('Token:', data.token)
      break
    case 'agent:thinking':
      console.log('Thinking:', data.thinking)
      break
    case 'agent:tool_start':
      console.log('Tool started:', data.tool)
      break
    case 'agent:tool_end':
      console.log('Tool ended:', data.output)
      break
    case 'agent:done':
      console.log('Run completed:', data.runId)
      break
    case 'agent:error':
      console.error('Error:', data.error)
      break
  }
})

// Cleanup
unsubscribe()
```

## Usage Examples

### Example 1: Single Chat Session

```typescript
import { useEffect, useState } from 'react'

function ChatComponent() {
  const [sessionId] = useState('chat-' + Date.now())
  const [messages, setMessages] = useState([])
  const [response, setResponse] = useState('')

  useEffect(() => {
    // Create session on mount
    window.api.agentCreateSession({
      sessionId,
      providerId: 'openai',
      modelId: 'gpt-4o-mini'
    })

    // Cleanup on unmount
    return () => {
      window.api.agentDestroySession(sessionId)
    }
  }, [sessionId])

  useEffect(() => {
    // Listen for events
    return window.api.onAgentEvent((eventType, data) => {
      if (data.runId !== sessionId) return

      if (eventType === 'agent:token') {
        setResponse(prev => prev + data.token)
      } else if (eventType === 'agent:done') {
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
        setResponse('')
      }
    })
  }, [sessionId, response])

  const sendMessage = async (content: string) => {
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)

    await window.api.agentRunSession({
      sessionId,
      runId: 'run-' + Date.now(),
      messages: newMessages,
      providerId: 'openai'
    })
  }

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}
      {response && <div>AI: {response}</div>}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  )
}
```

### Example 2: Multiple Concurrent Agents

```typescript
async function runMultipleAgents() {
  // Create multiple sessions
  const sessions = ['agent-1', 'agent-2', 'agent-3']

  for (const sessionId of sessions) {
    await window.api.agentCreateSession({
      sessionId,
      providerId: 'openai',
      metadata: { agentType: 'worker' }
    })
  }

  // Run agents concurrently
  const promises = sessions.map((sessionId, index) =>
    window.api.agentRunSession({
      sessionId,
      runId: `run-${sessionId}-${Date.now()}`,
      messages: [{ role: 'user', content: `Task ${index + 1}` }],
      providerId: 'openai'
    })
  )

  await Promise.all(promises)

  // Check status
  const status = await window.api.agentGetStatus()
  console.log('All agents completed:', status)

  // Cleanup
  await window.api.agentClearSessions()
}
```

### Example 3: Session Management Dashboard

```typescript
function AgentDashboard() {
  const [sessions, setSessions] = useState([])

  const loadSessions = async () => {
    const list = await window.api.agentListSessions()
    setSessions(list)
  }

  const destroySession = async (sessionId: string) => {
    await window.api.agentDestroySession(sessionId)
    loadSessions()
  }

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <h2>Active Sessions: {sessions.length}</h2>
      {sessions.map(session => (
        <div key={session.sessionId}>
          <h3>{session.sessionId}</h3>
          <p>Provider: {session.providerId}</p>
          <p>Model: {session.modelId}</p>
          <p>Messages: {session.messageCount}</p>
          <p>Status: {session.isActive ? 'Active' : 'Idle'}</p>
          <button onClick={() => destroySession(session.sessionId)}>
            Destroy
          </button>
        </div>
      ))}
    </div>
  )
}
```

## TypeScript Types

```typescript
interface AgentSessionConfig {
  sessionId: string
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

interface AgentSessionInfo {
  sessionId: string
  providerId: string
  modelId: string
  createdAt: number
  lastActivity: number
  isActive: boolean
  messageCount: number
  metadata?: Record<string, unknown>
}

interface AgentRunOptions {
  sessionId: string
  runId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  providerId: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}
```

## Best Practices

1. **Session Lifecycle**: Always destroy sessions when done to free resources
2. **Unique IDs**: Use unique runId for each request to track responses
3. **Error Handling**: Always listen to 'agent:error' events
4. **Cancellation**: Cancel runs when user navigates away or changes context
5. **Session Naming**: Use descriptive session IDs (e.g., `chat-user-123`, `analysis-doc-456`)
6. **Metadata**: Store relevant context in session metadata for debugging

## Migration Guide

### From Old API

```typescript
// Old way
await window.api.agentRun(messages, runId, providerId)

// New way (automatic session)
await window.api.agentRunSession({
  sessionId: 'default',
  runId,
  messages,
  providerId
})
```

The old `agentRun` method still works and uses a default session internally for backward compatibility.
