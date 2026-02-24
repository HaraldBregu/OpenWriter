/**
 * Tests for usePipeline hook.
 * Manages AI pipeline run/cancel lifecycle with streaming event handling
 * via the window.ai namespace (inference, cancel, onEvent).
 */
import { renderHook, act } from '@testing-library/react'
import { usePipeline } from '../../../../src/renderer/src/hooks/usePipeline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AiEventListener = (event: { type: string; data: unknown }) => void

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh set of window.ai mocks for a test.
 * Returns the mock object and a listener array for event emission.
 */
function createAiMock(inferenceImpl?: jest.Mock) {
  const listeners: AiEventListener[] = []

  const mockAi = {
    inference:
      inferenceImpl ??
      jest.fn().mockResolvedValue({ success: true, data: { runId: 'test-run-id' } }),
    cancel: jest.fn(),
    onEvent: jest.fn().mockImplementation((cb: AiEventListener) => {
      listeners.push(cb)
      return () => {
        const idx = listeners.indexOf(cb)
        if (idx > -1) listeners.splice(idx, 1)
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

  return { mockAi, listeners }
}

/** Emit an event to all currently registered listeners. */
function emitEvent(listeners: AiEventListener[], event: { type: string; data: unknown }) {
  ;[...listeners].forEach((l) => l(event))
}

/** Helper: start a run and wait for the hook to enter 'running' state. */
async function startRun(
  result: { current: ReturnType<typeof usePipeline> },
  agent = 'echo',
  prompt = 'test'
): Promise<string | null> {
  let runId: string | null = null
  await act(async () => {
    runId = await result.current.run(agent, { prompt })
  })
  return runId
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePipeline — initialization', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should initialize with idle status and empty response', () => {
    createAiMock()
    const { result } = renderHook(() => usePipeline())

    expect(result.current.status).toBe('idle')
    expect(result.current.response).toBe('')
    expect(result.current.error).toBeNull()
    expect(typeof result.current.run).toBe('function')
    expect(typeof result.current.cancel).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })
})

describe('usePipeline — run()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should start a pipeline run and return runId', async () => {
    createAiMock()
    const { result } = renderHook(() => usePipeline())

    const runId = await startRun(result)

    expect(runId).toBe('test-run-id')
    expect(window.ai.inference).toHaveBeenCalledWith('echo', { prompt: 'test' })
    expect(result.current.status).toBe('running')
    expect(result.current.response).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('should prevent concurrent runs (ref guard)', async () => {
    const { mockAi } = createAiMock(jest.fn().mockImplementation(() => new Promise(() => {})))
    const { result, unmount } = renderHook(() => usePipeline())

    act(() => { result.current.run('echo', { prompt: 'First' }) })
    const callsBefore = mockAi.inference.mock.calls.length

    await act(async () => {
      const secondRunId = await result.current.run('echo', { prompt: 'Second' })
      expect(secondRunId).toBeNull()
    })

    expect(mockAi.inference.mock.calls.length).toBe(callsBefore)
    unmount()
  })

  it('should handle missing window.ai gracefully', async () => {
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
    consoleWarnSpy.mockRestore()
  })

  it('should handle IPC error responses', async () => {
    createAiMock(
      jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      })
    )

    const { result } = renderHook(() => usePipeline())

    await act(async () => {
      const runId = await result.current.run('nonexistent', { prompt: 'test' })
      expect(runId).toBeNull()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Agent not found')
  })

  it('should handle IPC exceptions', async () => {
    createAiMock(jest.fn().mockRejectedValue(new Error('Network error')))

    const { result } = renderHook(() => usePipeline())

    await act(async () => {
      const runId = await result.current.run('echo', { prompt: 'test' })
      expect(runId).toBeNull()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Network error')
  })
})

describe('usePipeline — streaming events', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should accumulate token events into response', async () => {
    const { listeners } = createAiMock()
    const { result } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'test-run-id', token: 'Hello' } })
    })
    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'test-run-id', token: ' world' } })
    })

    expect(result.current.response).toBe('Hello world')
    expect(result.current.status).toBe('running')
  })

  it('should append thinking blocks to response', async () => {
    const { listeners } = createAiMock()
    const { result } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, {
        type: 'thinking',
        data: { runId: 'test-run-id', text: 'Processing input...' }
      })
    })

    expect(result.current.response).toBe('[thinking] Processing input...\n')
  })

  it('should finish with done status on done event', async () => {
    const { listeners } = createAiMock()
    const { result, unmount } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, { type: 'done', data: { runId: 'test-run-id' } })
    })

    expect(result.current.status).toBe('done')
    unmount()
  })

  it('should finish with error status on error event', async () => {
    const { listeners } = createAiMock()
    const { result, unmount } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, {
        type: 'error',
        data: { runId: 'test-run-id', message: 'Processing failed' }
      })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Processing failed')
    unmount()
  })

  it('should filter events by runId — ignore events from other runs', async () => {
    const { listeners } = createAiMock()
    const { result } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'different-run-id', token: 'Wrong' } })
    })
    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'test-run-id', token: 'Correct' } })
    })

    expect(result.current.response).toBe('Correct')
  })

  it('should buffer events that arrive before runId is set', async () => {
    let resolveInference!: (v: { success: boolean; data: { runId: string } }) => void
    const pendingInference = new Promise<{ success: boolean; data: { runId: string } }>(
      (resolve) => { resolveInference = resolve }
    )
    const { listeners } = createAiMock(jest.fn().mockReturnValue(pendingInference))
    const { result, unmount } = renderHook(() => usePipeline())

    // Start run inside act so the initial setStatus('running') is captured.
    // We do NOT await this act — instead we hold the promise so we can
    // interleave an event before inference resolves.
    let runResult: string | null = null
    const runActPromise = act(async () => {
      runResult = await result.current.run('echo', { prompt: 'test' })
    })

    // Emit a token before inference has responded — should be buffered by the hook
    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'test-run-id', token: 'Buffered' } })
    })

    // Now resolve inference — the hook will replay buffered events
    await act(async () => {
      resolveInference({ success: true, data: { runId: 'test-run-id' } })
    })

    // Wait for the run act to complete now that inference has resolved
    await runActPromise

    expect(runResult).toBe('test-run-id')
    expect(result.current.response).toBe('Buffered')
    unmount()
  })
})

describe('usePipeline — cancel()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should call window.ai.cancel and reset to idle', async () => {
    const { mockAi } = createAiMock()
    const { result } = renderHook(() => usePipeline())

    await startRun(result)
    expect(result.current.status).toBe('running')

    await act(async () => { result.current.cancel() })

    expect(mockAi.cancel).toHaveBeenCalledWith('test-run-id')
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('should do nothing if no active run', async () => {
    const { mockAi } = createAiMock()
    const { result } = renderHook(() => usePipeline())

    await act(async () => { result.current.cancel() })

    expect(mockAi.cancel).not.toHaveBeenCalled()
  })

  it('should still reset to idle even when window.ai.cancel is missing', async () => {
    const listeners: AiEventListener[] = []
    Object.defineProperty(window, 'ai', {
      value: {
        inference: jest.fn().mockResolvedValue({ success: true, data: { runId: 'test-run-id' } }),
        cancel: undefined,
        onEvent: jest.fn().mockImplementation((cb: AiEventListener) => {
          listeners.push(cb)
          return () => {
            const idx = listeners.indexOf(cb)
            if (idx > -1) listeners.splice(idx, 1)
          }
        }),
        listAgents: jest.fn(),
        listRuns: jest.fn()
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => { result.current.cancel() })

    expect(result.current.status).toBe('idle')
  })
})

describe('usePipeline — reset()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should reset status, response, and error when done', async () => {
    const { listeners } = createAiMock()
    const { result, unmount } = renderHook(() => usePipeline())
    await startRun(result)

    await act(async () => {
      emitEvent(listeners, { type: 'token', data: { runId: 'test-run-id', token: 'hello' } })
      emitEvent(listeners, { type: 'done', data: { runId: 'test-run-id' } })
    })

    expect(result.current.status).toBe('done')
    expect(result.current.response).toBe('hello')

    await act(async () => { result.current.reset() })

    expect(result.current.status).toBe('idle')
    expect(result.current.response).toBe('')
    expect(result.current.error).toBeNull()
    unmount()
  })

  it('should not reset when currently running', async () => {
    createAiMock(jest.fn().mockImplementation(() => new Promise(() => {})))
    const { result, unmount } = renderHook(() => usePipeline())

    act(() => { result.current.run('echo', { prompt: 'test' }) })

    await act(async () => { result.current.reset() })

    expect(result.current.status).toBe('running')
    unmount()
  })
})

describe('usePipeline — lifecycle', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })

  it('should cleanup event subscription on unmount', async () => {
    const { listeners } = createAiMock()
    const { result, unmount } = renderHook(() => usePipeline())
    await startRun(result)

    expect(listeners.length).toBeGreaterThan(0)

    unmount()

    expect(listeners.length).toBe(0)
  })
})
