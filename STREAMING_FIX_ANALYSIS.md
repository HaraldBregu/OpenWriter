# AI Streaming Fix Analysis

## Problem
AI tokens are being generated in the main process (ChatAgent) but the renderer is not displaying them in real-time.

## Event Flow Architecture

```
ChatAgent (main)
  → yield { type: 'token', data: { runId, token } }
  ↓
PipelineService.driveRun() (main)
  → eventBus.broadcast('pipeline:event', event) or eventBus.sendTo(windowId, 'pipeline:event', event)
  ↓
EventBus.broadcast/sendTo() (main)
  → win.webContents.send('pipeline:event', event)
  ↓
Preload window.ai.onEvent() (preload)
  → ipcRenderer.on('pipeline:event', handler)
  ↓
useAI hook (renderer)
  → window.ai.onEvent((event) => { ... })
  ↓
BrainSimpleLayout component (renderer)
  → displays latestAssistantMessage.content
```

## Root Cause Identified

The issue is in the event listener callback check at `/Users/haraldbregu/Documents/9Spartans/apps/tesseract-ai/src/renderer/src/hooks/useAI.ts` **line 86-89**:

```typescript
if (event.type === 'token' && currentRunIdRef.current) {
  const data = event.data as { runId: string; token: string }

  if (data.runId === currentRunIdRef.current) {
```

**Problem**: The event listener is checking if `data.runId === currentRunIdRef.current`, but there might be a **race condition** where:
1. The `submit()` function calls `window.ai.inference()`
2. The promise resolves and sets `currentRunIdRef.current = result.data.runId` (line 222)
3. But tokens start arriving BEFORE the promise resolves, so `currentRunIdRef.current` is still `null`
4. Events are ignored because the runId doesn't match

## Additional Issues Found

1. **Missing console log before runId check**: We need to log ALL events received, not just matching ones
2. **No error logging for mismatched runIds**: If events arrive with wrong runIds, we should know about it
3. **Potential timing issue**: The event listener setup happens in useEffect, but tokens might arrive before the listener is fully ready

## Fix Strategy

1. Add comprehensive logging to trace event flow
2. Set `currentRunIdRef` IMMEDIATELY after getting runId, not in async then
3. Add defensive checks and warnings for debugging
4. Ensure React re-renders are triggered properly

## Files to Fix

1. `/Users/haraldbregu/Documents/9Spartans/apps/tesseract-ai/src/renderer/src/hooks/useAI.ts` - Event handling and state updates
2. Optionally add logging to PipelineService and EventBus if renderer-side fixes don't work
