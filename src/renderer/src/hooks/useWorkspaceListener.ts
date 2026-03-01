import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { handleWorkspaceChanged } from '@/store/workspaceSlice'
import type { WorkspaceChangedEvent } from '../../../shared/types'

/**
 * Hook to listen for workspace change events from the main process.
 * Dispatches handleWorkspaceChanged action when the workspace changes.
 *
 * Should be called from a top-level component like AppLayout to ensure
 * the listener is active for the entire app session.
 */
export function useWorkspaceListener(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubscribe = window.workspace.onChange((event: WorkspaceChangedEvent) => {
      console.log('[useWorkspaceListener] Workspace changed:', event.currentPath)
      dispatch(handleWorkspaceChanged(event))
    })

    return () => {
      unsubscribe()
    }
  }, [dispatch])
}
