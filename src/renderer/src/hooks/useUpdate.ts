import { useState, useEffect, useCallback } from 'react'

type UpdateStatus = 'idle' | 'checking' | 'not-available' | 'downloading' | 'downloaded' | 'error'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface UpdateState {
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  error: string | null
}

interface UseUpdateReturn {
  version: string
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  error: string | null
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<void>
}

export function useUpdate(): UseUpdateReturn {
  const [version, setVersion] = useState('')
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    updateInfo: null,
    error: null
  })

  useEffect(() => {
    window.api.updateGetVersion().then(setVersion).catch(console.error)
    window.api.updateGetState().then(setState).catch(console.error)

    const cleanup = window.api.onUpdateStateChange((newState) => {
      setState(newState)
    })

    return cleanup
  }, [])

  const checkForUpdates = useCallback(async () => {
    await window.api.updateCheck()
  }, [])

  const installUpdate = useCallback(async () => {
    await window.api.updateInstall()
  }, [])

  return {
    version,
    status: state.status,
    updateInfo: state.updateInfo,
    error: state.error,
    checkForUpdates,
    installUpdate
  }
}
