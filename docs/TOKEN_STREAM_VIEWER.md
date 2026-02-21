# Token Stream Viewer - Live Token Feed

The Token Stream Viewer provides real-time visualization of individual tokens as they stream from AI agents to the renderer.

## 🎯 Overview

The token stream is a **live feed** that shows each token (character) as it arrives, separate from the accumulated output. This is useful for:

- 🔍 **Debugging**: See exactly what tokens are being received
- 📊 **Performance Monitoring**: Track streaming rate (tokens/second)
- 🎓 **Learning**: Understand how LLMs stream responses
- 🐛 **Troubleshooting**: Identify issues with token delivery

## 🎨 UI Features

### Dual Display Mode

Each agent run shows **two outputs**:

1. **Accumulated Output** (Top)
   - Final rendered text
   - Typewriter cursor effect
   - Clean reading experience

2. **Token Stream** (Bottom)
   - Live feed of individual tokens
   - Auto-scrolling
   - Timestamp and index for each token
   - Can be toggled on/off

### Visual Elements

```
┌─────────────────────────────────────────────────┐
│ Accumulated Output                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ Hello, world│                  Streaming... │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Token Stream    🔴 Live           247 tokens   │
│ ┌─────────────────────────────────────────────┐ │
│ │ #0   H   +0ms                               │ │
│ │ #1   e   +5ms                               │ │
│ │ #2   l   +10ms                              │ │
│ │ #3   l   +15ms     ← Latest (pulsing)      │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 📊 Token Entry Structure

Each token in the stream contains:

```typescript
interface TokenEntry {
  index: number      // Sequential token number (0, 1, 2, ...)
  token: string      // The actual character/token
  timestamp: number  // Milliseconds since run started
}
```

### Example Token Entries

```typescript
[
  { index: 0, token: 'H', timestamp: 0 },
  { index: 1, token: 'e', timestamp: 5 },
  { index: 2, token: 'l', timestamp: 10 },
  { index: 3, token: 'l', timestamp: 15 },
  { index: 4, token: 'o', timestamp: 20 }
]
```

## 🎮 Controls

### Toggle Token Stream

Located in the "Test Controls" section:

```tsx
☑ Show Token Stream  ← Click to toggle visibility
```

- **Checked**: Token stream visible for all runs
- **Unchecked**: Only accumulated output shown
- **Default**: Enabled (visible)

### Auto-Scroll

The token stream automatically scrolls to show the latest token:

- **Smooth scrolling** using CSS `scroll-smooth`
- **Auto-scrolls** when new token arrives
- **Manual scroll** also supported
- **Performance**: Uses `setTimeout` to avoid blocking

## 🎨 Visual Indicators

### Special Characters

Non-printable characters are shown with symbols:

- **Space**: `␣` (open box)
- **Newline**: `↵` (return arrow)
- **Tab**: `→` (right arrow)
- **Regular chars**: Shown as-is

### Color Coding

```css
Token background: bg-blue-500/10
Token text: text-blue-600 dark:text-blue-400
Index: text-muted-foreground/40
Timestamp: text-muted-foreground/40
Latest token (running): bg-blue-500/5 + animate-pulse
```

### Live Indicator

When agent is streaming:
```
🔴 Live  ← Pulsing red dot indicates active streaming
```

## 📈 Performance Metrics

### Tokens Per Second

Displayed in real-time:
```
~47 tok/s  ← Calculated from token count and elapsed time
```

Formula:
```typescript
tokensPerSecond = tokenCount / ((Date.now() - startTime) / 1000)
```

### Token Count

Shows total tokens received:
```
247 tokens  ← Total count
```

## 🔄 Data Flow

### 1. Event Received
```typescript
window.api.onPipelineEvent((event) => {
  if (event.type === 'token') {
    // New token arrived!
  }
})
```

### 2. Token Entry Created
```typescript
run.tokens.push({
  index: run.tokenCount,
  token: data.token,
  timestamp: Date.now() - run.startTime
})
run.tokenCount++
```

### 3. UI Update
```typescript
// React re-renders with new token
<div className="flex items-center gap-2">
  <span>#{tokenEntry.index}</span>
  <span>{tokenEntry.token}</span>
  <span>+{tokenEntry.timestamp}ms</span>
</div>
```

### 4. Auto-Scroll
```typescript
setTimeout(() => {
  const streamEl = tokenStreamRefs.current.get(runId)
  if (streamEl) {
    streamEl.scrollTop = streamEl.scrollHeight
  }
}, 0)
```

## 🎯 Use Cases

### 1. Debug Token Timing

See exactly when each token arrives:

```
#0   H   +0ms
#1   e   +5ms
#2   l   +10ms    ← 5ms delay between tokens
#3   l   +15ms
#4   o   +20ms
```

### 2. Identify Bottlenecks

Look for large gaps in timestamps:

```
#100  .   +500ms
#101  .   +505ms
#102  .   +1205ms  ← 700ms delay! Investigate
#103  T   +1210ms
```

### 3. Monitor Concurrent Streams

When running multiple agents, each has its own token stream:

```
Agent 1:  #0 H +0ms    #1 e +5ms    #2 l +10ms
Agent 2:  #0 A +2ms    #1 B +7ms    #2 C +12ms
```

### 4. Verify Character-Level Streaming

Ensure each character comes as a separate token:

```
✅ Correct (character-level):
#0 H  #1 e  #2 l  #3 l  #4 o

❌ Wrong (word-level):
#0 Hello
```

## 🛠️ Implementation Details

### Token Storage

Tokens are stored in the `AgentRun` state:

```typescript
interface AgentRun {
  // ... other fields
  tokens: TokenEntry[]   // All received tokens
  tokenCount: number     // Total count (faster than tokens.length)
}
```

### Performance Optimization

**Only last 100 tokens displayed** to avoid DOM bloat:

```typescript
{run.tokens.slice(-100).map((tokenEntry) => (
  // Render token entry
))}
```

If more than 100 tokens:
```
Showing last 100 tokens of 247
```

### Auto-Scroll Implementation

Uses `useRef` to track DOM element:

```typescript
const tokenStreamRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

// In render:
<div ref={(el) => {
  if (el) tokenStreamRefs.current.set(run.runId, el)
}}>

// On token event:
const streamEl = tokenStreamRefs.current.get(runId)
if (streamEl) {
  streamEl.scrollTop = streamEl.scrollHeight
}
```

### Latest Token Highlighting

The most recent token pulses when streaming is active:

```typescript
const isLatest = idx === run.tokens.slice(-100).length - 1
className={isLatest && run.status === 'running' ? 'animate-pulse' : ''}
```

## 🎓 Example Output

### Simple Count

```
Token Stream    🔴 Live    5 tokens    ~200 tok/s

#0   1   +0ms
#1      +5ms      ← Space
#2   2   +10ms
#3      +15ms
#4   3   +20ms
```

### With Special Characters

```
Token Stream    247 tokens    ~185 tok/s

#243  .   +1320ms
#244  ↵   +1325ms  ← Newline
#245  →   +1330ms  ← Tab
#246  H   +1335ms
```

## 📱 Responsive Design

The token stream adapts to different screen sizes:

- **Desktop**: Full width, 200px max height
- **Tablet**: Scrollable container
- **Mobile**: Optimized text sizes

## 🔧 Customization

### Change Max Height

```css
/* Current: 200px */
max-h-[200px]

/* Larger: 400px */
max-h-[400px]
```

### Change Display Limit

```typescript
/* Current: Last 100 tokens */
{run.tokens.slice(-100).map(...)}

/* Show last 50 tokens */
{run.tokens.slice(-50).map(...)}

/* Show all tokens (not recommended for performance) */
{run.tokens.map(...)}
```

### Disable Auto-Scroll

Comment out auto-scroll code:

```typescript
// Auto-scroll token stream to bottom
// setTimeout(() => {
//   const streamEl = tokenStreamRefs.current.get(data.runId)
//   if (streamEl) {
//     streamEl.scrollTop = streamEl.scrollHeight
//   }
// }, 0)
```

## 🎯 Best Practices

1. **Keep toggle enabled during debugging**
   - Helps identify streaming issues

2. **Watch for timing irregularities**
   - Large gaps might indicate network issues

3. **Monitor tokens/second**
   - Should be ~200 tok/s with 5ms delay

4. **Check special characters**
   - Ensure newlines and spaces render correctly

5. **Use for concurrent testing**
   - Verify independent token streams

## 🔍 Troubleshooting

### Tokens Not Appearing

1. Check if toggle is enabled
2. Verify agent is sending token events
3. Check browser console for errors

### Auto-Scroll Not Working

1. Verify ref is attached to DOM element
2. Check `tokenStreamRefs.current` has entry
3. Ensure `setTimeout` is executing

### Performance Issues

1. Reduce display limit (100 → 50)
2. Disable token stream for long runs
3. Clear runs periodically

## 📊 Statistics

**Per Run Metrics:**
- Token count
- Tokens per second
- Total duration
- Character count

**Visual Feedback:**
- Live indicator (pulsing dot)
- Latest token highlighting
- Smooth auto-scroll
- Color-coded tokens
