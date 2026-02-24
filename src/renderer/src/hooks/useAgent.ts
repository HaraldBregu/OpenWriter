import { useState, useCallback, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import {
  addUserMessage,
  addAssistantMessage,
  appendToken,
  setAgentRunning,
  selectIsAgentRunning
} from '../store/chatSlice'

export interface UseAgentReturn {
  isRunning: boolean
  error: string | null
  run: (
    input: string,
    threadId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    providerId: string
  ) => Promise<void>
  cancel: () => void
}

export function useAgent(): UseAgentReturn {
  const dispatch = useAppDispatch()

  // Global running flag from Redux — true if ANY thread is running
  const isRunning = useAppSelector(selectIsAgentRunning)

  // Synchronous ref guard — closes the async race where setState hasn't flushed yet
  // and a second call to run() slips through with stale isRunning = false
  const runningRef = useRef(false)

  const [error, setError] = useState<string | null>(null)
  const currentRunId = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const run = useCallback(
    async (
      input: string,
      threadId: string,
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      providerId: string
    ) => {
      // Double-guard: ref is synchronous (no stale closure risk),
      // Redux state covers cross-component / cross-thread cases
      if (runningRef.current) return
      runningRef.current = true

      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
      currentRunId.current = runId

      const fullHistory = [...history, { role: 'user' as const, content: input }]

      dispatch(addUserMessage({ threadId, content: input }))
      dispatch(addAssistantMessage({ threadId }))
      dispatch(setAgentRunning({ running: true, threadId }))
      setError(null)

      const finish = (err?: string) => {
        runningRef.current = false
        dispatch(setAgentRunning({ running: false }))
        currentRunId.current = null
        if (unsubRef.current) {
          unsubRef.current()
          unsubRef.current = null
        }
        if (err) setError(err)
      }

      const unsub = window.agent.onEvent((eventType, data) => {
        const d = data as Record<string, unknown>
        if (d.runId !== runId) return

        switch (eventType) {
          case 'agent:token':
            dispatch(appendToken({ threadId, token: d.token as string }))
            break
          case 'agent:done':
            finish()
            break
          case 'agent:error':
            finish(d.error as string)
            break
        }
      })

      unsubRef.current = unsub

      await window.api.agentRun(fullHistory, runId, providerId)
    },
    [dispatch] // no isRunning in deps — we use the ref for the guard
  )

  const cancel = useCallback(() => {
    if (currentRunId.current) {
      window.api.agentCancel(currentRunId.current)
    }
    runningRef.current = false
    dispatch(setAgentRunning({ running: false }))
    currentRunId.current = null
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
  }, [dispatch])

  return { isRunning, error, run, cancel }
}
