import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { loadPersonalityFiles } from '@/store/personalityFilesSlice'

/**
 * Hook to automatically load personality files when workspace changes.
 * Should be used at the app level to ensure personality files are loaded
 * whenever a workspace is selected.
 */
export function usePersonalityFiles(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Load personality files initially
    const loadFiles = async (): Promise<void> => {
      try {
        const workspace = await window.api.workspaceGetCurrent()
        if (workspace) {
          console.log('[usePersonalityFiles] Loading personality files for workspace:', workspace)
          await dispatch(loadPersonalityFiles()).unwrap()
        }
      } catch (error) {
        console.error('[usePersonalityFiles] Failed to load personality files:', error)
      }
    }

    loadFiles()

    // Note: If you add workspace change listeners in the future,
    // you can reload personality files when the workspace changes
    // For now, files are loaded once when the hook mounts
  }, [dispatch])
}
