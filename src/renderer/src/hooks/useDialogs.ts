import { useState, useCallback } from 'react'

interface DialogResult {
  type: string
  timestamp: number
  data: Record<string, unknown>
}

interface UseDialogsReturn {
  log: DialogResult[]
  error: string | null
  showOpenDialog: () => Promise<void>
  showSaveDialog: () => Promise<void>
  showMessageBox: (message: string, detail: string, buttons: string[]) => Promise<void>
  showErrorDialog: (title: string, content: string) => Promise<void>
  clearLog: () => void
}

export function useDialogs(): UseDialogsReturn {
  const [log, setLog] = useState<DialogResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const pushResult = (result: DialogResult): void => {
    setLog((prev) => [result, ...prev].slice(0, 50))
  }

  const showOpenDialog = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const result = await window.dialog.open()
      pushResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show open dialog')
    }
  }, [])

  const showSaveDialog = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const result = await window.dialog.save()
      pushResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show save dialog')
    }
  }, [])

  const showMessageBox = useCallback(async (message: string, detail: string, buttons: string[]): Promise<void> => {
    try {
      setError(null)
      const result = await window.dialog.message(message, detail, buttons)
      pushResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show message box')
    }
  }, [])

  const showErrorDialog = useCallback(async (title: string, content: string): Promise<void> => {
    try {
      setError(null)
      const result = await window.dialog.error(title, content)
      pushResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show error dialog')
    }
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
  }, [])

  return {
    log,
    error,
    showOpenDialog,
    showSaveDialog,
    showMessageBox,
    showErrorDialog,
    clearLog
  }
}
