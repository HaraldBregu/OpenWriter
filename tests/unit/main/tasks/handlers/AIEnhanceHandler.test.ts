/**
 * Tests for AIEnhanceHandler.
 *
 * AIEnhanceHandler streams text continuation tokens via LangChain ChatOpenAI.
 * The LangChain module and import.meta.env are mocked at the module level.
 *
 * Covers:
 *  - type property equals 'ai-enhance'
 *  - validate(): throws for missing/blank text
 *  - validate(): passes for a valid non-empty string
 *  - execute(): throws when no API key is configured
 *  - execute(): throws for the placeholder key
 *  - execute(): streams tokens via streamReporter.stream()
 *  - execute(): accumulates content and returns tokenCount
 *  - execute(): reports 'connecting' before streaming starts
 *  - execute(): uses storeService.getModelSettings for provider config
 *  - execute(): aborts stream on cancel and throws 'Task cancelled'
 *  - execute(): auth error → user-friendly message
 *  - execute(): rate-limit error → user-friendly message
 *  - execute(): generic error → OpenAI-prefixed message
 *  - buildContinuationPrompt: includes genre, tone, pov, wordCount, direction
 *  - isReasoningModel: omits temperature for o1/o3 model families
 */

// ---------------------------------------------------------------------------
// Mock @langchain/openai and @langchain/core/messages BEFORE importing handler
// ---------------------------------------------------------------------------

const mockStream = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    stream: mockStream
  }))
}))

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn().mockImplementation((content: string) => ({ role: 'human', content })),
  SystemMessage: jest.fn().mockImplementation((content: string) => ({ role: 'system', content }))
}))

import { AIEnhanceHandler } from '../../../../../src/main/tasks/handlers/AIEnhanceHandler'
import type { AIEnhanceInput } from '../../../../../src/main/tasks/handlers/AIEnhanceHandler'
import type { ProgressReporter, StreamReporter } from '../../../../../src/main/tasks/TaskHandler'

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

function makeStreamReporter(): jest.Mocked<StreamReporter> {
  return { stream: jest.fn() }
}

function makeAbortSignal(alreadyAborted = false): AbortSignal {
  const controller = new AbortController()
  if (alreadyAborted) controller.abort()
  return controller.signal
}

async function* makeChunkStream(tokens: string[]): AsyncIterable<{ content: string }> {
  for (const token of tokens) {
    yield { content: token }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AIEnhanceHandler', () => {
  let handler: AIEnhanceHandler
  let storeService: ReturnType<typeof makeStoreService>
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    storeService = makeStoreService()
    handler = new AIEnhanceHandler(storeService as any)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    mockStream.mockResolvedValue(makeChunkStream(['continuation text']))
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  // ---- type ----------------------------------------------------------------

  describe('type', () => {
    it('should have type "ai-enhance"', () => {
      expect(handler.type).toBe('ai-enhance')
    })
  })

  // ---- validate ------------------------------------------------------------

  describe('validate', () => {
    it('should throw when text is missing', () => {
      expect(() => handler.validate({} as AIEnhanceInput)).toThrow(
        'Text is required and must be a non-empty string'
      )
    })

    it('should throw when text is an empty string', () => {
      expect(() => handler.validate({ text: '' })).toThrow(
        'Text is required and must be a non-empty string'
      )
    })

    it('should throw when text is whitespace only', () => {
      expect(() => handler.validate({ text: '   ' })).toThrow(
        'Text is required and must be a non-empty string'
      )
    })

    it('should throw when text is not a string', () => {
      expect(() => handler.validate({ text: 42 as unknown as string })).toThrow(
        'Text is required and must be a non-empty string'
      )
    })

    it('should not throw for a valid non-empty text', () => {
      expect(() => handler.validate({ text: 'Once upon a time...' })).not.toThrow()
    })
  })

  // ---- execute — API key guard ---------------------------------------------

  describe('execute — API key guard', () => {
    it('should throw when storeService returns no apiToken', async () => {
      storeService.getModelSettings.mockReturnValue({ apiToken: undefined, selectedModel: 'gpt-4o-mini' })
      handler = new AIEnhanceHandler(storeService as any)

      await expect(
        handler.execute({ text: 'Sample text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow(/No API key configured/)
    })

    it('should throw for the placeholder API key', async () => {
      storeService.getModelSettings.mockReturnValue({
        apiToken: 'your-openai-api-key-here',
        selectedModel: 'gpt-4o-mini'
      })
      handler = new AIEnhanceHandler(storeService as any)

      await expect(
        handler.execute({ text: 'Sample text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow(/No API key configured/)
    })
  })

  // ---- execute — happy path ------------------------------------------------

  describe('execute — happy path', () => {
    it('should return accumulated content and tokenCount', async () => {
      mockStream.mockResolvedValue(makeChunkStream(['The', ' sky', ' is', ' blue.']))

      const result = await handler.execute(
        { text: 'Once upon a time' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(result.content).toBe('The sky is blue.')
      expect(result.tokenCount).toBe(4)
    })

    it('should call reporter.progress("connecting") before streaming', async () => {
      const reporter = makeReporter()
      mockStream.mockResolvedValue(makeChunkStream([]))

      await handler.execute({ text: 'Intro' }, makeAbortSignal(), reporter)

      expect(reporter.progress).toHaveBeenCalledWith(0, 'connecting')
    })

    it('should call streamReporter.stream for each streamed chunk', async () => {
      const reporter = makeReporter()
      const streamReporter = makeStreamReporter()
      mockStream.mockResolvedValue(makeChunkStream(['One', 'Two', 'Three']))

      await handler.execute({ text: 'Start' }, makeAbortSignal(), reporter, streamReporter)

      expect(streamReporter.stream).toHaveBeenCalledTimes(3)
      expect(streamReporter.stream).toHaveBeenNthCalledWith(1, 'One')
      expect(streamReporter.stream).toHaveBeenNthCalledWith(2, 'Two')
      expect(streamReporter.stream).toHaveBeenNthCalledWith(3, 'Three')
    })

    it('should pass the AbortSignal to model.stream()', async () => {
      const signal = makeAbortSignal()

      await handler.execute({ text: 'Some text' }, signal, makeReporter())

      expect(mockStream).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ signal })
      )
    })

    it('should default to "openai" provider when no providerId is supplied', async () => {
      await handler.execute({ text: 'Some text' }, makeAbortSignal(), makeReporter())

      expect(storeService.getModelSettings).toHaveBeenCalledWith('openai')
    })

    it('should use the supplied providerId', async () => {
      await handler.execute(
        { text: 'Some text', providerId: 'anthropic' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(storeService.getModelSettings).toHaveBeenCalledWith('anthropic')
    })

    it('should use the modelId from input when provided', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { text: 'text', modelId: 'gpt-4-turbo' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4-turbo' })
      )
    })

    it('should handle empty stream returning empty content', async () => {
      mockStream.mockResolvedValue(makeChunkStream([]))

      const result = await handler.execute(
        { text: 'Some text' },
        makeAbortSignal(),
        makeReporter()
      )

      expect(result.content).toBe('')
      expect(result.tokenCount).toBe(0)
    })
  })

  // ---- execute — prompt building ------------------------------------------

  describe('execute — continuation prompt construction', () => {
    it('should include genre in the prompt when supplied', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')

      await handler.execute(
        { text: 'The detective stood alone.', genre: 'noir thriller' },
        makeAbortSignal(),
        makeReporter()
      )

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain('noir thriller')
    })

    it('should include tone in the prompt when supplied', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')

      await handler.execute(
        { text: 'The rain fell.', tone: 'melancholic' },
        makeAbortSignal(),
        makeReporter()
      )

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain('melancholic')
    })

    it('should include pov in the prompt when supplied', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')

      await handler.execute(
        { text: 'She walked in.', pov: 'first-person' },
        makeAbortSignal(),
        makeReporter()
      )

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain('first-person')
    })

    it('should include wordCount in the prompt when supplied', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')

      await handler.execute(
        { text: 'He ran.', wordCount: 200 },
        makeAbortSignal(),
        makeReporter()
      )

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain('200')
    })

    it('should include direction in the prompt when supplied', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')

      await handler.execute(
        { text: 'The story begins.', direction: 'reveal a hidden secret' },
        makeAbortSignal(),
        makeReporter()
      )

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain('reveal a hidden secret')
    })

    it('should always include the source text in the prompt', async () => {
      const { HumanMessage } = await import('@langchain/core/messages')
      const TEXT = 'Once upon a midnight dreary'

      await handler.execute({ text: TEXT }, makeAbortSignal(), makeReporter())

      const promptArg = (HumanMessage as jest.Mock).mock.calls.at(-1)?.[0] ?? ''
      expect(promptArg).toContain(TEXT)
    })
  })

  // ---- execute — error handling --------------------------------------------

  describe('execute — error handling', () => {
    it('should throw "Task cancelled" for an AbortError', async () => {
      mockStream.mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' })
      )

      await expect(
        handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Task cancelled')
    })

    it('should throw "Task cancelled" when error message contains "cancel"', async () => {
      mockStream.mockRejectedValue(new Error('Request was cancelled'))

      await expect(
        handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Task cancelled')
    })

    it('should throw auth message for 401/unauthorized errors', async () => {
      mockStream.mockRejectedValue(new Error('401 invalid api key'))

      await expect(
        handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Authentication failed. Please check your API key in Settings.')
    })

    it('should throw rate-limit message for 429 errors', async () => {
      mockStream.mockRejectedValue(new Error('429 rate limit exceeded'))

      await expect(
        handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('Rate limit exceeded. Please wait a moment and try again.')
    })

    it('should throw generic OpenAI error for unknown errors', async () => {
      mockStream.mockRejectedValue(new Error('Internal server error'))

      await expect(
        handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())
      ).rejects.toThrow('OpenAI request failed: Internal server error')
    })

    it('should stop processing tokens once the signal is aborted mid-stream', async () => {
      const controller = new AbortController()

      async function* abortingStream(): AsyncIterable<{ content: string }> {
        yield { content: 'First' }
        controller.abort()
        yield { content: 'Second' }
        yield { content: 'Third' }
      }

      mockStream.mockResolvedValue(abortingStream())

      const result = await handler.execute({ text: 'text' }, controller.signal, makeReporter(), makeStreamReporter())

      expect(result.content).toBe('First')
    })
  })

  // ---- isReasoningModel ----------------------------------------------------

  describe('reasoning model detection', () => {
    it('should omit temperature for o1-mini model', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { text: 'text', modelId: 'o1-mini' },
        makeAbortSignal(),
        makeReporter()
      )

      const ctorArgs = (ChatOpenAI as jest.Mock).mock.calls.at(-1)?.[0] ?? {}
      expect(ctorArgs).not.toHaveProperty('temperature')
    })

    it('should omit temperature for o3-mini model', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { text: 'text', modelId: 'o3-mini' },
        makeAbortSignal(),
        makeReporter()
      )

      const ctorArgs = (ChatOpenAI as jest.Mock).mock.calls.at(-1)?.[0] ?? {}
      expect(ctorArgs).not.toHaveProperty('temperature')
    })

    it('should include temperature 0.7 for gpt-4o model', async () => {
      const { ChatOpenAI } = await import('@langchain/openai')

      await handler.execute(
        { text: 'text', modelId: 'gpt-4o' },
        makeAbortSignal(),
        makeReporter()
      )

      const ctorArgs = (ChatOpenAI as jest.Mock).mock.calls.at(-1)?.[0] ?? {}
      expect(ctorArgs.temperature).toBe(0.7)
    })
  })

  // ---- array-based chunk content ------------------------------------------

  describe('chunk content extraction', () => {
    it('should extract text from array-of-objects chunk content', async () => {
      async function* arrayChunkStream(): AsyncIterable<{ content: unknown }> {
        yield { content: [{ text: 'Part' }, { text: ' one' }] }
      }

      mockStream.mockResolvedValue(arrayChunkStream())

      const result = await handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())

      expect(result.content).toBe('Part one')
    })

    it('should skip array items without a text property', async () => {
      async function* mixedStream(): AsyncIterable<{ content: unknown }> {
        yield { content: [{ text: 'Keep' }, { other: 'skip' }, { text: '!' }] }
      }

      mockStream.mockResolvedValue(mixedStream())

      const result = await handler.execute({ text: 'text' }, makeAbortSignal(), makeReporter())

      expect(result.content).toBe('Keep!')
    })
  })
})
