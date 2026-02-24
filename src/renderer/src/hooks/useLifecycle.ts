import { useState, useEffect, useCallback } from 'react'

interface LifecycleEvent {
  type: string
  timestamp: number
  detail?: string
}

interface LifecycleState {
  isSingleInstance: boolean
  events: LifecycleEvent[]
  appReadyAt: number | null
  platform: string
}

interface UseLifecycleReturn {
  isSingleInstance: boolean
  events: LifecycleEvent[]
  appReadyAt: number | null
  platform: string
  error: string | null
  restart: () => Promise<void>
  refreshEvents: () => Promise<void>
}

export function useLifecycle(): UseLifecycleReturn {
  const [isSingleInstance, setIsSingleInstance] = useState(true)
  const [events, setEvents] = useState<LifecycleEvent[]>([])
  const [appReadyAt, setAppReadyAt] = useState<number | null>(null)
  const [platform, setPlatform] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refreshEvents = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const evts = await window.lifecycle.getEvents()
      setEvents(evts)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lifecycle events'
      setError(message)
    }
  }, [])

  const restart = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.lifecycle.restart()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restart application'
      setError(message)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async (): Promise<void> => {
      try {
        const state: LifecycleState = await window.lifecycle.getState()
        if (isMounted) {
          setIsSingleInstance(state.isSingleInstance)
          setEvents(state.events)
          setAppReadyAt(state.appReadyAt)
          setPlatform(state.platform)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize lifecycle'
        if (isMounted) {
          setError(message)
        }
      }
    }

    initialize()

    const cleanup = window.api.onLifecycleEvent((event) => {
      if (isMounted) {
        setEvents((prev) => [...prev, event])
      }
    })

    return () => {
      isMounted = false
      cleanup()
    }
  }, [])

  return {
    isSingleInstance,
    events,
    appReadyAt,
    platform,
    error,
    restart,
    refreshEvents
  }
}
