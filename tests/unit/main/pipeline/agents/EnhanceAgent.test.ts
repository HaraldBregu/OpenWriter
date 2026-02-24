/**
 * Tests for EnhanceAgent.
 *
 * EnhanceAgent is a single-shot writing improvement agent. It shares the same
 * OpenAI provider / key resolution and streaming logic as ChatAgent but differs
 * in these ways:
 *
 *  - name is "enhance"
 *  - Fixed temperature 0.3 (not configurable from context)
 *  - No conversation history — each run is standalone
 *  - Uses a strict SYSTEM_PROMPT focused on grammar and clarity
 *  - context.modelId overrides the model; no context.temperature or context.messages
 *
 * Test coverage:
 *  - name property
 *  - API key validation (store → env → error; placeholder → error)
 *  - thinking event ("Enhancing text...")
 *  - Token events for string and array chunk formats
 *  - Empty chunk skipping
 *  - done event on success; no done on abort
 *  - Cancellation (mid-stream abort and pre-abort)
 *  - Model priority: context.modelId → StoreService → DEFAULT_MODEL
 *  - Fixed temperature 0.3 for standard models
 *  - Temperature omitted for reasoning models (o1/o3 prefixes)
 *  - classifyError: abort → silent; 401/unauthorized → auth message;
 *    429/rate limit → rate_limit message; other → generic message
 *  - Single-shot (no history messages built)
 *  - providerId defaults to "openai"; custom value respected
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
const mockSystemMessage = jest.fn().mockImplementation((content: string) => ({
  type: 'system',
  content
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: mockHumanMessage,
  SystemMessage: mockSystemMessage
}))

// ---------------------------------------------------------------------------
// import.meta.env shim for the Node/ts-jest environment.
//
// ts-jest compiles import.meta.env references into property accesses on the
// global `import` object. Defining it here allows the agent source to read
// controlled values in tests without hitting a SyntaxError.
// ---------------------------------------------------------------------------

const metaEnv: Record<string, string | undefined> = {
  VITE_OPENAI_API_KEY: undefined,
  VITE_OPENAI_MODEL: undefined
}

Object.defineProperty(global, 'import', {
  value: { meta: { env: metaEnv } },
  writable: true,
  configurable: true
})

import { EnhanceAgent } from '../../../../../src/main/pipeline/agents/EnhanceAgent'
import { ChatOpenAI } from '@langchain/openai'

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
  agent: EnhanceAgent,
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

describe('EnhanceAgent — name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have name "enhance"', () => {
    const agent = new EnhanceAgent(makeStoreService())
    expect(agent.name).toBe('enhance')
  })
})

describe('EnhanceAgent — API key validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should yield an error event when no API key is available', async () => {
    const agent = new EnhanceAgent(makeStoreService(null))
    const controller = new AbortController()

    const events = await collectEvents(agent, 'Fix this text.', 'run-1', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should yield an error event when the key is the placeholder string', async () => {
    const agent = new EnhanceAgent(
      makeStoreService({ apiToken: 'your-openai-api-key-here', selectedModel: 'gpt-4o-mini' })
    )
    const controller = new AbortController()

    const events = await collectEvents(agent, 'Fix this.', 'run-2', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should not instantiate ChatOpenAI when key validation fails', async () => {
    const agent = new EnhanceAgent(makeStoreService(null))
    const controller = new AbortController()

    await collectEvents(agent, 'Fix this.', 'run-3', controller.signal)

    expect(ChatOpenAI).not.toHaveBeenCalled()
  })
})

describe('EnhanceAgent — successful streaming run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit thinking event ("Enhancing text...") before tokens', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    const events = await collectEvents(agent, 'Some text.', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    if (events[0].type === 'thinking') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.text).toMatch(/enhancing/i)
    }
  })

  it('should emit token events for each non-empty string chunk', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([
      { content: 'Better' },
      { content: ' text' },
      { content: ' here.' }
    ]))

    const events = await collectEvents(agent, 'Beter txt here.', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(3)
    expect(tokenEvents[0]).toEqual({ type: 'token', data: { runId: 'run-1', token: 'Better' } })
    expect(tokenEvents[1]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' text' } })
    expect(tokenEvents[2]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' here.' } })
  })

  it('should emit done as the last event on successful completion', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([{ content: 'Improved.' }]))

    const events = await collectEvents(agent, 'Imroved.', 'run-1', controller.signal)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('done')
    expect(lastEvent.data.runId).toBe('run-1')
  })

  it('should skip empty-string chunks without emitting token events', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([
      { content: '' },
      { content: 'Fixed.' },
      { content: '' }
    ]))

    const events = await collectEvents(agent, 'Fxied.', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('Fixed.')
    }
  })

  it('should extract text from array-style chunk content blocks', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([
      { content: [{ text: 'Well' }, { text: ' written.' }] }
    ]))

    const events = await collectEvents(agent, 'Well writen.', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('Well written.')
    }
  })

  it('should skip array chunks where no block has a text property', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([
      { content: [{ image_url: 'http://example.com' }] }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(0)
  })

  it('should complete with no tokens when the stream is empty', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.filter((e) => e.type === 'token')).toHaveLength(0)
    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })
})

describe('EnhanceAgent — cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should not emit done when signal is aborted after first token', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(
      makeChunkStream([{ content: 'A' }, { content: 'B' }], controller.signal)
    )

    const events: AgentEvent[] = []
    for await (const event of agent.run({ prompt: 'fix this' }, 'run-1', controller.signal)) {
      events.push(event)
      if (event.type === 'token') {
        controller.abort()
      }
    }

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should not emit done when signal is pre-aborted', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()
    controller.abort()

    mockStream.mockResolvedValue(makeChunkStream([{ content: 'A' }], controller.signal))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should handle AbortError thrown by stream without yielding an error event', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    // Use a plain Error with name 'AbortError' — matches the classifyError
    // pattern: name.toLowerCase() === 'aborterror'. DOMException may not have
    // the same name property shape in the Node.js test environment.
    const abortError = new Error('AbortError')
    abortError.name = 'AbortError'
    mockStream.mockRejectedValue(abortError)

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('EnhanceAgent — error classification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit auth error for 401 response errors', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Status 401 unauthorized'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/authentication failed/i)
    }
  })

  it('should emit auth error for "invalid api key" messages', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Invalid API key provided'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/authentication failed/i)
    }
  })

  it('should emit rate limit error for 429 responses', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Error 429: rate limit exceeded'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/rate limit exceeded/i)
    }
  })

  it('should emit generic error for unclassified exceptions', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue(new Error('Connection reset by peer'))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/openai request failed/i)
      expect(errorEvent.data.message).toContain('Connection reset by peer')
    }
  })

  it('should emit generic error for non-Error thrown values', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockRejectedValue('bare string error')

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.data.message).toMatch(/openai request failed/i)
    }
  })

  it('should handle abort-named errors silently (no error event)', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    const err = new Error('Task was cancelled')
    err.name = 'AbortError'
    mockStream.mockRejectedValue(err)

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('EnhanceAgent — configuration resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should use context.modelId when provided', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { modelId: 'gpt-4-turbo' })

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4-turbo')
  })

  it('should use StoreService selectedModel when context.modelId is absent', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o')
  })

  it('should fall back to "gpt-4o-mini" when no model is configured anywhere', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: '' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o-mini')
  })

  it('should always use temperature 0.3 (fixed) for standard models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBe(0.3)
  })

  it('should omit temperature for o1 reasoning models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for o3-mini reasoning models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o3-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for o1-preview reasoning model', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1-preview' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should pass the resolved API key to ChatOpenAI', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-my-enhance-key', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.apiKey).toBe('sk-my-enhance-key')
  })

  it('should default providerId to "openai"', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
  })

  it('should use providerId from context when supplied', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { providerId: 'azure-openai' })

    expect(storeService.getModelSettings).toHaveBeenCalledWith('azure-openai')
  })
})

describe('EnhanceAgent — single-shot behaviour (no conversation history)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should build exactly two messages: system prompt + user prompt', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'Fix this sentence.', 'run-1', controller.signal)

    expect(mockSystemMessage).toHaveBeenCalledTimes(1)
    expect(mockHumanMessage).toHaveBeenCalledTimes(1)
    expect(mockHumanMessage).toHaveBeenCalledWith('Fix this sentence.')
  })

  it('should use the built-in SYSTEM_PROMPT (writing editor instructions)', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const systemPromptArg: string = mockSystemMessage.mock.calls[0][0]
    expect(systemPromptArg).toMatch(/grammar/i)
    expect(systemPromptArg).toMatch(/improve/i)
  })

  it('should include the full user prompt in the HumanMessage', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new EnhanceAgent(storeService)
    const controller = new AbortController()

    mockStream.mockResolvedValue(makeChunkStream([]))

    const userText = 'This is a paragraph that needs to be enhanced for clarity and grammar.'
    await collectEvents(agent, userText, 'run-1', controller.signal)

    expect(mockHumanMessage).toHaveBeenCalledWith(userText)
  })
})
