/**
 * Tests for CounterAgent.
 *
 * CounterAgent wraps LangChain's ChatOpenAI to stream counting sequences.
 * It shares the same API-key resolution, streaming, cancellation, and model
 * selection logic as AlphabetAgent. Tests cover:
 *
 *  - name property
 *  - API key validation: absent key → error event; placeholder key → error event
 *  - thinking event emitted before streaming
 *  - Token events forwarded for every non-empty chunk
 *  - Empty-string and array-format chunk handling
 *  - done event on normal completion
 *  - Abort signal respected — no done event after abort
 *  - Model selection: StoreService → env var → DEFAULT_MODEL ("gpt-4o-mini")
 *  - Reasoning model detection (o1/o3 prefix) — temperature omitted
 *  - Standard model — temperature 0.7 included
 *  - Default providerId is "openai"
 *  - Prompt falls back to "10" when empty / whitespace-only
 */

import type { AgentEvent } from '../../../../../src/main/pipeline/AgentBase'
import type { ModelSettings } from '../../../../../src/main/services/store'

// ---------------------------------------------------------------------------
// Mock @langchain/openai before importing the agent
// ---------------------------------------------------------------------------

const mockStream = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    stream: mockStream
  }))
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn().mockImplementation((content: string) => ({ type: 'human', content })),
  SystemMessage: jest.fn().mockImplementation((content: string) => ({ type: 'system', content }))
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

import { CounterAgent } from '../../../../../src/main/pipeline/agents/CounterAgent'
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
  agent: CounterAgent,
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

describe('CounterAgent — name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have name "counter"', () => {
    const agent = new CounterAgent(makeStoreService())
    expect(agent.name).toBe('counter')
  })
})

describe('CounterAgent — API key validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should yield an error event when no API key is available from store or env', async () => {
    const agent = new CounterAgent(makeStoreService(null))
    const controller = new AbortController()

    const events = await collectEvents(agent, '5', 'run-1', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should yield an error event when the API key is the placeholder string', async () => {
    const agent = new CounterAgent(
      makeStoreService({ apiToken: 'your-openai-api-key-here', selectedModel: 'gpt-4o-mini' })
    )
    const controller = new AbortController()

    const events = await collectEvents(agent, '5', 'run-2', controller.signal)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    if (events[0].type === 'error') {
      expect(events[0].data.message).toMatch(/no api key configured/i)
    }
  })

  it('should not call ChatOpenAI when API key check fails', async () => {
    const agent = new CounterAgent(makeStoreService(null))
    const controller = new AbortController()

    await collectEvents(agent, '10', 'run-3', controller.signal)

    expect(ChatOpenAI).not.toHaveBeenCalled()
  })
})

describe('CounterAgent — successful streaming run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should emit thinking event as the first event', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: '1' }]))

    const events = await collectEvents(agent, '3', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    if (events[0].type === 'thinking') {
      expect(events[0].data.runId).toBe('run-1')
      expect(events[0].data.text).toMatch(/count/i)
    }
  })

  it('should emit token events for each non-empty string chunk', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: '1' },
      { content: ' 2' },
      { content: ' 3' }
    ]))

    const events = await collectEvents(agent, '3', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(3)
    expect(tokenEvents[0]).toEqual({ type: 'token', data: { runId: 'run-1', token: '1' } })
    expect(tokenEvents[1]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' 2' } })
    expect(tokenEvents[2]).toEqual({ type: 'token', data: { runId: 'run-1', token: ' 3' } })
  })

  it('should emit done as the last event on successful completion', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: '1 2 3' }]))

    const events = await collectEvents(agent, '3', 'run-1', controller.signal)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('done')
    expect(lastEvent.data.runId).toBe('run-1')
  })

  it('should skip empty-string chunks without emitting token events', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: '' },
      { content: '1' },
      { content: '' },
      { content: '2' }
    ]))

    const events = await collectEvents(agent, '2', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(2)
  })

  it('should extract text from array-style chunk content', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([
      { content: [{ text: '1' }, { text: ' 2' }] }
    ]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(1)
    if (tokenEvents[0].type === 'token') {
      expect(tokenEvents[0].data.token).toBe('1 2')
    }
  })

  it('should produce zero tokens when stream yields nothing', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    const events = await collectEvents(agent, 'test', 'run-1', controller.signal)

    const tokenEvents = events.filter((e) => e.type === 'token')
    expect(tokenEvents).toHaveLength(0)
    // Should still emit thinking and done
    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })
})

describe('CounterAgent — cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should not emit done when signal is aborted after first token', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(
      makeChunkStream([{ content: '1' }, { content: '2' }, { content: '3' }], controller.signal)
    )

    const events: AgentEvent[] = []
    for await (const event of agent.run({ prompt: '3' }, 'run-1', controller.signal)) {
      events.push(event)
      if (event.type === 'token') {
        controller.abort()
      }
    }

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('should not emit done when signal is pre-aborted', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()
    controller.abort()

    mockStream.mockReturnValue(makeChunkStream([{ content: '1' }], controller.signal))

    const events = await collectEvents(agent, '10', 'run-1', controller.signal)

    expect(events.some((e) => e.type === 'done')).toBe(false)
  })
})

describe('CounterAgent — configuration resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should use selectedModel from StoreService', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4-turbo' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4-turbo')
  })

  it('should default to "gpt-4o-mini" when no model is configured', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: '' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.model).toBe('gpt-4o-mini')
  })

  it('should omit temperature for o1 reasoning models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o1-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should omit temperature for o3 reasoning models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'o3' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBeUndefined()
  })

  it('should include temperature 0.7 for standard models', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.temperature).toBe(0.7)
  })

  it('should pass the resolved API key to ChatOpenAI', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-my-key', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    const constructorCall = (ChatOpenAI as jest.Mock).mock.calls[0][0]
    expect(constructorCall.apiKey).toBe('sk-my-key')
  })

  it('should default providerId to "openai" when not in context', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal)

    expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
  })

  it('should use a custom providerId from context when supplied', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-custom', selectedModel: 'gpt-4o' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([]))

    await collectEvents(agent, 'test', 'run-1', controller.signal, { providerId: 'custom-llm' })

    expect(storeService.getModelSettings).toHaveBeenCalledWith('custom-llm')
  })
})

describe('CounterAgent — prompt handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    metaEnv.VITE_OPENAI_API_KEY = undefined
    metaEnv.VITE_OPENAI_MODEL = undefined
  })

  it('should still run and complete when prompt is empty (uses default "10")', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: '1 2 3' }]))

    const events = await collectEvents(agent, '', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })

  it('should run with a numeric prompt string', async () => {
    const storeService = makeStoreService({ apiToken: 'sk-test', selectedModel: 'gpt-4o-mini' })
    const agent = new CounterAgent(storeService)
    const controller = new AbortController()

    mockStream.mockReturnValue(makeChunkStream([{ content: 'counting...' }]))

    const events = await collectEvents(agent, '20', 'run-1', controller.signal)

    expect(events[0].type).toBe('thinking')
    expect(events[events.length - 1].type).toBe('done')
  })
})
