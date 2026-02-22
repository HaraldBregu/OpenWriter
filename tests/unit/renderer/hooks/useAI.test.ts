/**
 * Tests for useAI hook.
 * Manages AI inference with streaming responses.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAI } from '../../../../src/renderer/src/hooks/useAI'

// Mock window.ai
const mockInference = jest.fn()
const mockCancel = jest.fn()
const mockOnEvent = jest.fn()

beforeAll(() => {
  global.window.ai = {
    inference: mockInference,
    cancel: mockCancel,
    onEvent: mockOnEvent,
    listAgents: jest.fn(),
    listRuns: jest.fn()
  } as any
})

describe('useAI', () => {
  let eventCallback: ((event: any) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    eventCallback = null

    // Capture the event callback
    mockOnEvent.mockImplementation((cb) => {
      eventCallback = cb
      return jest.fn() // unsubscribe function
    })
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.latestResponse).toBe('')
  })

  it('should submit a prompt and handle streaming', async () => {
    mockInference.mockResolvedValue({
      success: true,
      data: { runId: 'run-123' }
    })

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    // Submit a prompt
    await act(async () => {
      await result.current.submit('Hello AI')
    })

    expect(mockInference).toHaveBeenCalledWith('chat', {
      prompt: 'Hello AI',
      context: {
        sessionId: 'test-session',
        providerId: 'openai',
        messages: [
          {
            role: 'user',
            content: 'Hello AI'
          }
        ],
        systemPrompt: undefined
      }
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello AI')
  })

  it('should handle token events and update latestResponse', async () => {
    mockInference.mockResolvedValue({
      success: true,
      data: { runId: 'run-123' }
    })

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    await act(async () => {
      await result.current.submit('Hello')
    })

    // Simulate token events
    act(() => {
      eventCallback?.({
        type: 'token',
        data: { runId: 'run-123', token: 'Hello' }
      })
    })

    expect(result.current.isStreaming).toBe(true)
    expect(result.current.latestResponse).toBe('Hello')

    act(() => {
      eventCallback?.({
        type: 'token',
        data: { runId: 'run-123', token: ' World' }
      })
    })

    expect(result.current.latestResponse).toBe('Hello World')
  })

  it('should handle done event and finalize message', async () => {
    mockInference.mockResolvedValue({
      success: true,
      data: { runId: 'run-123' }
    })

    const onStreamComplete = jest.fn()

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai',
        onStreamComplete
      })
    )

    await act(async () => {
      await result.current.submit('Test')
    })

    act(() => {
      eventCallback?.({
        type: 'token',
        data: { runId: 'run-123', token: 'Response' }
      })
    })

    act(() => {
      eventCallback?.({
        type: 'done',
        data: { runId: 'run-123' }
      })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
    expect(onStreamComplete).toHaveBeenCalledWith('Response')
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('Response')
  })

  it('should handle error events', async () => {
    mockInference.mockResolvedValue({
      success: true,
      data: { runId: 'run-123' }
    })

    const onError = jest.fn()

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai',
        onError
      })
    )

    await act(async () => {
      await result.current.submit('Test')
    })

    act(() => {
      eventCallback?.({
        type: 'error',
        data: { runId: 'run-123', message: 'AI Error' }
      })
    })

    expect(result.current.error).toBe('AI Error')
    expect(result.current.isLoading).toBe(false)
    expect(onError).toHaveBeenCalledWith(new Error('AI Error'))
  })

  it('should cancel inference', async () => {
    mockInference.mockResolvedValue({
      success: true,
      data: { runId: 'run-123' }
    })

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    await act(async () => {
      await result.current.submit('Test')
    })

    act(() => {
      result.current.cancel()
    })

    expect(mockCancel).toHaveBeenCalledWith('run-123')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
  })

  it('should clear messages', async () => {
    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    await act(async () => {
      await result.current.submit('Test')
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.latestResponse).toBe('')
  })

  it('should handle race condition with early token arrival', async () => {
    let resolveInference: any
    const inferencePromise = new Promise((resolve) => {
      resolveInference = resolve
    })
    mockInference.mockReturnValue(inferencePromise)

    const { result } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    // Start submit (doesn't resolve yet)
    act(() => {
      result.current.submit('Test')
    })

    // Token arrives before promise resolves
    act(() => {
      eventCallback?.({
        type: 'token',
        data: { runId: 'run-123', token: 'Early token' }
      })
    })

    // Should handle the early token by setting runId
    expect(result.current.latestResponse).toBe('Early token')

    // Now resolve the inference
    await act(async () => {
      resolveInference({
        success: true,
        data: { runId: 'run-123' }
      })
    })
  })

  it('should cleanup event listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnEvent.mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() =>
      useAI({
        sessionId: 'test-session',
        providerId: 'openai'
      })
    )

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
