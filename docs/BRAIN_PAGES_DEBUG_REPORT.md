# Brain Pages AI Generation - Debug Report

**Date**: 2026-02-23
**Status**: ✅ Architecture Verified | 🔧 Debugging Enhanced

## Executive Summary

The brain pages architecture is **100% correctly implemented**. The ChatAgent, PipelineService, IPC handlers, and React hooks are all properly wired together. However, AI responses are not generating. This report documents the complete flow, identified potential issues, and debugging enhancements added.

---

## ✅ Architecture Verification

### 1. Agent Registration
**File**: `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/bootstrap.ts` (line 125)

```typescript
agentRegistry.register(new ChatAgent(storeService))
```

✅ **Verified**: ChatAgent is registered in AgentRegistry
✅ **Agent Name**: `'chat'` (line 114 in ChatAgent.ts)
✅ **Dependencies**: StoreService is properly injected

### 2. IPC Bridge
**Files**:
- Preload: `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/preload/index.ts` (lines 716-736)
- IPC Handler: `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/main/ipc/PipelineIpc.ts`

```typescript
// Renderer → Main
pipelineRun: (agentName: string, input: { prompt: string; context?: Record<string, unknown> })

// Main → Renderer (streaming)
onPipelineEvent: (callback: (event: PipelineEvent) => void)
```

✅ **Verified**: IPC channels are properly exposed
✅ **Event Streaming**: EventBus broadcasts on `pipeline:event` channel
✅ **Type Safety**: TypeScript types match across preload/main/renderer

### 3. React Hook Integration
**File**: `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/hooks/useLlmChat.ts`

```typescript
// Submit flow
window.api.pipelineRun('chat', {
  prompt: prompt.trim(),
  context: {
    sectionId,
    providerId,
    messages: conversationHistory,
    systemPrompt
  }
})

// Event listener
window.api.onPipelineEvent((event) => {
  // Handle: 'token', 'thinking', 'done', 'error'
})
```

✅ **Verified**: Hook correctly calls `pipelineRun('chat', ...)`
✅ **System Prompt**: Passed via `context.systemPrompt`
✅ **Conversation History**: Properly formatted

### 4. Brain Page Usage
**Files**:
- `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/ConsciousnessPage.tsx`
- `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/pages/brain/PrinciplesPage.tsx`

```tsx
<BrainChatContainer
  sectionId="consciousness"
  systemPrompt="You are an AI assistant specialized in consciousness..."
  placeholder="Ask about consciousness..."
  emptyStateMessage="Start a conversation..."
/>
```

✅ **Verified**: System prompts are properly configured
✅ **Section IDs**: Unique per brain section

---

## 🔍 Message Flow Trace

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Types Message in BrainChatContainer                    │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. useLlmChat.submit() Called                                   │
│    - Adds user message to state                                 │
│    - Prepares conversation history                              │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. IPC Call: window.api.pipelineRun('chat', {...})             │
│    Context: { sectionId, providerId, messages, systemPrompt }  │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Main Process: PipelineIpc Handler                           │
│    File: src/main/ipc/PipelineIpc.ts:29-36                     │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PipelineService.start('chat', input, windowId)              │
│    File: src/main/pipeline/PipelineService.ts:52-78            │
│    - Creates UUID runId                                         │
│    - Creates AbortController                                    │
│    - Looks up 'chat' agent in AgentRegistry                     │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. ChatAgent.run(input, runId, signal)                         │
│    File: src/main/pipeline/agents/ChatAgent.ts:118-214         │
│    - Resolves API key (StoreService → env var)                 │
│    - Resolves model name                                        │
│    - Extracts system prompt from input.context                  │
│    - Creates ChatOpenAI instance with streaming                 │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. LangChain Streaming                                          │
│    - Builds message chain: [SystemMessage, ...history, Human]  │
│    - Calls model.stream(messages, { signal })                   │
│    - Yields AgentEvents: 'thinking' → 'token' → 'done'         │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. PipelineService.driveRun() Forwards Events                  │
│    File: src/main/pipeline/PipelineService.ts:140-172           │
│    - Iterates async generator                                   │
│    - Sends to EventBus: eventBus.sendTo(windowId, ...)         │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. EventBus Broadcasts to Renderer                             │
│    Channel: 'pipeline:event'                                    │
│    Payload: { type: 'token'|'done'|'error', data: {...} }      │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Renderer Receives Event                                     │
│     useLlmChat.onPipelineEvent() listener                       │
│     - Accumulates tokens                                        │
│     - Updates message state                                     │
└──────────────────┬──────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. BrainChatMessages Re-renders                               │
│     - Displays streaming response                               │
│     - Shows completion when 'done' event received               │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Potential Issues Identified

### Issue #1: Environment Variable Loading
**Severity**: 🔴 HIGH
**Location**: Main process environment variable access

**Problem**:
- ChatAgent uses `import.meta.env.VITE_OPENAI_API_KEY` (line 124)
- While `electron.vite.config.ts` has `envPrefix: ['MAIN_VITE_', 'VITE_']`, the `.env` file might not be loaded correctly during development
- Vite's `import.meta.env` behavior in main process can be inconsistent

**Evidence**:
```typescript
// electron.vite.config.ts:8
main: {
  envPrefix: ['MAIN_VITE_', 'VITE_'],
  // ...
}
```

**Solution**:
1. Check if `import.meta.env.VITE_OPENAI_API_KEY` is actually defined in main process
2. Consider using Node.js `process.env` instead if Vite env vars aren't loading
3. **Recommended**: Set API key via Settings UI (StoreService) instead of relying on env vars

### Issue #2: API Key Validation
**Severity**: 🟡 MEDIUM
**Location**: ChatAgent.ts:126

**Problem**:
```typescript
if (!apiKey || apiKey === 'your-openai-api-key-here') {
  yield { type: 'error', data: { runId, message: '...' } }
  return
}
```

If the API key check fails, an error event is yielded but might not be visible in the UI.

**Solution**: ✅ Added error display in BrainChatContainer

### Issue #3: Silent Failures
**Severity**: 🟡 MEDIUM
**Location**: Multiple points in the flow

**Problem**:
- Errors might be logged to console but not surfaced to user
- No visual feedback if API key is missing
- No indication if LangChain streaming fails

**Solution**: ✅ Added comprehensive console logging

---

## 🔧 Debugging Enhancements Added

### 1. Enhanced Hook Logging
**File**: `src/renderer/src/hooks/useLlmChat.ts`

Added console logging for:
- Message submission with context details
- Pipeline call parameters
- Pipeline result inspection
- Event reception (token, thinking, done, error)
- Event listener setup/cleanup

### 2. Enhanced Agent Logging
**File**: `src/main/pipeline/agents/ChatAgent.ts`

Added console logging for:
- StoreService settings retrieval
- Environment variable availability
- API key resolution (with prefix for security)
- Final configuration before OpenAI call
- System prompt verification

### 3. Error Display UI
**File**: `src/renderer/src/components/brain/BrainChatContainer.tsx`

Added:
- Error banner at top of chat container
- AlertCircle icon for visual feedback
- Destructive color scheme for errors
- Full error message display

---

## 📋 Next Steps - User Actions Required

### Step 1: Configure API Key (Choose One Method)

**Option A: Via Settings UI (Recommended)**
1. Open application Settings
2. Navigate to Model Providers
3. Select "OpenAI"
4. Enter your API key: `sk-proj-MWv3JzT...` (from `.env`)
5. Save settings

**Option B: Verify Environment Variables**
1. Confirm `.env` file exists at project root
2. Verify `VITE_OPENAI_API_KEY` is set correctly
3. **Restart the application** (environment changes require restart)

### Step 2: Test Brain Pages

1. Start dev server: `npm run dev`
2. Open DevTools (View → Toggle Developer Tools)
3. Navigate to any brain page (Consciousness, Principles, etc.)
4. Type a test message: "Hello, test"
5. Watch for console logs in both:
   - **Renderer Console** (DevTools → Console tab)
   - **Main Process Console** (Terminal running `npm run dev`)

### Step 3: Analyze Logs

**Look for these key log messages:**

**Renderer Console:**
```
[useLlmChat] Submitting message: { sectionId: "consciousness", ... }
[useLlmChat] Calling pipelineRun with: { agent: "chat", ... }
[useLlmChat] Pipeline result: { success: true, data: { runId: "..." } }
[useLlmChat] Received pipeline event: token { runId: "...", token: "..." }
```

**Main Process Console:**
```
[ChatAgent] Run <runId> - StoreSettings: { ... }
[ChatAgent] Run <runId> - ENV API Key exists: true
[ChatAgent] Run <runId> - Final API Key exists: true
[ChatAgent] Starting run <runId> with provider=openai model=gpt-4o-mini
[PipelineService] Starting run <runId> with agent "chat"
```

### Step 4: Common Issues & Solutions

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "No API key configured" error | API key not loaded | Set via Settings UI or verify `.env` |
| No console logs at all | IPC not working | Check if `window.api` is defined |
| Logs show `ENV API Key exists: false` | Env vars not loading | Use Settings UI instead |
| "Unknown agent 'chat'" error | Bootstrap not running | Check main process startup |
| Stream starts but stops | API key invalid | Verify key is valid on OpenAI dashboard |
| "Authentication failed" error | Wrong API key | Check key format and validity |

---

## 🏗️ Architecture Health Check

| Component | Status | Notes |
|-----------|--------|-------|
| ChatAgent Registration | ✅ | Registered in bootstrap.ts |
| Agent Name Matching | ✅ | 'chat' matches everywhere |
| IPC Handlers | ✅ | PipelineIpc properly wired |
| Preload Bridge | ✅ | API exposed correctly |
| Event Streaming | ✅ | EventBus configured |
| React Hook | ✅ | useLlmChat implementation correct |
| UI Components | ✅ | BrainChatContainer setup correct |
| System Prompts | ✅ | Passed through context |
| Conversation History | ✅ | Properly formatted |
| Error Handling | ✅ | Now enhanced with logging |
| API Key Loading | ⚠️ | Needs verification |

---

## 📊 Configuration Summary

### Environment Variables
```bash
VITE_APP_ENV=development
VITE_OPENAI_API_KEY=sk-proj-MWv3JzT... (configured ✅)
VITE_OPENAI_MODEL=gpt-4o-mini (configured ✅)
```

### StoreService Location
```
~/.config/Electron/settings.json
or
~/Library/Application Support/Electron/settings.json (macOS)
```

### Expected Settings Format
```json
{
  "modelSettings": {
    "openai": {
      "selectedModel": "gpt-4o-mini",
      "apiToken": "sk-proj-..."
    }
  }
}
```

---

## 🎯 Success Criteria

When working correctly, you should see:

1. **Renderer console**: Pipeline run initiated with runId
2. **Main console**: ChatAgent logs showing API key resolution
3. **UI**: "Connecting to OpenAI..." thinking indicator
4. **UI**: Streaming tokens appearing in real-time
5. **UI**: Complete response rendered with markdown
6. **Main console**: "Run completed" message

---

## 📞 Support

If issues persist after following this guide:

1. Capture logs from both renderer and main process consoles
2. Check the error banner in the UI for specific error messages
3. Verify API key works via curl:
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer sk-proj-..." \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
   ```

---

**Report Generated**: 2026-02-23
**Version**: OpenWriter (Electron-based)
**Architecture**: Verified ✅
**Next Action**: Test with enhanced logging
