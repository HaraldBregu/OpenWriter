# Chunk-Based Streaming Architecture

This document explains how the chunk-based streaming system works in Tesseract AI's pipeline architecture, following the same pattern as `AgentController.ts`.

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   LangChain     │
│   (OpenAI)      │
└────────┬────────┘
         │ Token chunks (streaming)
         ▼
┌─────────────────┐
│  Agent Layer    │  ← Forwards chunks as-is
│ (CounterAgent,  │    (No character splitting)
│  AlphabetAgent, │    (Like AgentController)
│  ChatAgent)     │
└────────┬────────┘
         │ Chunk events
         ▼
┌─────────────────┐
│ PipelineService │  ← Routes events to EventBus
└────────┬────────┘
         │ pipeline:event
         ▼
┌─────────────────┐
│   EventBus      │  ← IPC bridge to renderer
└────────┬────────┘
         │ IPC
         ▼
┌─────────────────┐
│   Renderer      │  ← Updates UI character by character
│ (PipelineTest)  │    + Visual indicators
└─────────────────┘
```

## 📡 Main Process (Agent Layer)

### Chunk Forwarding Logic

All AI agents forward LangChain chunks directly to the renderer (same as `AgentController.ts`):

```typescript
// CounterAgent.ts, AlphabetAgent.ts, ChatAgent.ts
for await (const chunk of stream) {
  const token =
    typeof chunk.content === 'string'
      ? chunk.content
      : Array.isArray(chunk.content)
        ? chunk.content
            .filter((c): c is { type: string; text: string } =>
              typeof c === 'object' && c !== null && 'text' in c
            )
            .map((c) => c.text)
            .join('')
        : ''

  // Send chunk directly to frontend (like AgentController)
  if (token) {
    yield { type: 'token', data: { runId, token } }
  }
}
```

### Why Direct Chunks?

- **Efficient**: No artificial delays or splitting overhead
- **Natural streaming**: LangChain already streams optimally
- **Consistent**: Matches AgentController pattern
- **Flexible**: Frontend can display chunks as-is or process further

## 🎨 Renderer Process (UI Layer)

### Event Listener

The renderer listens to `pipeline:event` on the EventBus:

```typescript
window.api.onPipelineEvent((event) => {
  if (event.type === 'token') {
    const { runId, token } = event.data
    // Append single character to output
    setRuns((prev) => {
      const run = prev.get(runId)
      if (run) {
        run.output += token      // Single character
        run.charCount += 1        // Increment counter
      }
      return new Map(prev)
    })
  }
})
```

### Visual Enhancements

1. **Streaming Indicator**
   - Blue pulsing dot shows active streaming
   - "Streaming..." label during character receipt

2. **Cursor Effect**
   - Animated cursor (`│`) appears after last character
   - Only visible during `running` status

3. **Character Counter**
   - Real-time character count display
   - Updates with each character received

4. **Timing Display**
   - Shows total duration when done
   - Helps measure streaming performance

## 🔄 Data Flow Example

Let's trace a single character through the system:

### 1. LangChain Response
```javascript
// OpenAI streams chunks as they arrive
chunk1.content = "Hello"
chunk2.content = " world"
chunk3.content = "!"
```

### 2. Agent Processing
```javascript
// Agent forwards chunks directly (like AgentController)
yield { type: 'token', data: { runId: '123', token: 'Hello' } }
yield { type: 'token', data: { runId: '123', token: ' world' } }
yield { type: 'token', data: { runId: '123', token: '!' } }
```

### 3. PipelineService Routing
```javascript
// Each character event sent to EventBus
this.eventBus.broadcast('pipeline:event', {
  type: 'token',
  data: { runId: '123', token: 'H' }
})
```

### 4. IPC Transport
```javascript
// EventBus sends via IPC
webContents.send('pipeline:event', {
  type: 'token',
  data: { runId: '123', token: 'H' }
})
```

### 5. Renderer Update
```javascript
// React state updates, triggers re-render
run.output += 'Hello'        // "Hello"
run.output += ' world'       // "Hello world"
run.output += '!'            // "Hello world!"
run.charCount += 5          // Total: 5
run.charCount += 6          // Total: 11
run.charCount += 1          // Total: 12
run.tokenCount++            // 3 chunks total
```

## 🎯 Event Types

### Token Event (Chunk)
```typescript
{
  type: 'token',
  data: {
    runId: string,
    token: string  // Chunk (can be 1+ characters)
  }
}
```

### Thinking Event
```typescript
{
  type: 'thinking',
  data: {
    runId: string,
    text: string  // Status message
  }
}
```

### Done Event
```typescript
{
  type: 'done',
  data: {
    runId: string
  }
}
```

### Error Event
```typescript
{
  type: 'error',
  data: {
    runId: string,
    message: string
  }
}
```

## 📊 Performance Metrics

### Streaming Speed
- **LangChain**: ~10-50 tokens/second (varies by model)
- **Agent Processing**: ~200 characters/second (5ms/char)
- **IPC Latency**: <1ms per event
- **React Rendering**: ~16ms per frame (60fps)

### Concurrent Execution
When running 2 agents simultaneously:
- Events are interleaved in EventBus
- React batches updates automatically
- Each agent maintains independent state
- No blocking between agents

## 🛠️ Customization

### Adjust Streaming Speed

Modify the delay in each agent:

```typescript
// Faster (2ms delay = ~500 chars/sec)
await delay(2, signal)

// Slower (10ms delay = ~100 chars/sec)
await delay(10, signal)

// Instant (no delay)
// await delay(0, signal)  // Skip delay
```

### Disable Character Splitting

To revert to token-based streaming:

```typescript
// Old behavior (token-based)
if (token) {
  yield { type: 'token', data: { runId, token } }
}

// New behavior (character-based)
if (token) {
  for (const char of token) {
    yield { type: 'token', data: { runId, token: char } }
    await delay(5, signal)
  }
}
```

## 🐛 Debugging

### Console Logging

Enable detailed logging in agents:

```typescript
// In agent's run method
console.log(`[${this.name}] Streaming character: "${char}"`)
```

### Monitor Event Flow

Watch events in browser console:

```javascript
window.api.onPipelineEvent((event) => {
  console.log('Pipeline event:', event.type, event.data)
})
```

### Check Active Runs

```javascript
window.api.pipelineListRuns().then(runs => {
  console.log('Active runs:', runs)
})
```

## 🚀 Best Practices

1. **Always use AbortSignal**
   - Check `signal.aborted` before each character
   - Prevents memory leaks on cancellation

2. **Handle Unicode Properly**
   - String iteration handles multi-byte characters correctly
   - Emojis and special chars work as expected

3. **Batch Updates in React**
   - React automatically batches state updates
   - No need for manual batching

4. **Monitor Memory Usage**
   - Long-running streams accumulate output
   - Consider truncating very long outputs

## 📝 Testing

Test character-by-character streaming:

```javascript
// Test single agent
window.api.pipelineRun('counter', { prompt: 'Count to 5' })

// Test concurrent agents
window.api.pipelineRun('counter', { prompt: 'Count to 10' })
window.api.pipelineRun('alphabet', { prompt: 'First 10 letters' })

// Monitor character count
window.api.onPipelineEvent((event) => {
  if (event.type === 'token') {
    console.log(`Received character: "${event.data.token}"`)
  }
})
```

## 🎓 Key Takeaways

- ✅ **Character-level granularity**: Each character is a separate event
- ✅ **Smooth visual feedback**: 5ms delay creates typewriter effect
- ✅ **Concurrent safe**: Multiple agents can stream simultaneously
- ✅ **Cancellation support**: AbortSignal stops streaming cleanly
- ✅ **Real-time metrics**: Character count and duration tracking
- ✅ **Low latency**: IPC adds <1ms overhead per character
