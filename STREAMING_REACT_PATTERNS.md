# React Streaming Patterns - Best Practices

## Overview

This document outlines React patterns for implementing real-time streaming updates efficiently, based on lessons learned from fixing the AI streaming implementation.

## Pattern 1: Separate Streaming State from History State

### Problem
Updating an array on every token creates unnecessary re-renders and memory allocations.

### Solution
Use two separate state values:

```tsx
const [messages, setMessages] = useState<Message[]>([])        // History
const [latestResponse, setLatestResponse] = useState<string>('') // Streaming
```

**During streaming:** Update only `latestResponse`
**After streaming:** Update `messages` array once with final content

### Benefits
- Reduced state updates: O(1) vs O(n) per token
- Better performance
- Cleaner separation of concerns

---

## Pattern 2: Use Refs for Accumulation

### Problem
State updates are asynchronous and may not reflect the latest value in event handlers.

### Solution
Use refs to accumulate streaming data:

```tsx
const accumulatedContentRef = useRef<string>('')

// In event handler
accumulatedContentRef.current += token
setLatestResponse(accumulatedContentRef.current)
```

### Benefits
- Synchronous access to latest value
- Prevents race conditions
- No stale closures

---

## Pattern 3: Conditional Display Based on Streaming State

### Problem
Displaying stale message content from the messages array during streaming.

### Solution
Determine display content based on streaming state:

```tsx
const displayContent = isStreaming
  ? latestResponse           // Real-time streaming content
  : completedMessage?.content // Historical content
```

### Benefits
- Single source of truth for displayed content
- Seamless transition from streaming to completed
- Clear logic flow

---

## Pattern 4: Correct useEffect Dependencies

### Problem
Effect doesn't fire when streaming content updates.

### Solution
Include ALL values used in the effect:

```tsx
// ❌ WRONG
useEffect(() => {
  scroll()
}, [messages, isStreaming])

// ✅ CORRECT
useEffect(() => {
  scroll()
}, [latestResponse, isStreaming])
```

### Benefits
- Effect fires at the right time
- No stale closures
- Predictable behavior

---

## Pattern 5: Initialize Placeholder Early

### Problem
Creating and updating messages on every token.

### Solution
Create placeholder on first token, update once at the end:

```tsx
if (isFirstToken) {
  // Create placeholder
  setMessages(prev => [...prev, { id, content: '', role: 'assistant' }])
}

// During streaming: only update latestResponse
setLatestResponse(accumulated)

// On completion: update placeholder once
if (isDone) {
  setMessages(prev =>
    prev.map(msg => msg.id === id ? { ...msg, content: finalContent } : msg)
  )
}
```

### Benefits
- Array updated only twice (create + final update)
- Minimal re-renders
- Better performance

---

## Complete Example

```tsx
export function useStreaming(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [latestResponse, setLatestResponse] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)

  const accumulatedRef = useRef<string>('')
  const currentMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.onStreamEvent((event) => {
      if (event.type === 'token') {
        const isFirst = accumulatedRef.current.length === 0

        if (isFirst) {
          // Create placeholder once
          setIsStreaming(true)
          const id = generateId()
          currentMessageIdRef.current = id

          setMessages(prev => [...prev, {
            id,
            role: 'assistant',
            content: '',
            timestamp: Date.now()
          }])
        }

        // Accumulate and update streaming state
        accumulatedRef.current += event.token
        setLatestResponse(accumulatedRef.current)
      }

      if (event.type === 'done') {
        // Update message with final content
        const id = currentMessageIdRef.current
        const finalContent = accumulatedRef.current

        if (id) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === id ? { ...msg, content: finalContent } : msg
            )
          )
        }

        // Reset
        setIsStreaming(false)
        accumulatedRef.current = ''
        currentMessageIdRef.current = null
      }
    })

    return unsubscribe
  }, [])

  return { messages, latestResponse, isStreaming }
}

// Component usage
function StreamingComponent() {
  const { messages, latestResponse, isStreaming } = useStreaming('session-1')
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll with correct dependencies
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [latestResponse, isStreaming])

  const latestMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0]

  // Conditional display
  const displayContent = isStreaming
    ? latestResponse
    : (latestMessage?.content || '')

  return (
    <div ref={contentRef}>
      {displayContent}
    </div>
  )
}
```

---

## Performance Considerations

### Memory Leaks
- Always cleanup event listeners in useEffect return
- Clear refs when streaming completes
- Reset state properly

### Unnecessary Re-renders
- Use React.memo for expensive components
- Avoid updating arrays during high-frequency events
- Consider useTransition for smoother updates

### State Update Batching
- React automatically batches updates in event handlers
- Multiple setState calls = single re-render
- Still minimize state updates for best performance

---

## Common Pitfalls

### 1. Stale Closures
```tsx
// ❌ BAD: Closure captures old messages value
useEffect(() => {
  window.api.onEvent(() => {
    console.log(messages) // Stale!
  })
}, []) // Missing dependency

// ✅ GOOD: Use ref or include dependency
useEffect(() => {
  window.api.onEvent(() => {
    console.log(messagesRef.current) // Always current
  })
}, [])
```

### 2. Missing Cleanup
```tsx
// ❌ BAD: Memory leak
useEffect(() => {
  window.api.onEvent(handler)
}, [])

// ✅ GOOD: Proper cleanup
useEffect(() => {
  const unsubscribe = window.api.onEvent(handler)
  return () => unsubscribe()
}, [])
```

### 3. Wrong Dependencies
```tsx
// ❌ BAD: Effect uses latestResponse but depends on messages
useEffect(() => {
  display(latestResponse)
}, [messages])

// ✅ GOOD: Correct dependency
useEffect(() => {
  display(latestResponse)
}, [latestResponse])
```

---

## Testing Checklist

When implementing streaming:

- [ ] Tokens appear in real-time
- [ ] Auto-scroll works smoothly
- [ ] Completed messages persist correctly
- [ ] Multiple queries work in sequence
- [ ] Error handling during streaming
- [ ] Cancel functionality works
- [ ] No memory leaks (check DevTools)
- [ ] No console warnings about dependencies
- [ ] Performance is acceptable (use React DevTools Profiler)

---

## Related Resources

- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [React useRef Hook](https://react.dev/reference/react/useRef)
- [Optimizing Performance](https://react.dev/learn/render-and-commit)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
