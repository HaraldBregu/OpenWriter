/**
 * Tests for usePipeline hook.
 * Manages pipeline run/cancel lifecycle with streaming event handling.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePipeline } from '../../../../src/renderer/src/hooks/usePipeline'

describe('usePipeline', () => {
  let pipelineEventListeners: Array<(event: { type: string; data: unknown }) => void> = []

  beforeEach(() => {
    pipelineEventListeners = []

    // Ensure window.api exists and has the required methods
    if (!window.api.pipelineRun) {
      window.api.pipelineRun = jest.fn()
    }
    if (!window.api.pipelineCancel) {
      window.api.pipelineCancel = jest.fn()
    }
    if (!window.api.onPipelineEvent) {
      window.api.onPipelineEvent = jest.fn()
    }

    // Mock window.api.pipelineRun
    ;(window.api.pipelineRun as jest.Mock).mockResolvedValue({
      success: true,
      data: { runId: 'test-run-id' }
    })

    // Mock window.api.onPipelineEvent
    ;(window.api.onPipelineEvent as jest.Mock).mockImplementation((callback) => {
      pipelineEventListeners.push(callback)
      return () => {
        const index = pipelineEventListeners.indexOf(callback)
        if (index > -1) {
          pipelineEventListeners.splice(index, 1)
        }
      }
    })

    // Mock window.api.pipelineCancel
    ;(window.api.pipelineCancel as jest.Mock).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    pipelineEventListeners = []
    jest.clearAllMocks()
  })

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
      expect(window.api.pipelineRun).toHaveBeenCalledWith('echo', { prompt: 'Hello world' })
      expect(result.current.status).toBe('running')
      expect(result.current.response).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('should prevent concurrent runs (ref guard)', async () => {
      // Make pipelineRun hang
      ;(window.api.pipelineRun as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // never resolves
      )

      const { result } = renderHook(() => usePipeline())

      // Start first run (won't complete)
      act(() => {
        result.current.run('echo', { prompt: 'First' })
      })

      // Attempt second run immediately
      const callsBefore = (window.api.pipelineRun as jest.Mock).mock.calls.length

      await act(async () => {
        const runId = await result.current.run('echo', { prompt: 'Second' })
        expect(runId).toBeNull()
      })

      // Should still have just the one call
      expect((window.api.pipelineRun as jest.Mock).mock.calls.length).toBe(callsBefore)
    })

    it('should handle missing window.api.pipelineRun gracefully', async () => {
      const originalPipelineRun = window.api.pipelineRun
      // @ts-expect-error - intentionally removing function for test
      delete window.api.pipelineRun

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        const runId = await result.current.run('echo', { prompt: 'test' })
        expect(runId).toBeNull()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toContain('Pipeline IPC not available')
      expect(consoleWarnSpy).toHaveBeenCalled()

      // Restore
      window.api.pipelineRun = originalPipelineRun
      consoleWarnSpy.mockRestore()
    })

    it('should handle IPC error responses', async () => {
      ;(window.api.pipelineRun as jest.Mock).mockResolvedValue({
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
      ;(window.api.pipelineRun as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

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

      // Emit token events
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'test-run-id', token: 'Hello' } })
        })
      })

      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'test-run-id', token: ' world' } })
        })
      })

      expect(result.current.response).toBe('Hello world')
      expect(result.current.status).toBe('running')
    })

    it('should append thinking blocks to response', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit thinking event
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({
            type: 'thinking',
            data: { runId: 'test-run-id', text: 'Processing input...' }
          })
        })
      })

      expect(result.current.response).toBe('[thinking] Processing input...\n')
      expect(result.current.status).toBe('running')
    })

    it('should finish with done status on done event', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit done event
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'done', data: { runId: 'test-run-id' } })
        })
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

      // Emit error event
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({
            type: 'error',
            data: { runId: 'test-run-id', message: 'Processing failed' }
          })
        })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Processing failed')
      })
    })

    it('should filter events by runId', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit event with wrong runId
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'different-run-id', token: 'Wrong' } })
        })
      })

      // Emit event with correct runId
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'test-run-id', token: 'Correct' } })
        })
      })

      expect(result.current.response).toBe('Correct')
    })

    it('should buffer events that arrive before runId is set', async () => {
      let resolveRun: (value: { success: boolean; data: { runId: string } }) => void

      ;(window.api.pipelineRun as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRun = resolve
          })
      )

      const { result } = renderHook(() => usePipeline())

      // Start run (won't resolve immediately)
      const runPromise = act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit events before runId is resolved
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'test-run-id', token: 'Buffered' } })
        })
      })

      // Now resolve the run
      await act(async () => {
        resolveRun!({ success: true, data: { runId: 'test-run-id' } })
        await runPromise
      })

      // Buffered event should have been processed
      expect(result.current.response).toBe('Buffered')
    })
  })

  describe('cancel', () => {
    it('should call pipelineCancel and reset to idle', async () => {
      const { result } = renderHook(() => usePipeline())

      // Start a run
      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      expect(result.current.status).toBe('running')

      // Cancel it
      act(() => {
        result.current.cancel()
      })

      expect(window.api.pipelineCancel).toHaveBeenCalledWith('test-run-id')
      expect(result.current.status).toBe('idle')
      expect(result.current.error).toBeNull()
    })

    it('should do nothing if no active run', () => {
      const { result } = renderHook(() => usePipeline())

      act(() => {
        result.current.cancel()
      })

      expect(window.api.pipelineCancel).not.toHaveBeenCalled()
    })

    it('should handle missing pipelineCancel gracefully', async () => {
      const originalPipelineCancel = window.api.pipelineCancel
      // @ts-expect-error - intentionally removing function for test
      delete window.api.pipelineCancel

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
      window.api.pipelineCancel = originalPipelineCancel
    })
  })

  describe('reset', () => {
    it('should reset status, response, and error when idle', async () => {
      const { result } = renderHook(() => usePipeline())

      await act(async () => {
        await result.current.run('echo', { prompt: 'test' })
      })

      // Emit some tokens and complete
      await act(async () => {
        pipelineEventListeners.forEach((listener) => {
          listener({ type: 'token', data: { runId: 'test-run-id', token: 'test' } })
          listener({ type: 'done', data: { runId: 'test-run-id' } })
        })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })

      expect(result.current.response).toBe('test')

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.response).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('should not reset when currently running', async () => {
      ;(window.api.pipelineRun as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // never resolves
      )

      const { result } = renderHook(() => usePipeline())

      // Start a run that won't complete
      act(() => {
        result.current.run('echo', { prompt: 'test' })
      })

      // Try to reset while running
      act(() => {
        result.current.reset()
      })

      // Should still be running
      expect(result.current.status).toBe('running')
    })
  })

  it('should cleanup subscription on unmount', async () => {
    const { result, unmount } = renderHook(() => usePipeline())

    await act(async () => {
      await result.current.run('echo', { prompt: 'test' })
    })

    expect(pipelineEventListeners.length).toBeGreaterThan(0)

    unmount()

    expect(pipelineEventListeners.length).toBe(0)
  })
})
