# Brain Pages Quick Start Guide

## Overview

The Brain Pages provide specialized AI chat interfaces for different cognitive domains:
- **Principles**: Ethical reasoning and moral frameworks
- **Consciousness**: Self-awareness and metacognition
- **Memory**: Learning and information retention
- **Reasoning**: Logic and problem-solving
- **Perception**: Pattern recognition and sensory processing

## Setup (First Time)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure OpenAI API Key**
   - Launch the app: `npm run dev`
   - Open Settings (gear icon in sidebar)
   - Under "Model Settings", select "OpenAI" provider
   - Enter your OpenAI API key
   - Select a model (recommended: `gpt-4o-mini`)
   - Click "Save"

3. **Navigate to Brain Pages**
   - Click "Brain" in the sidebar
   - Select any of the five subsections

## Usage

### Starting a Conversation

1. Click on any brain subsection (e.g., Principles)
2. Type your question in the input field at the bottom
3. Press Enter or click the send button
4. Watch the AI response stream in real-time

### Example Prompts

**Principles Page:**
```
"What is the trolley problem and how do different ethical frameworks approach it?"
"Explain the concept of moral relativism vs. moral absolutism"
```

**Consciousness Page:**
```
"What is metacognition and how can I improve it?"
"Explain the difference between self-awareness and consciousness"
```

**Memory Page:**
```
"What are the best techniques for memorizing vocabulary?"
"How does spaced repetition work?"
```

**Reasoning Page:**
```
"What are common logical fallacies I should watch out for?"
"Explain the difference between deductive and inductive reasoning"
```

**Perception Page:**
```
"How do optical illusions work?"
"What is change blindness and why does it happen?"
```

### Managing Conversations

- **Continue Conversation**: Just keep typing - the AI remembers context
- **Cancel Generation**: Click the stop button during streaming
- **Clear Chat**: Refresh the page (conversation history is not persisted)

## Architecture

### Component Hierarchy

```
Brain Page (e.g., PrinciplesPage)
  └─ BrainChatContainer
      ├─ BrainChatMessages (displays conversation)
      └─ BrainChatInput (handles user input)
```

### Data Flow

```
User types message
  ↓
BrainChatInput calls submit()
  ↓
useLlmChat hook
  - Calls window.api.pipelineRun('chat', ...)
  - Adds user message to state
  ↓
Main Process: PipelineService starts ChatAgent
  ↓
ChatAgent streams tokens via LangChain + OpenAI
  ↓
Tokens emitted via EventBus: pipeline:event
  ↓
useLlmChat receives tokens via window.api.onPipelineEvent()
  ↓
BrainChatMessages updates in real-time
```

## Customization

### Adding a New Brain Section

1. **Create Page Component** (`src/renderer/src/pages/brain/YourPage.tsx`)
   ```typescript
   import React from 'react'
   import { YourIcon } from 'lucide-react'
   import { BrainChatContainer } from '@/components/brain/BrainChatContainer'

   const YourPage: React.FC = () => {
     return (
       <div className="flex h-full flex-col">
         <div className="flex items-center gap-3 border-b border-border px-6 py-4">
           <YourIcon className="h-5 w-5 text-primary" />
           <h1 className="text-xl font-semibold">Your Section</h1>
         </div>

         <div className="flex-1 overflow-auto p-6">
           <div className="mx-auto max-w-4xl space-y-6">
             <div className="rounded-lg border border-border bg-card p-6">
               <h2 className="mb-3 text-lg font-medium">Section Title</h2>
               <p className="text-muted-foreground">
                 Section description...
               </p>
             </div>

             <BrainChatContainer
               sectionId="your-section"
               systemPrompt="You are an AI assistant specialized in..."
               placeholder="Ask about..."
               emptyStateMessage="Start a conversation about..."
             />
           </div>
         </div>
       </div>
     )
   }

   export default YourPage
   ```

2. **Add Route** (in your router configuration)
   ```typescript
   {
     path: '/brain/your-section',
     element: <YourPage />
   }
   ```

3. **Add Navigation** (in AppLayout or Brain navigation)

### Customizing System Prompts

Edit the `systemPrompt` prop in each brain page:

```typescript
<BrainChatContainer
  sectionId="principles"
  systemPrompt="Your custom system prompt here..."
  placeholder="Custom placeholder..."
  emptyStateMessage="Custom empty state..."
/>
```

### Changing AI Model

1. Open Settings
2. Select provider (OpenAI, Anthropic, etc.)
3. Select model from dropdown
4. Click Save

The ChatAgent will automatically use the selected model from StoreService.

## Troubleshooting

### No Response from AI

**Problem**: You send a message but nothing happens

**Solutions**:
1. Check if API key is configured (Settings → Model Settings)
2. Check browser console for errors (F12 → Console tab)
3. Verify internet connection
4. Check OpenAI API status

### API Key Error

**Problem**: "No API key configured" error

**Solutions**:
1. Go to Settings
2. Select OpenAI provider
3. Enter valid API key
4. Click Save
5. Try again

### Streaming Doesn't Work

**Problem**: Response appears all at once instead of streaming

**Solutions**:
1. Check if model supports streaming (most OpenAI models do)
2. Verify `streaming: true` in ChatAgent configuration
3. Check network latency

### Rate Limit Error

**Problem**: "Rate limit exceeded" error

**Solutions**:
1. Wait a few seconds
2. Try again
3. Consider upgrading your OpenAI plan
4. Use a different model with higher limits

### Conversation Context Lost

**Problem**: AI doesn't remember previous messages

**Solutions**:
1. Check that you're using the same chat session (didn't refresh)
2. Verify conversation history is being passed to ChatAgent
3. Check browser console for state management issues

## Advanced Features

### Using Custom Providers

You can configure multiple AI providers:

1. Go to Settings
2. Add API keys for different providers (OpenAI, Anthropic, etc.)
3. Switch between providers per brain section (requires code modification)

### Monitoring Token Usage

Currently not implemented, but you can:
1. Check OpenAI dashboard for usage
2. Add console logging in ChatAgent
3. Implement token counting in useLlmChat hook

### Persisting Conversations

Currently not implemented, but you can add:
1. LocalStorage persistence in useLlmChat
2. Workspace file storage via IPC
3. Database integration for multi-device sync

## Development

### Running in Dev Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck:web
```

### Debugging

1. Open DevTools (F12)
2. Set breakpoints in:
   - `useLlmChat.ts` (hook logic)
   - `BrainChatContainer.tsx` (component logic)
   - `ChatAgent.ts` (main process - requires remote debugging)

3. Monitor pipeline events:
   ```typescript
   window.api.onPipelineEvent((event) => {
     console.log('Pipeline event:', event)
   })
   ```

## API Reference

### BrainChatContainer Props

```typescript
interface BrainChatContainerProps {
  sectionId: string          // Unique identifier for the section
  systemPrompt?: string      // System prompt for the AI
  placeholder?: string       // Input placeholder text
  emptyStateMessage?: string // Message shown when no conversations
}
```

### useLlmChat Hook

```typescript
interface UseLlmChatOptions {
  sectionId: string
  systemPrompt?: string
  providerId?: string        // Default: 'openai'
  onError?: (error: Error) => void
}

interface UseLlmChatReturn {
  messages: Message[]        // Conversation history
  isLoading: boolean         // True when waiting for response
  isStreaming: boolean       // True when actively streaming tokens
  error: string | null       // Error message if any
  submit: (prompt: string) => Promise<void>  // Send message
  cancel: () => void         // Cancel current generation
  clear: () => void          // Clear conversation
}
```

### Message Type

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
```

## Contributing

To contribute improvements to brain pages:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions:
- Check the main README
- Review BRAIN_PAGES_FIX.md for technical details
- Open an issue on GitHub
- Contact the development team

## License

Same as the main Tesseract AI project.
