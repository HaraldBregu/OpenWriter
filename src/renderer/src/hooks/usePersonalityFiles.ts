import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store'
import { loadPersonalityFiles } from '@/store/personalityFilesSlice'

/**
 * Hook to automatically load personality files when workspace changes
 * and keep them in sync when files are added/changed/removed externally.
 */
export function usePersonalityFiles(): void {
  const dispatch = useAppDispatch()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load personality files initially
    const loadFiles = async (): Promise<void> => {
      try {
        const workspace = await window.workspace.getCurrent()
        if (workspace) {
          console.log('[usePersonalityFiles] Loading personality files for workspace:', workspace)
          await dispatch(loadPersonalityFiles()).unwrap()
        }
      } catch (error) {
        console.error('[usePersonalityFiles] Failed to load personality files:', error)
      }
    }

    loadFiles()

    // Listen for file changes from the watcher and refresh the list
    const unsubscribe = window.api.onPersonalityFileChange((event) => {
      console.log(`[usePersonalityFiles] File ${event.type}: ${event.sectionId}/${event.fileId}`)

      // Debounce to avoid multiple rapid refreshes (e.g., folder deletion fires
      // events for both config.json and DATA.md)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        dispatch(loadPersonalityFiles())
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
