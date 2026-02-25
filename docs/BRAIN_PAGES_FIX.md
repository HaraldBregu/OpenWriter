# Brain Pages AI Generation Fix

## Problem Summary

The brain pages (Principles, Consciousness, Memory, Reasoning, Perception) were not working properly with AI generation. The issue was in the `useLlmChat` hook which was mixing two different API approaches:

1. Calling `window.api.pipelineRun()` for inference
2. Listening to `window.ai.onPipelineEvent()` for streaming tokens
3. Using `window.ai.cancel()` for cancellation

Additionally, the `LlmIpc` module was emitting events that no service was actually processing, creating a dead code path.

## Root Cause

The application has two API namespaces exposed to the renderer:
- `window.api.*` - The main API for all IPC operations including pipeline
- `window.ai.*` - A separate namespace intended for LLM-specific operations

The `useLlmChat` hook was calling the pipeline through `window.api.pipelineRun()` which correctly invokes the `ChatAgent`, but then listening for events on `window.ai.onPipelineEvent()` which, while listening to the same IPC channel, created confusion and mixing of concerns.

## Solution

Updated the `useLlmChat` hook to use **only** `window.api` for all operations:

### Changes Made

1. **Event Listening** (Line 45)
   - Changed from: `window.ai.onPipelineEvent()`
   - Changed to: `window.api.onPipelineEvent()`

2. **Error Event Data** (Line 88)
   - Changed from: `{ runId: string; error: string }`
   - Changed to: `{ runId: string; message: string }`
   - This matches the actual event data structure from the pipeline

3. **Cancellation** (Line 162)
   - Changed from: `window.ai.cancel(runId)`
   - Changed to: `window.api.pipelineCancel(runId)`

4. **Code Cleanup** (Line 125-129)
   - Simplified message preparation
   - Removed redundant system message inclusion (handled by ChatAgent)
   - Improved variable naming for clarity

## How It Works Now

### Architecture Flow

```
Brain Page (e.g., PrinciplesPage)
    ↓
BrainChatContainer (passes sectionId, systemPrompt)
    ↓
useLlmChat hook
    ↓ (window.api.pipelineRun)
PipelineIpc
    ↓
PipelineService
    ↓
ChatAgent (LangChain + OpenAI)
    ↓ (yields tokens via generator)
PipelineService (driveRun)
    ↓ (emits pipeline:event via EventBus)
EventBus → window.api.onPipelineEvent()
    ↓
useLlmChat hook (receives streaming tokens)
    ↓
BrainChatMessages (displays streaming response)
```

### Key Components

1. **useLlmChat Hook** (`/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/hooks/useLlmChat.ts`)
   - Manages chat state and streaming
   - Calls pipeline with ChatAgent
   - Listens for streaming events
   - Handles message accumulation

2. **ChatAgent** (`/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/pipeline/agents/ChatAgent.ts`)
   - Uses LangChain with OpenAI
   - Yields streaming tokens via async generator
   - Handles conversation history
   - Applies system prompts
   - Supports multiple OpenAI providers via StoreService

3. **PipelineService** (`/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/pipeline/PipelineService.ts`)
   - Orchestrates agent execution
   - Manages AbortControllers for cancellation
   - Forwards events to EventBus
   - Tracks active runs

4. **PipelineIpc** (`/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/ipc/PipelineIpc.ts`)
   - Exposes IPC handlers for pipeline operations
   - Returns runId for tracking
   - Supports cancellation via fire-and-forget channel

## Brain Pages Configuration

All five brain pages are configured with specialized system prompts:

### Principles Page
- **Section ID**: `principles`
- **System Prompt**: Ethical reasoning and core principles
- **Focus**: Moral frameworks, decision-making guidelines, ethical dilemmas

### Consciousness Page
- **Section ID**: `consciousness`
- **System Prompt**: Consciousness, metacognition, and self-awareness
- **Focus**: Awareness, introspection, mental states, reflective thinking

### Memory Page
- **Section ID**: `memory`
- **System Prompt**: Memory systems, learning, and information retention
- **Focus**: Memory processes, mnemonic techniques, learning strategies

### Reasoning Page
- **Section ID**: `reasoning`
- **System Prompt**: Logical reasoning, problem-solving, critical thinking
- **Focus**: Deductive/inductive reasoning, argument analysis, cognitive biases

### Perception Page
- **Section ID**: `perception`
- **System Prompt**: Sensory processing, pattern recognition, perception
- **Focus**: Visual processing, attention, perceptual illusions, pattern recognition

## API Reference

### window.api.pipelineRun()

```typescript
window.api.pipelineRun(
  agentName: string,
  input: {
    prompt: string
    context?: {
      sectionId?: string
      providerId?: string
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>
      systemPrompt?: string
    }
  }
): Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }>
```

### window.api.onPipelineEvent()

```typescript
window.api.onPipelineEvent(
  callback: (event: {
    type: 'token' | 'thinking' | 'done' | 'error'
    data: unknown
  }) => void
): () => void  // Returns unsubscribe function
```

### window.api.pipelineCancel()

```typescript
window.api.pipelineCancel(runId: string): void
```

## Event Types

### Token Event
```typescript
{
  type: 'token',
  data: {
    runId: string
    token: string
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
    runId: string
    message: string
  }
}
```

### Thinking Event
```typescript
{
  type: 'thinking',
  data: {
    runId: string
    text: string
  }
}
```

## Testing Checklist

To verify the fix works correctly:

1. **Start the application**: `npm run dev`

2. **Configure OpenAI API Key**:
   - Go to Settings
   - Add your OpenAI API key for the OpenAI provider
   - Select a model (e.g., gpt-4o-mini)

3. **Test each brain page**:
   - [ ] Principles Page - Ask about ethical dilemmas
   - [ ] Consciousness Page - Ask about self-awareness
   - [ ] Memory Page - Ask about learning techniques
   - [ ] Reasoning Page - Ask about logical fallacies
   - [ ] Perception Page - Ask about visual illusions

4. **Verify streaming**:
   - [ ] Tokens should appear in real-time
   - [ ] "Thinking..." indicator shows before streaming
   - [ ] Messages update smoothly without flickering

5. **Test cancellation**:
   - [ ] Click stop button during generation
   - [ ] Streaming should stop immediately
   - [ ] No error messages should appear

6. **Test conversation history**:
   - [ ] Send multiple messages in sequence
   - [ ] AI should remember previous context
   - [ ] Responses should be coherent across messages

7. **Test error handling**:
   - [ ] Remove API key and try to chat
   - [ ] Should show clear error message
   - [ ] Invalid model should show error

## Notes

### LlmIpc Module Status

The `LlmIpc` module (`/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/ipc/LlmIpc.ts`) is currently registered but not actively used. It emits events (`llm:chat:request`, `llm:session:create`) to the EventBus, but there's no service listening to these events.

**Options for LlmIpc:**
1. **Keep as-is**: Leave it for potential future use
2. **Remove**: Clean up unused code
3. **Implement**: Create an LlmService that processes these events

**Recommendation**: Keep it for now as it provides a clean separation of concerns and could be useful for future features like session management, conversation persistence, or multi-provider support.

### Future Enhancements

1. **Session Persistence**: Store conversation history in the workspace
2. **Export Conversations**: Export brain page chats to files
3. **Multi-Provider Support**: Switch between OpenAI, Anthropic, etc. per section
4. **Custom System Prompts**: Allow users to customize system prompts
5. **Conversation Search**: Search across all brain conversations
6. **Conversation Templates**: Pre-configured conversation starters
7. **Token Usage Tracking**: Monitor API usage per section

## Files Modified

1. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/hooks/useLlmChat.ts`
   - Changed event listener from `window.ai` to `window.api`
   - Changed cancel method from `window.ai` to `window.api`
   - Fixed error event data structure
   - Improved code clarity

## Files Reviewed (No Changes Needed)

1. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/components/brain/BrainChatContainer.tsx`
2. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/components/brain/BrainChatInput.tsx`
3. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/components/brain/BrainChatMessages.tsx`
4. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/PrinciplesPage.tsx`
5. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/ConsciousnessPage.tsx`
6. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/MemoryPage.tsx`
7. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/ReasoningPage.tsx`
8. `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/PerceptionPage.tsx`

## Conclusion

The fix ensures that all API calls use `window.api` consistently, removing the confusion between `window.api` and `window.ai` namespaces. The brain pages now properly integrate with the pipeline system and ChatAgent for LLM inference with streaming support.
