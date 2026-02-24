import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store'
import { loadOutputItems } from '@/store/outputSlice'

/**
 * Hook to automatically load output files when workspace changes
 * and keep them in sync when files are added/changed/removed externally.
 */
export function useOutputFiles(): void {
  const dispatch = useAppDispatch()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load output items initially
    const loadFiles = async (): Promise<void> => {
      try {
        const workspace = await window.workspace.getCurrent()
        if (workspace) {
          console.log('[useOutputFiles] Loading output items for workspace:', workspace)
          await dispatch(loadOutputItems()).unwrap()
        }
      } catch (error) {
        console.error('[useOutputFiles] Failed to load output items:', error)
      }
    }

    loadFiles()

    // Listen for file changes from the watcher and refresh the list
    const unsubscribe = window.api.onOutputFileChange((event) => {
      console.log(`[useOutputFiles] File ${event.type}: ${event.outputType}/${event.fileId}`)

      // Debounce to avoid multiple rapid refreshes (e.g., folder deletion fires
      // events for both config.json and DATA.md)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        dispatch(loadOutputItems())
      }, 500)
    })

    return () => {
      unsubscribe()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [dispatch])
}
