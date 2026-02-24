/**
 * Tests for AIChatHandler.
 *
 * AIChatHandler uses LangChain's ChatOpenAI and import.meta.env for API key
 * resolution. Both are mocked at the module level so no real network traffic
 * is made.
 *
 * Covers:
 *  - type property equals 'ai-chat'
 *  - validate(): throws when prompt is missing or empty
 *  - validate(): passes for a valid prompt string
 *  - execute(): throws when no API key is available
 *  - execute(): throws the placeholder key guard
 *  - execute(): streams tokens via reporter.progress('token')
 *  - execute(): returns the accumulated content and tokenCount
 *  - execute(): propagates auth error with user-friendly message
 *  - execute(): propagates rate-limit error with user-friendly message
 *  - execute(): handles abort/cancel and throws 'Task cancelled'
 *  - execute(): respects a history of messages (user + assistant roles)
 *  - execute(): uses storeService.getModelSettings for API key + model
 *  - isReasoningModel: omits temperature for o1/o3 model families
 *  - extractTokenFromChunk: handles string, array-of-objects, and unknown shapes
 */

// ---------------------------------------------------------------------------
// Mock @langchain/openai BEFORE importing the handler
// ---------------------------------------------------------------------------

const mockStream = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    stream: mockStream
  }))
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn().mockImplementation((content: string) => ({ role: 'human', content })),
  AIMessage: jest.fn().mockImplementation((content: string) => ({ role: 'ai', content })),
  SystemMessage: jest.fn().mockImplementation((content: string) => ({ role: 'system', content }))
}))

// Stub import.meta.env (ts-jest compiles this as property access on a global)
const mockImportMetaEnv: Record<string, string | undefined> = {
  VITE_OPENAI_API_KEY: undefined,
  VITE_OPENAI_MODEL: undefined
}

jest.mock('../../../../../src/main/tasks/handlers/AIChatHandler', () => {
  const actual = jest.requireActual('../../../../../src/main/tasks/handlers/AIChatHandler')
  return actual
})

// Patch import.meta.env via the global object that ts-jest exposes
Object.defineProperty(global, 'import', {
  value: { meta: { env: mockImportMetaEnv } },
  writable: true,
  configurable: true
})

import { AIChatHandler } from '../../../../../src/main/tasks/handlers/AIChatHandler'
import type { AIChatInput } from '../../../../../src/main/tasks/handlers/AIChatHandler'
import type { ProgressReporter } from '../../../../../src/main/tasks/TaskHandler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoreService(
  overrides: { apiToken?: string; selectedModel?: string } = {}
) {
  return {
    getModelSettings: jest.fn().mockReturnValue({
      apiToken: overrides.apiToken ?? 'sk-test-key',
      selectedModel: overrides.selectedModel ?? 'gpt-4o-mini'
    })
  }
}

function makeReporter(): jest.Mocked<ProgressReporter> {
  return { progress: jest.fn() }
}

function makeAbortSignal(alreadyAborted = false): AbortSignal {
  const controller = new AbortController()
  if (alreadyAborted) controller.abort()
  return controller.signal
}

/** Build an async iterable that yields fake chunk objects. */
async function* makeChunkStream(tokens: string[]): AsyncIterable<{ content: string | unknown[] }> {
  for (const token of tokens) {
    yield { content: token }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AIChatHandler', () => {
  let handler: AIChatHandler
  let storeService: ReturnType<typeof makeStoreService>
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    storeService = makeStoreService()
    handler = new AIChatHandler(storeService as any)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Default mock: stream yields a single token and completes
    mockStream.mockResolvedValue(makeChunkStream(['Hello']))
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  // ---- type ----------------------------------------------------------------

  describe('type', () => {
    it('should have type "ai-chat"', () => {
      expect(handler.type).toBe('ai-chat')
    })
  })

  // ---- validate ------------------------------------------------------------

  describe('validate', () => {
    it('should throw when prompt is missing', () => {
      expect(() => handler.validate({} as AIChatInput)).toThrow(
        'Prompt is required and must be a non-empty string'
      )
    })

    it('should throw when prompt is an empty string', () => {
      expect(() => handler.validate({ prompt: '' })).toThrow(
        'Prompt is required and must be a non-empty string'
      )
    })

    it('should throw when prompt is not a string', () => {
      expect(() => handler.validate({ prompt: 123 as unknown as string })).toThrow(
        'Prompt is required and must be a non-empty string'
      )
    })

    it('should not throw for a valid non-empty prompt', () => {
      expect(() => handler.validate({ prompt: 'Hello AI' })).not.toThrow()
    })
  })

  // ---- execute — API key guard ---------------------------------------------

  describe('execute — API key guard', () => {
    it('should throw when storeService returns no apiToken and env key is undefined', async () => {
      storeService.getModelSettings.mockReturnValue({ apiToken: undefined, selectedModel: 'gpt-4o-mini' })
      handler = new AIChatHandler(storeService as any)

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow(/No API key configured/)
    })

    it('should throw for the placeholder API key', async () => {
      storeService.getModelSettings.mockReturnValue({
        apiToken: 'your-openai-api-key-here',
        selectedModel: 'gpt-4o-mini'
      })
      handler = new AIChatHandler(storeService as any)

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow(/No API key configured/)
    })
  })

  // ---- execute — happy path ------------------------------------------------

  describe('execute — happy path', () => {
    it('should return accumulated content and tokenCount', async () => {
      mockStream.mockResolvedValue(makeChunkStream(['Hello', ' ', 'World']))

      const result = await handler.execute(
        { prompt: 'Say hello' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(result.content).toBe('Hello World')
      expect(result.tokenCount).toBe(3)
    })

    it('should call reporter.progress with "connecting" before streaming', async () => {
      const reporter = makeReporter()
      mockStream.mockResolvedValue(makeChunkStream([]))

      await handler.execute({ prompt: 'hi' }, makeAbortSignal(), reporter)

      expect(reporter.progress).toHaveBeenCalledWith(0, 'connecting')
    })

    it('should call reporter.progress with "token" for each streamed chunk', async () => {
      const reporter = makeReporter()
      mockStream.mockResolvedValue(makeChunkStream(['A', 'B', 'C']))

      await handler.execute({ prompt: 'hi' }, makeAbortSignal(), reporter)

      const tokenCalls = reporter.progress.mock.calls.filter(
        (c: unknown[]) => c[1] === 'token'
      )
      expect(tokenCalls).toHaveLength(3)
      expect(tokenCalls[0][2]).toEqual({ token: 'A' })
      expect(tokenCalls[1][2]).toEqual({ token: 'B' })
      expect(tokenCalls[2][2]).toEqual({ token: 'C' })
    })

    it('should pass the AbortSignal to model.stream()', async () => {
      const signal = makeAbortSignal()
      await handler.execute({ prompt: 'hi' }, signal, makeReporter())

      expect(mockStream).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ signal })
      )
    })

    it('should use storeService.getModelSettings with the providerId', async () => {
      await handler.execute({ prompt: 'hi', providerId: 'anthropic' }, makeAbortSignal(), makeReporter())

      expect(storeService.getModelSettings).toHaveBeenCalledWith('anthropic')
    })

    it('should default to "openai" provider when no providerId is supplied', async () => {
      await handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())

      expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
    })

    it('should use the modelId from input when provided', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { prompt: 'hi', modelId: 'gpt-4-turbo' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4-turbo' })
      )
    })

    it('should handle empty stream (zero tokens) returning empty content', async () => {
      mockStream.mockResolvedValue(makeChunkStream([]))

      const result = await handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())

      expect(result.content).toBe('')
      expect(result.tokenCount).toBe(0)
    })

    it('should pass conversation history to the model', async () => {
      const { HumanMessage, AIMessage } = await import('@langchain/core/messages')

      const messages: AIChatInput['messages'] = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4' }
      ]

      await handler.execute(
        { prompt: 'And 3+3?', messages },
        makeAbortSignal(),
        makeReporter()
      )

      expect(HumanMessage).toHaveBeenCalledWith('What is 2+2?')
      expect(AIMessage).toHaveBeenCalledWith('4')
    })
  })

  // ---- execute — error handling --------------------------------------------

  describe('execute — error handling', () => {
    it('should throw "Task cancelled" for an AbortError', async () => {
      const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
      mockStream.mockRejectedValue(abortError)

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Task cancelled')
    })

    it('should throw "Task cancelled" for an error with "abort" in the message', async () => {
      mockStream.mockRejectedValue(new Error('Request was aborted by the client'))

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Task cancelled')
    })

    it('should throw auth error message for 401/unauthorized errors', async () => {
      mockStream.mockRejectedValue(new Error('401 Unauthorized: invalid api key'))

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Authentication failed. Please check your API key in Settings.')
    })

    it('should throw rate-limit message for 429 errors', async () => {
      mockStream.mockRejectedValue(new Error('429 Too Many Requests: rate limit exceeded'))

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Rate limit exceeded. Please wait a moment and try again.')
    })

    it('should throw generic OpenAI error message for unknown errors', async () => {
      mockStream.mockRejectedValue(new Error('Unexpected server error'))

      await expect(
        handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('OpenAI request failed: Unexpected server error')
    })

    it('should stop emitting tokens once signal is aborted mid-stream', async () => {
      const controller = new AbortController()

      async function* abortingStream(): AsyncIterable<{ content: string }> {
        yield { content: 'Token1' }
        // Abort the signal after the first token
        controller.abort()
        yield { content: 'Token2' }
        yield { content: 'Token3' }
      }

      mockStream.mockResolvedValue(abortingStream())
      const reporter = makeReporter()

      const result = await handler.execute({ prompt: 'hi' }, controller.signal, reporter)

      // Only Token1 should have been processed before abort
      expect(result.content).toBe('Token1')
    })
  })

  // ---- execute — reasoning model (no temperature) -------------------------

  describe('execute — reasoning model detection', () => {
    it('should omit temperature for o1 models', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { prompt: 'hi', modelId: 'o1-mini' },
        makeAbortSignal(),
        makeReporter()
      )

      const ctorArgs = (ChatOpenAI as jest.Mock).mock.calls.at(-1)?.[0] ?? {}
      expect(ctorArgs).not.toHaveProperty('temperature')
    })

    it('should include temperature for standard GPT models', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { prompt: 'hi', modelId: 'gpt-4o' },
        makeAbortSignal(),
        makeReporter()
      )

      const ctorArgs = (ChatOpenAI as jest.Mock).mock.calls.at(-1)?.[0] ?? {}
      expect(ctorArgs).toHaveProperty('temperature')
    })
  })

  // ---- execute — array-based chunk content ---------------------------------

  describe('execute — chunk content extraction', () => {
    it('should extract text from array-of-objects chunk content', async () => {
      async function* arrayChunkStream(): AsyncIterable<{ content: unknown }> {
        yield { content: [{ text: 'Hello' }, { text: ' World' }] }
      }

      mockStream.mockResolvedValue(arrayChunkStream())

      const result = await handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())

      expect(result.content).toBe('Hello World')
    })

    it('should ignore array items that lack a text property', async () => {
      async function* mixedArrayStream(): AsyncIterable<{ content: unknown }> {
        yield { content: [{ text: 'Good' }, { notText: 'Bad' }, { text: '!' }] }
      }

      mockStream.mockResolvedValue(mixedArrayStream())

      const result = await handler.execute({ prompt: 'hi' }, makeAbortSignal(), makeReporter())

      expect(result.content).toBe('Good!')
    })
  })
})
