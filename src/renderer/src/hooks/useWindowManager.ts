import { useState, useEffect, useCallback } from 'react'

interface ManagedWindowInfo {
  id: number
  type: string
  title: string
  createdAt: number
}

interface UseWindowManagerReturn {
  windows: ManagedWindowInfo[]
  error: string | null
  createChild: () => Promise<void>
  createModal: () => Promise<void>
  createFrameless: () => Promise<void>
  createWidget: () => Promise<void>
  closeWindow: (id: number) => Promise<void>
  closeAll: () => Promise<void>
  refresh: () => Promise<void>
}

export function useWindowManager(): UseWindowManagerReturn {
  const [windows, setWindows] = useState<ManagedWindowInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const state = await window.wm.getState()
      setWindows(state.windows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch window state'
      setError(message)
    }
  }, [])

  const createChild = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.wm.createChild()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create child window'
      setError(message)
    }
  }, [])

  const createModal = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.wm.createModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create modal window'
      setError(message)
    }
  }, [])

  const createFrameless = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.api.wmCreateFrameless()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create frameless window'
      setError(message)
    }
  }, [])

  const createWidget = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.api.wmCreateWidget()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create widget window'
      setError(message)
    }
  }, [])

  const closeWindow = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null)
      await window.api.wmCloseWindow(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close window'
      setError(message)
    }
  }, [])

  const closeAll = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await window.api.wmCloseAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close all windows'
      setError(message)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async (): Promise<void> => {
      try {
        const state = await window.api.wmGetState()
        if (isMounted) {
          setWindows(state.windows)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize window manager'
        if (isMounted) {
          setError(message)
        }
      }
    }

    initialize()

    const cleanup = window.api.onWmStateChange((state) => {
      if (isMounted) {
        setWindows(state.windows)
      }
    })

    return () => {
      isMounted = false
      cleanup()
    }
  }, [])

  return {
    windows,
    error,
    createChild,
    createModal,
    createFrameless,
    createWidget,
    closeWindow,
    closeAll,
    refresh
  }
}
