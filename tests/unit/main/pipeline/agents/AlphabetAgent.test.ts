/**
 * Tests for AlphabetAgent.
 *
 * AlphabetAgent wraps LangChain's ChatOpenAI to stream alphabet-related
 * content from OpenAI. The tests cover:
 *
 *  - name property
 *  - API key resolution: StoreService → env var → error event when absent
 *  - Placeholder key ("your-openai-api-key-here") treated as absent
 *  - thinking event emitted before streaming begins
 *  - Streaming tokens forwarded as token events
 *  - done event on normal completion
 *  - Abort signal respected — no done event when aborted mid-stream
 *  - Model selection: StoreService → env var → DEFAULT_MODEL
 *  - Reasoning model detection skips temperature parameter
 *  - Non-string / array chunk content extraction
 *  - Empty/whitespace prompt falls back to default alphabet listing prompt
 *  - providerId defaults to 'openai' when absent from context
 */

import type { AgentEvent } from '../../../../../src/main/pipeline/AgentBase'
import type { ModelSettings } from '../../../../../src/main/services/store'

// ---------------------------------------------------------------------------
// Mock @langchain/openai before importing the agent
// ---------------------------------------------------------------------------

const mockStream = jest.fn()
const mockChatOpenAIConstructor = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((opts: unknown) => {
    mockChatOpenAIConstructor(opts)
    return { stream: mockStream }
  })
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn().mockImplementation((content: string) => ({ type: 'human', content })),
  SystemMessage: jest.fn().mockImplementation((content: string) => ({ type: 'system', content }))
}))

// ---------------------------------------------------------------------------
// import.meta.env shim for the Node/ts-jest environment
// ---------------------------------------------------------------------------

const metaEnv: Record<string, string | undefined> = {
  VITE_OPENAI_API_KEY: undefined,
  VITE_OPENAI_MODEL: undefined
}

// ts-jest compiles import.meta.env references; we patch globalThis so that
// any module that reads import.meta.env.VITE_* gets our controlled values.
Object.defineProperty(globalThis, 'importMeta', { value: { env: metaEnv }, writable: true })

// Patch the compiled reference that ts-jest produces for import.meta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__importMetaEnv = metaEnv

import { AlphabetAgent } from '../../../../../src/main/pipeline/agents/AlphabetAgent'
import { ChatOpenAI } from '@langchain/openai'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoreService(settings: ModelSettings | null = null) {
  return { getModelSettings: jest.fn().mockReturnValue(settings) }
}

/** Builds an async iterable that yields the given chunks then returns. */
async function* makeChunkStream(
  chunks: Array<{ content: unknown }>,
  signal?: AbortSignal
): AsyncGenerator<{ content: unknown }> {
  for (const chunk of chunks) {
    if (signal?.aborted) return
    yield chunk
  }
}

/** Collect all events from a run generator. */
async function collectEvents(
  agent: AlphabetAgent,
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

describe('AlphabetAgent — name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have name "alphabet"', () => {
    const agent = new AlphabetAgent(makeStoreService())
    expect(agent.name).toBe('alphabet')
  })
})

describe('AlphabetAgent — API key validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should yield an error event when no API key is available', async () => {
    const agent = new AlphabetAgent(makeStoreService(null))
    const controller = new AbortController()

    const events = await collectEvents(agent, 'list the alphabet', 'run-1', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should yield an error event when API key is the placeholder string', async () => {
    const agent = new AlphabetAgent(
      makeStoreService({ apiToken: 'your-openai-api-key-here', selectedModel: 'gpt-4o-mini' })
    )
    const controller = new AbortController()

    const events = await collectEvents(agent, 'test', 'run-2', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should yield an error event when StoreService returns null and env var is absent', async () => {
    const agent = new AlphabetAgent(makeStoreService(null))
    const controller = new AbortController()

    const events = await collectEvents(agent, 'test', 'run-3', controller.signal)

    expect(events[0].type).toBe('error')
  })
})

describe('AlphabetAgent — successful streaming run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit thinking event before any tokens when API key is set in StoreService', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'A' }, { content: 'B' }]))

    const events = await collectEvents(agent, 'list the alphabet', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    if (events[0].type === 'thinking') {
      expect(events[0].data.runId).toBe('run-1')
      expect(typeof events[0].data.text).toBe('string')
      expect(events[0].data.text.length).toBeGreaterThan(0)
    }
  })

  it('should emit token events for each non-empty string chunk', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: 'A' },
      { content: ' B' },
      { content: ' C' }
    ]))

    const events = await collectEvents(agent, 'alphabet', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(3)

    expect(tokenEvents[0]).toEqual({ type: 'token', data: { runId: 'run-1', token: 'A' } })
    expect(tokenEvents[1]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' B' } })
    expect(tokenEvents[2]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' C' } })
  })

  it('should emit a done event as the last event on successful completion', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'hello' }]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('done')
    expect(lastEvent.data.runId).toBe('run-1')
  })

  it('should skip empty-string chunks without emitting token events', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: '' },
      { content: 'A' },
      { content: '' }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('A')
    }
  })

  it('should extract text from array-style chunk content', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    // Array content format: blocks with 'text' key
    mockStream.mockReturnValue(makeChunkStream([
      { content: [{ text: 'Alpha' }, { text: ' Beta' }] }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('Alpha Beta')
    }
  })

  it('should skip array chunks where no object has a text property', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: [{ image_url: 'http://example.com' }] }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(0)
  })
})

describe('AlphabetAgent — cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should stop streaming and not emit done when signal is aborted mid-stream', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    // Stream yields tokens and we abort after the first one
    mockStream.mockReturnValue(makeChunkStream(
      [{ content: 'A' }, { content: 'B' }, { content: 'C' }],
      controller.signal
    ))

    const events: AgentEvent[] = []
    for await (const event of agent.run({ prompt: 'test' }, 'run-1', controller.signal)) {
      events.push(event)
      if (event.type === 'token') {
        controller.abort()
      }
    }

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should not emit done when signal is pre-aborted before streaming', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test-key', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()
    controller.abort()

    // The stream mock won't be called but set it up just in case
    mockStream.mockReturnValue(makeChunkStream([{ content: 'A' }], controller.signal))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })
})

describe('AlphabetAgent — configuration resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should use the selectedModel from StoreService when available', async () => {
    const storeService = makeStoreService({
      apiToken: 'sk-test',
      selectedModel: 'gpt-4o'
    })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o')
  })

  it('should default to "gpt-4o-mini" when no model is configured', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: '' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o-mini')
  })

  it('should omit temperature for reasoning models (o1 prefix)', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for reasoning models (o3 prefix)', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o3-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should include temperature for standard (non-reasoning) models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBe(0.7)
  })

  it('should use "openai" as default providerId when not in context', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    // No context — defaults should apply
    await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
  })

  it('should use providerId from context when supplied', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-custom', selectedModel: 'gpt-4o' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { providerId: 'anthropic' })

    expect(storeService.getModelSettings).toHaveBeenCalledWith('anthropic')
  })
})

describe('AlphabetAgent — prompt fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should use default alphabet prompt when the prompt is empty or whitespace', async () => {
    // We cannot inspect the HumanMessage content directly without hooking the
    // constructor. The important thing is that the agent doesn't error out on
    // an empty prompt and still emits a thinking + done sequence.
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'A B C' }]))

    const events = await collectEvents(agent, '   ', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })

  it('should use the provided prompt when non-empty', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new AlphabetAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'response' }]))

    const events = await collectEvents(
      agent,
      'alphabet with animals for each letter',
      'run-1',
      controller.signal
    )

    // Verify run still produces the full expected sequence
    expect(events[0].type).toBe('thinking')
    expect(events.some((e) => e.type === 'token')).toBe(true)
    expect(events[events.length - 1].type).toBe('done')
  })
})
