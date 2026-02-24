/**
 * Tests for ChatAgent.
 *
 * ChatAgent streams OpenAI responses via LangChain, yielding AgentEvents.
 * It has more configuration surface than the other agents:
 *
 *  - name property
 *  - API key validation (store → env → error; placeholder key → error)
 *  - thinking event before streaming
 *  - Token forwarding for string and array chunk formats
 *  - Empty chunk skipping
 *  - done event on success; no done on abort
 *  - Cancellation via AbortSignal (in-stream abort and pre-abort)
 *  - Model priority: context.modelId → StoreService → VITE_OPENAI_MODEL → gpt-4o-mini
 *  - Temperature: context.temperature → 0.7 default; reasoning models skip it
 *  - maxTokens: from context (0/absent → unlimited; positive value → passed through)
 *  - systemPrompt: from context or DEFAULT_SYSTEM_PROMPT
 *  - Conversation history: messages array mapped to HumanMessage / AIMessage
 *  - Error classification:
 *    - AbortError → silent return (no error event)
 *    - 401 / unauthorized → auth error message
 *    - 429 / rate limit → rate_limit error message
 *    - Other → generic "OpenAI request failed" message
 *  - isReasoningModel helper via REASONING_MODEL_PREFIXES
 */

import type { AgentEvent } from '../../../../../src/main/pipeline/AgentBase'
import type { ModelSettings } from '../../../../../src/main/services/store'

// ---------------------------------------------------------------------------
// Mock LangChain before importing the agent
// ---------------------------------------------------------------------------

const mockStream = jest.fn()
const mockChatOpenAIConstructor = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((opts: unknown) => {
    mockChatOpenAIConstructor(opts)
    return { stream: mockStream }
  })
}))

const mockHumanMessage = jest.fn().mockImplementation((content: string) => ({
  type: 'human',
  content
}))
const mockAIMessage = jest.fn().mockImplementation((content: string) => ({
  type: 'ai',
  content
}))
const mockSystemMessage = jest.fn().mockImplementation((content: string) => ({
  type: 'system',
  content
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: mockHumanMessage,
  AIMessage: mockAIMessage,
  SystemMessage: mockSystemMessage
}))

// ---------------------------------------------------------------------------
// import.meta.env shim
// ---------------------------------------------------------------------------

const metaEnv: Record<string, string | undefined> = {
  VITE_OPENAI_API_KEY: undefined,
  VITE_OPENAI_MODEL: undefined
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__importMetaEnv = metaEnv

import { ChatAgent } from '../../../../../src/main/pipeline/agents/ChatAgent'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoreService(settings: ModelSettings | null = null) {
  return { getModelSettings: jest.fn().mockReturnValue(settings) }
}

async function* makeChunkStream(
  chunks: Array<{ content: unknown }>,
  signal?: AbortSignal
): AsyncGenerator<{ content: unknown }> {
  for (const chunk of chunks) {
    if (signal?.aborted) return
    yield chunk
  }
}

async function collectEvents(
  agent: ChatAgent,
  prompt: string,
  runId: string,
  signal: AbortSignal,
  context?: Record<string, unknown>
): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  for await (const event of agent.run({ prompt, context }, runId, signal)) {
    events.push(event)
  }
  return events
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatAgent — name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have name "chat"', () => {
    const agent = new ChatAgent(makeStoreService())
    expect(agent.name).toBe('chat')
  })
})

describe('ChatAgent — API key validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should yield an error event when neither store nor env has an API key', async () => {
    const agent = new ChatAgent(makeStoreService(null))
    const controller = new AbortController()

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should yield an error event when the key is the placeholder value', async () => {
    const agent = new ChatAgent(
      makeStoreService({ apiToken: 'your-openai-api-key-here', selectedModel: 'gpt-4o-mini' })
    )
    const controller = new AbortController()

    const events = await collectEvents(agent, 'hello', 'run-2', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should not instantiate ChatOpenAI when key validation fails', async () => {
    const agent = new ChatAgent(makeStoreService(null))
    const controller = new AbortController()

    await collectEvents(agent, 'hello', 'run-3', controller.signal)

    expect(ChatOpenAI).not.toHaveBeenCalled()
  })
})

describe('ChatAgent — successful streaming run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit thinking event as the first event', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    if (events[0].type === 'thinking') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.text).toMatch(/connecting/i)
    }
  })

  it('should emit token events for each non-empty string chunk', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: 'Hello' },
      { content: ', ' },
      { content: 'world!' }
    ]))

    const events = await collectEvents(agent, 'greet me', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(3)
    expect(tokenEvents[0]).toEqual({ type: 'token', data: { runId: 'run-1', token: 'Hello' } })
    expect(tokenEvents[1]).toEqual({ type: 'token', data: { runId: 'run-1', token: ', ' } })
    expect(tokenEvents[2]).toEqual({ type: 'token', data: { runId: 'run-1', token: 'world!' } })
  })

  it('should emit done as the last event on successful completion', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'hi' }]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('done')
    expect(lastEvent.data.runId).toBe('run-1')
  })

  it('should skip empty-string chunks without emitting tokens', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: '' },
      { content: 'hi' },
      { content: '' }
    ]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('hi')
    }
  })

  it('should extract text from array-style chunk content blocks', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: [{ text: 'part1' }, { text: ' part2' }] }
    ]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('part1 part2')
    }
  })

  it('should skip array chunks where no block has a text property', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: [{ image_url: 'http://example.com' }] }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(0)
  })

  it('should produce no tokens and still complete when stream is empty', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal)

    expect(events.filter((e) => e.type === 'token')).toHaveLength(0)
    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })
})

describe('ChatAgent — cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should not emit done when signal is aborted after the first token', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(
      makeChunkStream([{ content: 'A' }, { content: 'B' }, { content: 'C' }], controller.signal)
    )

    const events: AgentEvent[] = []
    for await (const event of agent.run({ prompt: 'test' }, 'run-1', controller.signal)) {
      events.push(event)
      if (event.type === 'token') {
        controller.abort()
      }
    }

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should not emit done when signal is pre-aborted', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()
    controller.abort()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'hello' }], controller.signal))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should handle AbortError thrown by stream without yielding an error event', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    const abortError = new DOMException('AbortError', 'AbortError')
    mockStream.mockRejectedValue(abortError)

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    // Abort errors should be handled silently — no error event
    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('ChatAgent — error classification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit auth error for 401 response errors', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Request failed with status 401 unauthorized'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/authentication failed/i)
    }
  })

  it('should emit auth error for "invalid api key" errors', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Invalid API key provided'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/authentication failed/i)
    }
  })

  it('should emit rate_limit error for 429 responses', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Error 429: Too Many Requests rate limit exceeded'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/rate limit exceeded/i)
    }
  })

  it('should emit a generic error for unknown errors', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Network timeout'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/openai request failed/i)
      expect(errorEvent.data.message).toContain('Network timeout')
    }
  })

  it('should emit a generic error for non-Error thrown values', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue('a plain string error')

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/openai request failed/i)
    }
  })

  it('should not emit an error event for abort-named errors', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    const err = new Error('Operation cancelled by user')
    err.name = 'AbortError'
    mockStream.mockRejectedValue(err)

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('ChatAgent — configuration resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should prioritise context.modelId over StoreService selectedModel', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { modelId: 'gpt-4-turbo' })

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4-turbo')
  })

  it('should use StoreService selectedModel when context.modelId is absent', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o')
  })

  it('should fall back to "gpt-4o-mini" when no model is anywhere configured', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: '' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o-mini')
  })

  it('should use temperature from context.temperature when provided', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { temperature: 0.2 })

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBe(0.2)
  })

  it('should use default temperature 0.7 when not in context', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBe(0.7)
  })

  it('should omit temperature for o1 reasoning model prefix', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for the exact "o1" model name', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for o3-mini reasoning model', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o3-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should NOT treat "o1x-custom" as a reasoning model (false-positive guard)', async () => {
    // "o1x" does not match any exact prefix — should get temperature
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1x-custom' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeDefined()
  })

  it('should pass maxTokens to ChatOpenAI when context.maxTokens is a positive number', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { maxTokens: 500 })

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.maxTokens).toBe(500)
  })

  it('should not pass maxTokens when context.maxTokens is 0 (unlimited)', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { maxTokens: 0 })

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.maxTokens).toBeUndefined()
  })

  it('should not pass maxTokens when it is absent from context', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.maxTokens).toBeUndefined()
  })

  it('should default providerId to "openai"', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
  })

  it('should use providerId from context when supplied', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { providerId: 'azure' })

    expect(storeService.getModelSettings).toHaveBeenCalledWith('azure')
  })
})

describe('ChatAgent — conversation history and system prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should build messages with a system prompt, history, and the user prompt', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'What is TypeScript?', 'run-1', controller.signal, {
      systemPrompt: 'You are a TypeScript expert.',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' }
      ]
    })

    // SystemMessage should have been called with the custom system prompt
    expect(mockSystemMessage).toHaveBeenCalledWith('You are a TypeScript expert.')

    // History messages should map user → HumanMessage, assistant → AIMessage
    expect(mockHumanMessage).toHaveBeenCalledWith('Hi')
    expect(mockAIMessage).toHaveBeenCalledWith('Hello!')

    // The current user prompt should also produce a HumanMessage
    expect(mockHumanMessage).toHaveBeenCalledWith('What is TypeScript?')
  })

  it('should use DEFAULT_SYSTEM_PROMPT when no systemPrompt is in context', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'hello', 'run-1', controller.signal)

    // The default system prompt matches the constant in the source
    expect(mockSystemMessage).toHaveBeenCalledWith('You are a helpful AI assistant.')
  })

  it('should handle an empty history array without error', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'answer' }]))

    const events = await collectEvents(agent, 'hello', 'run-1', controller.signal, {
      messages: []
    })

    expect(events[events.length - 1].type).toBe('done')
    // Only the current user prompt should generate a HumanMessage (system + user = 2 calls)
    expect(mockHumanMessage).toHaveBeenCalledTimes(1)
    expect(mockHumanMessage).toHaveBeenCalledWith('hello')
  })

  it('should map only user messages to HumanMessage in history', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'follow-up', 'run-1', controller.signal, {
      messages: [{ role: 'user', content: 'first question' }]
    })

    expect(mockHumanMessage).toHaveBeenCalledWith('first question')
    expect(mockAIMessage).not.toHaveBeenCalledWith('first question')
  })

  it('should map assistant messages to AIMessage in history', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new ChatAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'follow-up', 'run-1', controller.signal, {
      messages: [{ role: 'assistant', content: 'previous answer' }]
    })

    expect(mockAIMessage).toHaveBeenCalledWith('previous answer')
    expect(mockHumanMessage).not.toHaveBeenCalledWith('previous answer')
  })
})
