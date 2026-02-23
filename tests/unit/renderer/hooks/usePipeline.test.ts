/**
 * Tests for usePipeline hook.
 * Manages AI pipeline run/cancel lifecycle with streaming event handling
 * via the window.ai namespace (inference, cancel, onEvent).
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePipeline } from '../../../../src/renderer/src/hooks/usePipeline'

// window.ai mock helpers
type AiEventListener = (event: { type: string; data: unknown }) => void

function installWindowAiMock() {
  const eventListeners: AiEventListener[] = []

  const mockAi = {
    inference: jest.fn().mockResolvedValue({ success: true, data: { runId: 'test-run-id' } }),
    cancel: jest.fn(),
    onEvent: jest.fn().mockImplementation((cb: AiEventListener) => {
      eventListeners.push(cb)
      return () => {
        const idx = eventListeners.indexOf(cb)
        if (idx > -1) eventListeners.splice(idx, 1)
      }
    }),
    listAgents: jest.fn().mockResolvedValue({ success: true, data: ['echo'] }),
    listRuns: jest.fn().mockResolvedValue({ success: true, data: [] })
  }

  Object.defineProperty(window, 'ai', {
    value: mockAi,
    writable: true,
    configurable: true
  })

  return { mockAi, eventListeners }
}

describe('usePipeline', () => {
  let mockAi: ReturnType<typeof installWindowAiMock>['mockAi']
  let eventListeners: AiEventListener[]

  beforeEach(() => {
    const installed = installWindowAiMock()
    mockAi = installed.mockAi
    eventListeners = installed.eventListeners
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Helper: fire an event to all registered listeners
  function emitEvent(event: { type: string; data: unknown }) {
    eventListeners.forEach((l) => l(event))
  }

  it('should initialize with idle status and empty response', () => {
    const { result } = renderHook(() => usePipeline())

    expect(result.current.status).toBe('idle')
    expect(result.current.response).toBe('')
    expect(result.current.error).toBeNull()
    expect(typeof result.current.run).toBe('function')
    expect(typeof result.current.cancel).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  describe('run', () => {
    it('should start a pipeline run and return runId', async () => {
      const { result } = renderHook(() => usePipeline())

      let runId: string | null = null
      await act(async () => {
        runId = await result.current.run('echo', { prompt: 'Hello world' })
      })

      expect(runId).toBe('test-run-id')
      expect(mockAi.inference).toHaveBeenCalledWith('echo', { prompt: 'Hello world' })
      expect(result.current.status).toBe('running')
      expect(result.current.response).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('should prevent concurrent runs (ref guard)', async () => {
      // Make inference hang so the first run never completes
      mockAi.inference.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => usePipeline())

      // Start first run (won't complete)
      act(() => {
        result.current.run('echo', { prompt: 'First' })
      })

      const callsBefore = (mockAi.inference as jest.Mock).mock.calls.length

      // Second run should be rejected (returns null)
      await act(async () => {
        const secondRunId = await result.current.run('echo', { prompt: 'Second' })
        expect(secondRunId).toBeNull()
      })

      // Only the first call should have reached inference
      expect((mockAi.inference as jest.Mock).mock.calls.length).toBe(callsBefore)
    })

    it('should handle missing window.ai gracefully', async () => {
      // Remove the ai namespace to simulate unavailability
      const originalAi = (window as unknown as { ai: unknown }).ai
      Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        const runId = await result.current.run('echo', { prompt: 'test' })
        expect(runId).toBeNull()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toContain('not available')
      expect(consoleWarnSpy).toHaveBeenCalled()

      // Restore
      Object.defineProperty(window, 'ai', { value: originalAi, writable: true, configurable: true })
      consoleWarnSpy.mockRestore()
    })

    it('should handle IPC error responses', async () => {
      mockAi.inference.mockResolvedValue({
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      })

      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        const runId = await result.current.run('nonexistent', { prompt: 'test' })
        expect(runId).toBeNull()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Agent not found')
    })

    it('should handle IPC exceptions', async () => {
      mockAi.inference.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        const runId = await result.current.run('echo', { prompt: 'test' })
        expect(runId).toBeNull()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })

    it('should accumulate token events into response', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        emitEvent({ type: 'token', data: { runId: 'test-run-id', token: 'Hello' } })
      })

      await act(async () => {
        emitEvent({ type: 'token', data: { runId: 'test-run-id', token: ' world' } })
      })

      expect(result.current.response).toBe('Hello world')
      expect(result.current.status).toBe('running')
    })

    it('should append thinking blocks to response', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        emitEvent({ type: 'thinking', data: { runId: 'test-run-id', text: 'Processing input...' } })
      })

      expect(result.current.response).toBe('[thinking] Processing input...\n')
      expect(result.current.status).toBe('running')
    })

    it('should finish with done status on done event', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        emitEvent({ type: 'done', data: { runId: 'test-run-id' } })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })
    })

    it('should finish with error status on error event', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        emitEvent({ type: 'error', data: { runId: 'test-run-id', message: 'Processing failed' } })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Processing failed')
      })
    })

    it('should filter events by runId — ignore events from other runs', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        // Wrong runId — should be ignored
        emitEvent({ type: 'token', data: { runId: 'different-run-id', token: 'Wrong' } })
      })

      await act(async () => {
        // Correct runId — should be accepted
        emitEvent({ type: 'token', data: { runId: 'test-run-id', token: 'Correct' } })
      })

      expect(result.current.response).toBe('Correct')
    })

    it('should buffer events that arrive before runId is set', async () => {
      let resolveInference!: (value: { success: boolean; data: { runId: string } }) => void

      mockAi.inference.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInference = resolve
          })
      )

      const { result } = renderHook(() => usePipeline())

      // Start run (won't resolve immediately)
      const runPromise = act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit events before runId is known — these should be buffered
      await act(async () => {
        emitEvent({ type: 'token', data: { runId: 'test-run-id', token: 'Buffered' } })
      })

      // Now resolve the inference call
      await act(async () => {
        resolveInference({ success: true, data: { runId: 'test-run-id' } })
        await runPromise
      })

      // Buffered event should have been processed after runId was set
      expect(result.current.response).toBe('Buffered')
    })
  })

  describe('cancel', () => {
    it('should call window.ai.cancel and reset to idle', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      expect(result.current.status).toBe('running')

      act(() => {
        result.current.cancel()
      })

      expect(mockAi.cancel).toHaveBeenCalledWith('test-run-id')
      expect(result.current.status).toBe('idle')
      expect(result.current.error).toBeNull()
    })

    it('should do nothing if no active run', () => {
      const { result } = renderHook(() => usePipeline())

      act(() => {
        result.current.cancel()
      })

      expect(mockAi.cancel).not.toHaveBeenCalled()
    })

    it('should still reset to idle even when window.ai.cancel is missing', async () => {
      // Remove cancel to test graceful fallback
      const originalCancel = mockAi.cancel
      Object.defineProperty(window, 'ai', {
        value: { ...mockAi, cancel: undefined },
        writable: true,
        configurable: true
      })

      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Should not throw
      act(() => {
        result.current.cancel()
      })

      expect(result.current.status).toBe('idle')

      // Restore
      Object.defineProperty(window, 'ai', { value: mockAi, writable: true, configurable: true })
      mockAi.cancel = originalCancel
    })
  })

  describe('reset', () => {
    it('should reset status, response, and error when done', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      await act(async () => {
        emitEvent({ type: 'token', data: { runId: 'test-run-id', token: 'test' } })
        emitEvent({ type: 'done', data: { runId: 'test-run-id' } })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })

      expect(result.current.response).toBe('test')

      act(() => {
        result.current.reset()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.response).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('should not reset when currently running', async () => {
      mockAi.inference.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => usePipeline())

      // Start a run that will never complete
      act(() => {
        result.current.run('echo', { prompt: 'test' })
      })

      // Try to reset while running — should be a no-op
      act(() => {
        result.current.reset()
      })

      expect(result.current.status).toBe('running')
    })
  })

  it('should cleanup event subscription on unmount', async () => {
    const { result, unmount } = renderHook(() => usePipeline())

    await act(async () => {
      await result.current.run('echo', { prompt: 'test' })
    })

    expect(eventListeners.length).toBeGreaterThan(0)

    unmount()

    expect(eventListeners.length).toBe(0)
  })
})
