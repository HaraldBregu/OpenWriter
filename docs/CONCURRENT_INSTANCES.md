# Concurrent Agent Instances

Run the same agent multiple times simultaneously for load testing, performance analysis, and concurrent execution verification.

## 🎯 Overview

The pipeline system supports running **multiple instances of the same agent concurrently**. Each instance:

- ✅ Gets a unique `runId`
- ✅ Runs independently in its own async context
- ✅ Has its own AbortController for cancellation
- ✅ Streams tokens independently
- ✅ Doesn't block other instances

## 🏗️ Architecture

### Backend Support

The `PipelineService` tracks all active runs in a Map:

```typescript
private activeRuns = new Map<string, ActiveRun>()

interface ActiveRun {
  runId: string        // ← Unique ID per instance
  agentName: string    // ← Multiple instances can have same name
  controller: AbortController
  startedAt: number
}
```

### How It Works

```
User clicks "Counter × 3"
         │
         ▼
┌────────────────────────┐
│ runAgentMultipleTimes  │  ← Starts 3 instances
└────────┬───────────────┘
         │
         ├──── Instance 1: runId: abc123...
         │     ├─ Counter Agent (async)
         │     └─ Streams independently
         │
         ├──── Instance 2: runId: def456...
         │     ├─ Counter Agent (async)
         │     └─ Streams independently
         │
         └──── Instance 3: runId: ghi789...
               ├─ Counter Agent (async)
               └─ Streams independently
```

## 🎮 UI Controls

### Multi-Instance Buttons

Located in the "Concurrent Instances" section:

```
🔀 Concurrent Instances (Same Agent Multiple Times)

[Counter × 2]  [Counter × 3]  [Alphabet × 2]  [Chat × 3]  [Echo × 5]
```

**Examples:**
- **Counter × 2**: Runs Counter agent twice simultaneously
- **Chat × 3**: Runs Chat agent 3 times concurrently
- **Echo × 5**: Runs Echo agent 5 times (fast, no API needed!)

### Visual Indicators

#### 1. Summary Section
Shows agent counts:
```
Summary
┌────────────────────┐
│ counter    × 3     │  ← 3 instances running
│ alphabet   × 2     │  ← 2 instances running
└────────────────────┘
```

#### 2. Instance Numbers
Each run shows its instance number:
```
┌──────────────────────────────────┐
│ counter #1  running  12 chars    │  ← Instance 1
├──────────────────────────────────┤
│ counter #2  running  8 chars     │  ← Instance 2
├──────────────────────────────────┤
│ counter #3  running  15 chars    │  ← Instance 3
└──────────────────────────────────┘
```

The purple badge `#1`, `#2`, `#3` shows which instance it is.

## 💻 Implementation

### Starting Multiple Instances

```typescript
const runAgentMultipleTimes = async (
  agentName: string,
  prompt: string,
  times: number
) => {
  console.log(`Running ${agentName} ${times} times concurrently...`)

  for (let i = 0; i < times; i++) {
    // Small delay between starts (100ms)
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 100))

    // Add instance number to prompt
    const instancePrompt = `[Instance ${i + 1}/${times}] ${prompt}`

    // Start the agent
    runAgent(agentName, instancePrompt)
  }
}
```

### Why 100ms Delay Between Starts?

```typescript
if (i > 0) await new Promise(resolve => setTimeout(resolve, 100))
```

**Reasons:**
1. **Avoid overwhelming the system**: Don't create 10 LLM connections at once
2. **Better UX**: Staggered starts make it easier to see what's happening
3. **API rate limits**: Some providers have connection rate limits
4. **Network congestion**: Prevents network congestion on startup

**You can adjust this:**
- **No delay**: `0ms` - All start simultaneously
- **Current**: `100ms` - Good balance
- **Conservative**: `500ms` - Very safe for high counts

### Instance Tracking

The UI tracks which instance number each run is:

```typescript
const sameAgentRuns = Array.from(runs.values())
  .filter(r => r.agentName === run.agentName)

if (sameAgentRuns.length > 1) {
  const instanceNum = sameAgentRuns.findIndex(r => r.runId === run.runId) + 1
  // Show instance badge: #1, #2, #3, etc.
}
```

## 🎯 Use Cases

### 1. **Load Testing**

Test how many concurrent AI agents your system can handle:

```typescript
// Start 10 instances
runAgentMultipleTimes('chat', 'Short response', 10)

// Monitor:
// - System resources (CPU, memory)
// - API rate limits
// - Token streaming performance
```

### 2. **Performance Comparison**

Run same prompt multiple times to compare response times:

```typescript
// Run same prompt 5 times
runAgentMultipleTimes('counter', 'Count to 10', 5)

// Compare completion times in UI
// Instance 1: 2.3s
// Instance 2: 2.1s
// Instance 3: 2.4s
// Instance 4: 2.2s
// Instance 5: 2.3s
```

### 3. **Parallel Processing**

Process different data concurrently:

```typescript
// Not in UI, but you could do programmatically:
runAgent('chat', 'Summarize: [Document A]')
runAgent('chat', 'Summarize: [Document B]')
runAgent('chat', 'Summarize: [Document C]')
```

### 4. **Concurrent Testing**

Verify that agents don't interfere with each other:

```typescript
// Run Echo 5 times - should complete quickly
runAgentMultipleTimes('echo', 'Test message', 5)

// All 5 should complete in ~same time
// None should block the others
```

## 📊 Visual Example

When you click "Counter × 3", you'll see:

```
Summary
┌─────────────────┐
│ counter    × 3  │
└─────────────────┘

Active Runs (3)
┌────────────────────────────────────────────┐
│ counter #1  running  25 chars  ~200 tok/s │
│ [Instance 1/3] Count to 5                  │
│ 1 - One represents unity│                  │
│                                            │
│ Token Stream  🔴 Live  25 tokens           │
│ #0 1  +0ms   #1 ␣  +5ms   #2 -  +10ms     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ counter #2  running  18 chars  ~180 tok/s │
│ [Instance 2/3] Count to 5                  │
│ 1 - One is│                                │
│                                            │
│ Token Stream  🔴 Live  18 tokens           │
│ #0 1  +0ms   #1 ␣  +5ms   #2 -  +10ms     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ counter #3  running  30 chars  ~220 tok/s │
│ [Instance 3/3] Count to 5                  │
│ 1 - One symbolizes│                        │
│                                            │
│ Token Stream  🔴 Live  30 tokens           │
│ #0 1  +0ms   #1 ␣  +5ms   #2 -  +10ms     │
└────────────────────────────────────────────┘
```

## 🔧 Backend Implementation

### Agent Independence

Agents are **stateless** (mostly):

```typescript
export class CounterAgent implements Agent {
  readonly name = 'counter'

  constructor(private readonly storeService: StoreService) {}
  //                                          ↑
  //                     Read-only dependency, safe for concurrent use

  async *run(input: AgentInput, runId: string, signal: AbortSignal) {
    // Each run is completely independent
    // No shared state between runs
    // Each has its own:
    // - runId
    // - signal
    // - input
    // - LangChain model instance
  }
}
```

### Concurrent Safety

**Safe for concurrent use:**
- ✅ `StoreService` (read-only operations)
- ✅ Agent state (no mutable state)
- ✅ LangChain model instances (created per run)
- ✅ AbortSignal (unique per run)

**Not shared between runs:**
- ✅ Each run has its own async generator
- ✅ Each run has its own event stream
- ✅ Each run has its own AbortController

### Cancellation

You can cancel individual instances:

```typescript
// Cancel specific instance
window.api.pipelineCancel(runId)

// Cancels only that instance
// Other instances continue running
```

## 📈 Performance Metrics

### Overhead Per Instance

**Minimal overhead:**
- Memory: ~1-2MB per agent instance
- CPU: Depends on LLM streaming rate
- Network: One connection per instance

**LangChain handles:**
- Connection pooling
- Request queuing
- Rate limiting (provider-side)

### Recommended Limits

**Safe limits:**
- **Echo agent**: 100+ instances (no API calls)
- **AI agents**: 5-10 instances (API rate limits)
- **Concurrent different agents**: No practical limit

**What limits you:**
- API provider rate limits (OpenAI, Anthropic, etc.)
- Network bandwidth
- System memory
- Browser performance (for rendering)

## 🎓 Examples

### Test Concurrent Throughput

```javascript
// Browser console
const testThroughput = async () => {
  const start = Date.now()

  // Run Echo 10 times (no API delay)
  for (let i = 0; i < 10; i++) {
    window.api.pipelineRun('echo', {
      prompt: `Test message ${i + 1}`
    })
  }

  console.log('Started 10 instances in:', Date.now() - start, 'ms')
}

testThroughput()
```

### Monitor Completion Times

```javascript
const completionTimes = []

window.api.onPipelineEvent((event) => {
  if (event.type === 'done') {
    completionTimes.push({
      runId: event.data.runId,
      completedAt: Date.now()
    })
    console.log('Completion times:', completionTimes)
  }
})
```

### Test API Rate Limits

```javascript
// Start many instances to test rate limiting
const testRateLimit = async () => {
  console.log('Starting 20 Chat instances...')

  for (let i = 0; i < 20; i++) {
    window.api.pipelineRun('chat', {
      prompt: 'Say "OK"'
    })

    // 100ms delay between starts
    await new Promise(r => setTimeout(r, 100))
  }

  console.log('All instances started!')
}

testRateLimit()
```

## 🐛 Troubleshooting

### All Instances Error at Once

**Cause**: API key issue or provider rate limit

**Solution**:
1. Check API key in Settings
2. Reduce concurrent instances
3. Add delay between starts
4. Use Echo agent (no API key needed)

### Some Instances Hang

**Cause**: Network issues or API timeout

**Solution**:
1. Check network connection
2. Use shorter prompts
3. Cancel hung instances
4. Restart with fewer instances

### Browser Slows Down

**Cause**: Too many token stream displays

**Solution**:
1. Toggle off "Show Token Stream"
2. Reduce concurrent instances
3. Clear old runs
4. Use more powerful machine

## 🎯 Best Practices

1. **Start small**: Test with 2-3 instances first
2. **Monitor resources**: Watch CPU/memory usage
3. **Use Echo for testing**: No API limits
4. **Stagger starts**: Keep the 100ms delay
5. **Clear old runs**: Click "Clear Results" periodically
6. **Test rate limits**: Know your API limits
7. **Use instance prompts**: Help identify each run

## 📊 UI Features Summary

✅ **Multi-instance buttons** - One-click to start N instances
✅ **Summary section** - See total count per agent
✅ **Instance badges** - Purple `#1`, `#2`, `#3` badges
✅ **Independent streams** - Each instance has its own output
✅ **Independent metrics** - Separate char count, timing, etc.
✅ **Auto-scrolling** - Each token stream scrolls independently
✅ **Toggle streams** - Hide token streams for better performance

## 🚀 Quick Start

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Go to Pipeline Test** (sidebar)

3. **Click multi-instance button**:
   - Click "Counter × 3"
   - Watch 3 instances start
   - See them stream independently

4. **Observe**:
   - Summary shows "counter × 3"
   - Each run has `#1`, `#2`, `#3` badge
   - All stream concurrently
   - No blocking between instances

5. **Try Echo × 5** for fast demo (no API key needed!)

The system fully supports true concurrent execution! 🎉
