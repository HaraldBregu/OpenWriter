import { useState, useCallback, useRef, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStatus = 'idle' | 'running' | 'done' | 'error'

export interface PipelineInput {
  prompt: string
  context?: Record<string, unknown>
}

export interface UsePipelineReturn {
  /** Start a pipeline run for the named agent. Returns the runId on success. */
  run: (agentName: string, input: PipelineInput) => Promise<string | null>
  /** Cancel the active run, if any. */
  cancel: () => void
  /** Accumulated response text — tokens + thinking blocks streamed so far. */
  response: string
  /** Current run lifecycle status. */
  status: PipelineStatus
  /** Error message when status === 'error', null otherwise. */
  error: string | null
  /** Reset the hook back to idle, clearing response and error. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePipeline — local-state hook for consuming AI agent streaming events
 * from the Electron main process via window.ai.
 *
 * Responsibilities:
 *  - Starts a named pipeline run and tracks its lifecycle (idle → running → done/error)
 *  - Accumulates streamed tokens and thinking blocks into a single `response` string
 *  - Filters all events by runId so concurrent runs on other hook instances never
 *    bleed into this one
 *  - Cleans up the IPC event listener on component unmount (no leaks)
 *  - Gracefully no-ops when window.ai.inference is not yet wired up in the
 *    main process (safe to use before the backend is implemented)
 *
 * Usage:
 *   const { run, cancel, response, status, error } = usePipeline()
 *   await run('echo', { prompt: 'Hello world' })
 */
export function usePipeline(): UsePipelineReturn {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [response, setResponse] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Synchronous ref guard — prevents a second run() call from sneaking in
  // between the setState('running') call and the next render flush.
  const runningRef = useRef(false)

  // Stable reference to the active runId. We use a ref (not state) because
  // incoming event filtering must always read the *current* value — a stale
  // closure over state would miss events from the latest run.
  const currentRunIdRef = useRef<string | null>(null)

  // Holds the IPC unsubscribe function so we can call it from cancel() or
  // from the useEffect cleanup on unmount without needing it in state.
  const unsubRef = useRef<(() => void) | null>(null)

  // Tears down the active subscription and resets the running guard.
  // Does NOT touch status/response/error — callers do that.
  const cleanupSubscription = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    runningRef.current = false
    currentRunIdRef.current = null
  }, [])

  // Ensure we never leak the IPC listener if the component unmounts mid-run.
  useEffect(() => {
    return () => {
      cleanupSubscription()
    }
  }, [cleanupSubscription])

  const run = useCallback(
    async (agentName: string, input: PipelineInput): Promise<string | null> => {
      // Guard: only one active run per hook instance at a time.
      if (runningRef.current) return null

      // Graceful fallback: AI inference API not yet available in the main process.
      if (typeof window.ai?.inference !== 'function') {
        console.warn(
          '[usePipeline] window.ai.inference is not available. ' +
            'The main-process AI IPC handlers have not been registered yet.'
        )
        setStatus('error')
        setError('AI inference IPC not available. Check main process registration.')
        return null
      }

      // Clean up any leftover subscription from a previous run (e.g. if the
      // previous run finished but reset() was never called between runs).
      cleanupSubscription()

      runningRef.current = true
      setStatus('running')
      setResponse('')
      setError(null)

      // Called when the run concludes — either naturally or via error.
      // Cleans up first, then applies the final status so the component
      // renders the correct terminal state in a single flush.
      const finish = (terminalStatus: 'done' | 'error', errMessage?: string): void => {
        cleanupSubscription()
        if (terminalStatus === 'error') {
          setError(errMessage ?? 'Unknown pipeline error')
        }
        setStatus(terminalStatus)
      }

      // Process a single pipeline event — shared by both buffered replay and
      // real-time handling below.
      const processEvent = (event: { type: string; data: unknown }): void => {
        const d = event.data as Record<string, unknown>
        switch (event.type) {
          case 'token':
            setResponse((prev) => prev + (d.token as string))
            break
          case 'thinking':
            setResponse((prev) => prev + `[thinking] ${d.text as string}\n`)
            break
          case 'done':
            finish('done')
            break
          case 'error':
            finish('error', d.message as string)
            break
        }
      }

      // IMPORTANT: Subscribe to events BEFORE starting the run to avoid a race
      // condition. The main process can emit events (thinking, error, tokens)
      // before the IPC invoke response reaches the renderer. Events that arrive
      // before we know our runId are buffered and replayed once the runId is set.
      let resolvedRunId: string | null = null
      const bufferedEvents: Array<{ type: string; data: unknown }> = []

      const unsub = window.ai.onEvent((event) => {
        const d = event.data as Record<string, unknown>

        if (resolvedRunId === null) {
          // RunId not yet known — buffer the event for later replay.
          bufferedEvents.push(event)
          return
        }

        // Strict runId filtering — ignore events from any other concurrent run.
        if (d.runId !== resolvedRunId) return
        processEvent(event)
      })

      unsubRef.current = unsub

      // Now start the run — events may already be arriving into the buffer.
      let runId: string

      try {
        const result = await window.ai.inference(agentName, input)
        // inference returns an IpcResult envelope from wrapIpcHandler
        if (!result.success) {
          cleanupSubscription()
          runningRef.current = false
          setStatus('error')
          setError(result.error.message)
          return null
        }
        runId = result.data.runId
      } catch (err) {
        cleanupSubscription()
        const message = err instanceof Error ? err.message : 'Failed to start AI inference'
        runningRef.current = false
        setStatus('error')
        setError(message)
        return null
      }

      // Now we know the runId — set it so future events are processed in real-time,
      // then replay any buffered events that belong to this run.
      resolvedRunId = runId
      currentRunIdRef.current = runId

      for (const event of bufferedEvents) {
        const d = event.data as Record<string, unknown>
        if (d.runId === runId) {
          processEvent(event)
        }
      }
      bufferedEvents.length = 0

      return runId
    },
    [cleanupSubscription]
  )

  const cancel = useCallback(() => {
    const runId = currentRunIdRef.current
    if (!runId) return

    // Best-effort cancellation signal to the main process.
    if (typeof window.ai?.cancel === 'function') {
      window.ai.cancel(runId)
    }

    cleanupSubscription()
    setStatus('idle')
    setError(null)
  }, [cleanupSubscription])

  const reset = useCallback(() => {
    // Only wipe state if not actively running — a running reset would leave
    // dangling subscriptions. Callers should cancel() first if mid-run.
    if (runningRef.current) return
    setStatus('idle')
    setResponse('')
    setError(null)
  }, [])

  return { run, cancel, response, status, error, reset }
}
