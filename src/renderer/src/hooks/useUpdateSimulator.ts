import { useState, useCallback, useEffect } from 'react'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string
  downloadSize: number
}

interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

interface UpdateState {
  status: string
  updateInfo: UpdateInfo | null
  progress: UpdateProgress | null
  error: string | null
}

interface UseUpdateSimulatorReturn {
  state: UpdateState
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  installAndRestart: () => Promise<void>
  cancelDownload: () => Promise<void>
  reset: () => Promise<void>
}

export function useUpdateSimulator(): UseUpdateSimulatorReturn {
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null
  })

  // Load initial state
  useEffect(() => {
    const loadState = async (): Promise<void> => {
      const initialState = await window.api.updateSimGetState()
      setState(initialState)
    }
    loadState()
  }, [])

  // Listen for state changes
  useEffect(() => {
    const unsubscribeState = window.api.onUpdateSimStateChange((newState) => {
      setState(newState)
    })

    const unsubscribeProgress = window.api.onUpdateSimProgress((progress) => {
      setState((prev) => ({ ...prev, progress }))
    })

    return () => {
      unsubscribeState()
      unsubscribeProgress()
    }
  }, [])

  const checkForUpdates = useCallback(async (): Promise<void> => {
    try {
      await window.api.updateSimCheck()
    } catch (err) {
      console.error('Failed to check for updates:', err)
    }
  }, [])

  const downloadUpdate = useCallback(async (): Promise<void> => {
    try {
      await window.api.updateSimDownload()
    } catch (err) {
      console.error('Failed to download update:', err)
    }
  }, [])

  const installAndRestart = useCallback(async (): Promise<void> => {
    try {
      await window.api.updateSimInstall()
    } catch (err) {
      console.error('Failed to install update:', err)
    }
  }, [])

  const cancelDownload = useCallback(async (): Promise<void> => {
    try {
      await window.api.updateSimCancel()
    } catch (err) {
      console.error('Failed to cancel download:', err)
    }
  }, [])

  const reset = useCallback(async (): Promise<void> => {
    try {
      await window.api.updateSimReset()
    } catch (err) {
      console.error('Failed to reset update state:', err)
    }
  }, [])

  return {
    state,
    checkForUpdates,
    downloadUpdate,
    installAndRestart,
    cancelDownload,
    reset
  }
}
