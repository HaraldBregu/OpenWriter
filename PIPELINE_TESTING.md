# Pipeline Concurrent Testing Guide

This guide explains how to test concurrent AI pipeline execution in Tesseract AI.

## New AI-Powered Test Agents

Two new LangChain-powered test agents have been added to verify concurrent pipeline execution with real LLM streaming:

### 1. **CounterAgent** (`counter`) - AI Counting Assistant
- **Purpose**: Uses OpenAI to generate creative counting sequences with educational content
- **Technology**: LangChain + OpenAI (streaming)
- **Requirements**: OpenAI API key (configured in Settings or .env)
- **Usage Examples**:
  - Simple counting: `"Count to 10"`
  - With facts: `"Count to 10 with fun facts about each number"`
  - Different bases: `"Count to 8 in binary"`
  - Creative: `"Count to 5 with historical events"`
- **Example**: `window.api.pipelineRun('counter', { prompt: 'Count to 10 with fun facts' })`

### 2. **AlphabetAgent** (`alphabet`) - AI Alphabet Teacher
- **Purpose**: Uses OpenAI to generate creative alphabet sequences with educational content
- **Technology**: LangChain + OpenAI (streaming)
- **Requirements**: OpenAI API key (configured in Settings or .env)
- **Usage Examples**:
  - Simple alphabet: `"List the alphabet"`
  - With words: `"Alphabet with animals for each letter"`
  - Educational: `"Alphabet with phonetic pronunciations"`
  - Languages: `"First 10 letters of the Greek alphabet"`
- **Example**: `window.api.pipelineRun('alphabet', { prompt: 'alphabet with animals' })`

## Prerequisites

⚠️ **IMPORTANT**: The new AI agents require an OpenAI API key.

### Setup API Key

Choose one of these methods:

**Option 1: Settings UI (Recommended)**
1. Open Tesseract AI
2. Go to Settings → Models tab
3. Enter your OpenAI API key
4. Select a model (e.g., gpt-4o-mini)

**Option 2: Environment Variable**
```bash
# Create .env file
cp .env.example .env

# Add your API key
echo "VITE_OPENAI_API_KEY=your-api-key-here" >> .env
```

## Testing Concurrent Execution

### Option 1: Using the Test UI (Recommended)

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the Pipeline Test Page**:
   - Click on **"🧪 Pipeline Test"** in the sidebar
   - Or navigate to: `#/pipeline-test`

3. **Configure API Key** (if not already done):
   - You'll see a warning if no API key is configured
   - Go to Settings and add your OpenAI API key

4. **Run Concurrent AI Tests**:
   - Click **"🚀 Run Both AI Agents"** to test concurrent execution
   - Watch as both AI agents stream responses simultaneously
   - Each agent will generate creative, AI-powered content

### Option 2: Using Browser Console

Open DevTools and run:

```javascript
// Run counter agent with AI
window.api.pipelineRun('counter', { prompt: 'Count to 10 with fun facts about each number' })

// Run alphabet agent with AI
window.api.pipelineRun('alphabet', { prompt: 'List the alphabet with an animal for each letter' })

// Listen for events
window.api.onPipelineEvent((event) => {
  console.log('Pipeline event:', event)
})
```

### Option 3: Programmatic Test

```javascript
async function testConcurrentAIPipelines() {
  // Start both AI agents simultaneously
  const result1 = await window.api.pipelineRun('counter', {
    prompt: 'Count to 5 with interesting facts'
  })
  const result2 = await window.api.pipelineRun('alphabet', {
    prompt: 'First 5 letters with words'
  })

  if (result1.success && result2.success) {
    console.log('Counter AI run ID:', result1.data.runId)
    console.log('Alphabet AI run ID:', result2.data.runId)
    console.log('Both AI pipelines running concurrently!')
  }
}

testConcurrentAIPipelines()
```

## Expected Behavior

When running both agents concurrently:

1. **Independent Execution**: Each agent should run in its own isolated context
2. **Interleaved Events**: Events from both agents will arrive interleaved via the event bus
3. **No Blocking**: Neither agent should block the other
4. **Cancellation**: Each run can be cancelled independently via `pipelineCancel(runId)`
5. **Error Isolation**: Errors in one agent should not affect the other

## Verifying Concurrent Execution

Check the console output:

```
[PipelineService] Starting run <uuid1> with agent "counter"
[PipelineService] Starting run <uuid2> with agent "alphabet"
[PipelineService] Run <uuid1> (counter) finished. Active runs: 1
[PipelineService] Run <uuid2> (alphabet) finished. Active runs: 0
```

The "Active runs" count should show both running simultaneously.

## Available Agents

After starting the app, you can check all available agents:

```javascript
window.api.pipelineListAgents().then(result => {
  console.log('Available agents:', result.data)
})
// Expected: ['echo', 'chat', 'counter', 'alphabet']
```

## Debugging

If you encounter issues:

1. **Check Agent Registration**:
   ```javascript
   window.api.pipelineListAgents()
   ```

2. **Check Active Runs**:
   ```javascript
   window.api.pipelineListRuns()
   ```

3. **Enable Verbose Logging**: Check the main process console for detailed logs

## Creative Test Prompts

Try these interesting prompts to test the AI agents:

### CounterAgent Examples
```javascript
// Mathematical sequences
window.api.pipelineRun('counter', { prompt: 'First 10 Fibonacci numbers' })

// Historical counting
window.api.pipelineRun('counter', { prompt: 'Count to 5 with historical events from each century' })

// Fun facts
window.api.pipelineRun('counter', { prompt: 'Count to 7 with fun facts about each day of the week' })

// Different number systems
window.api.pipelineRun('counter', { prompt: 'Count to 10 in Roman numerals with explanations' })
```

### AlphabetAgent Examples
```javascript
// Animals
window.api.pipelineRun('alphabet', { prompt: 'Alphabet with endangered animals' })

// Countries
window.api.pipelineRun('alphabet', { prompt: 'One country name for each letter A-Z' })

// Food
window.api.pipelineRun('alphabet', { prompt: 'List foods starting with each letter' })

// Science
window.api.pipelineRun('alphabet', { prompt: 'Chemical elements for each letter of the alphabet' })
```

## Notes

- ⚠️ **Requires API Key**: AI agents need OpenAI API key (free EchoAgent available for no-key testing)
- ✅ **Real LLM Streaming**: Tests actual AI responses with streaming
- ✅ **Concurrent Execution**: Multiple AI agents can run simultaneously
- ✅ **Cancellation Support**: All agents respect `AbortSignal` for proper cancellation
- ✅ **TypeScript**: Fully typed for better DX
- 💰 **Cost**: Using gpt-4o-mini keeps costs very low (~$0.0001 per request)

## Files Modified

- `src/main/pipeline/agents/CounterAgent.ts` (new)
- `src/main/pipeline/agents/AlphabetAgent.ts` (new)
- `src/main/pipeline/index.ts` (exports added)
- `src/main/bootstrap.ts` (registration added)
- `src/renderer/src/pages/PipelineTestPage.tsx` (new)
- `src/renderer/src/App.tsx` (route added)
