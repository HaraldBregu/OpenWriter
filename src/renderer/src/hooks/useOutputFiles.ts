import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store'
import { loadOutputItems } from '@/store/outputSlice'

/**
 * Loads output files (writings) from the workspace API and keeps them in sync.
 *
 * Responsibilities:
 *  1. Load items on mount when a workspace is active.
 *  2. Reload items whenever the workspace changes (user opens a different folder).
 *  3. Debounce file-watcher events so rapid filesystem notifications don't
 *     trigger redundant reloads (e.g., folder deletion fires both config.json
 *     and individual .md file events).
 *
 * This hook must be called once at the AppLayout level so that a single
 * IPC subscription is active for the lifetime of the app window.
 */
export function useOutputFiles(): void {
  const dispatch = useAppDispatch()

  // Debounce ref shared between the file-watcher handler and the workspace
  // change handler so both paths respect the same cool-down period.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // ---------------------------------------------------------------------------
    // Shared load helper — checks workspace existence before dispatching
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // Debounced reload — used by both workspace-change and file-watcher paths
    // ---------------------------------------------------------------------------
    const scheduleDebouncedLoad = (): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        dispatch(loadOutputItems())
      }, 500)
    }

    // Initial load on mount
    loadFiles()

    // ---------------------------------------------------------------------------
    // Workspace change listener — reloads items when the user opens a different
    // workspace folder (e.g., via WelcomePage or the workspace picker).
    // ---------------------------------------------------------------------------
    const unsubscribeWorkspace = window.workspace.onChange((event) => {
      if (event.currentPath) {
        console.log('[useOutputFiles] Workspace changed, reloading output items:', event.currentPath)
        scheduleDebouncedLoad()
      }
    })

    // ---------------------------------------------------------------------------
    // File-watcher listener — reloads when the filesystem changes externally
    // (e.g., another app writes a file, or the user deletes a folder manually).
    // ---------------------------------------------------------------------------
    const unsubscribeFileChange = window.output.onFileChange((event) => {
      console.log(`[useOutputFiles] File ${event.type}: ${event.outputType}/${event.fileId}`)
      scheduleDebouncedLoad()
    })

    return () => {
      unsubscribeWorkspace()
      unsubscribeFileChange()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [dispatch])
}
