import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { loadBrainFiles } from '@/store/brainFilesSlice'

/**
 * Hook to automatically load brain files when workspace changes.
 * Should be used at the app level to ensure brain files are loaded
 * whenever a workspace is selected.
 */
export function useBrainFiles(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Load brain files initially
    const loadFiles = async (): Promise<void> => {
      try {
        const workspace = await window.api.workspaceGetCurrent()
        if (workspace) {
          console.log('[useBrainFiles] Loading brain files for workspace:', workspace)
          await dispatch(loadBrainFiles()).unwrap()
        }
      } catch (error) {
        console.error('[useBrainFiles] Failed to load brain files:', error)
      }
    }

    loadFiles()

    // Note: If you add workspace change listeners in the future,
    // you can reload brain files when the workspace changes
    // For now, files are loaded once when the hook mounts
  }, [dispatch])
}
