import { useState, useEffect, useCallback } from 'react'

interface FileInfo {
  filePath: string
  fileName: string
  content: string
  size: number
  lastModified: number
}

interface FsWatchEvent {
  eventType: string
  filename: string | null
  directory: string
  timestamp: number
}

interface UseFilesystemReturn {
  currentFile: FileInfo | null
  watchedDirs: string[]
  watchEvents: FsWatchEvent[]
  error: string | null
  loading: boolean
  openFile: () => Promise<void>
  saveFile: (defaultName: string, content: string) => Promise<boolean>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  selectAndWatchDir: () => Promise<void>
  unwatchDir: (dirPath: string) => Promise<void>
  clearFile: () => void
  clearEvents: () => void
}

export function useFilesystem(): UseFilesystemReturn {
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null)
  const [watchedDirs, setWatchedDirs] = useState<string[]>([])
  const [watchEvents, setWatchEvents] = useState<FsWatchEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const openFile = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      setLoading(true)
      const file = await window.fs.openFile()
      if (file) {
        setCurrentFile(file)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open file'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveFile = useCallback(async (defaultName: string, content: string): Promise<boolean> => {
    try {
      setError(null)
      const result = await window.api.fsSaveFile(defaultName, content)
      return result.success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file'
      setError(message)
      return false
    }
  }, [])

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    try {
      setError(null)
      const result = await window.api.fsWriteFile(filePath, content)
      return result.success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write file'
      setError(message)
      return false
    }
  }, [])

  const selectAndWatchDir = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const dirPath = await window.api.fsSelectDirectory()
      if (!dirPath) return

      const success = await window.api.fsWatchDirectory(dirPath)
      if (success) {
        setWatchedDirs((prev) => [...prev, dirPath])
      } else {
        setError('Directory is already being watched or is invalid')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to watch directory'
      setError(message)
    }
  }, [])

  const unwatchDir = useCallback(async (dirPath: string): Promise<void> => {
    try {
      setError(null)
      await window.api.fsUnwatchDirectory(dirPath)
      setWatchedDirs((prev) => prev.filter((d) => d !== dirPath))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unwatch directory'
      setError(message)
    }
  }, [])

  const clearFile = useCallback(() => {
    setCurrentFile(null)
  }, [])

  const clearEvents = useCallback(() => {
    setWatchEvents([])
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async (): Promise<void> => {
      try {
        const dirs = await window.api.fsGetWatched()
        if (isMounted) {
          setWatchedDirs(dirs)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize filesystem'
        if (isMounted) {
          setError(message)
        }
      }
    }

    initialize()

    const cleanup = window.api.onFsWatchEvent((event) => {
      if (isMounted) {
        setWatchEvents((prev) => [event, ...prev].slice(0, 100))
      }
    })

    return () => {
      isMounted = false
      cleanup()
    }
  }, [])

  return {
    currentFile,
    watchedDirs,
    watchEvents,
    error,
    loading,
    openFile,
    saveFile,
    writeFile,
    selectAndWatchDir,
    unwatchDir,
    clearFile,
    clearEvents
  }
}
