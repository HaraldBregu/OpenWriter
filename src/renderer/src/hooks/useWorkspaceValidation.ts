import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  handleWorkspaceDeleted,
  clearDeletionReason,
  selectCurrentWorkspacePath,
  selectWorkspaceDeletionReason
} from '@/store/workspaceSlice'
import type { WorkspaceDeletedEvent } from '../../../shared/types'

/**
 * Hook that monitors the workspace for external deletion and redirects
 * to the Welcome page when the workspace folder is no longer accessible.
 *
 * This hook:
 * 1. Subscribes to `workspace:deleted` events from the main process
 * 2. Updates Redux state with the deletion reason
 * 3. Navigates the user to the Welcome page
 *
 * Should be mounted once in a top-level component like AppLayout.
 */
export function useWorkspaceValidation(): void {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const currentPath = useAppSelector(selectCurrentWorkspacePath)
  const deletionReason = useAppSelector(selectWorkspaceDeletionReason)

  // Use a ref to track if we have already handled a deletion event
  // to prevent duplicate navigation.
  const hasHandledDeletion = useRef(false)

  // Subscribe to workspace deletion events from the main process
  useEffect(() => {
    const unsubscribe = window.workspace.onDeleted((event: WorkspaceDeletedEvent) => {
      console.warn(
        '[useWorkspaceValidation] Workspace deleted:',
        event.deletedPath,
        'reason:',
        event.reason
      )
      dispatch(handleWorkspaceDeleted({
        deletedPath: event.deletedPath,
        reason: event.reason
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [dispatch])

  // Navigate to welcome page when deletion is detected
  useEffect(() => {
    if (deletionReason && !hasHandledDeletion.current) {
      hasHandledDeletion.current = true
      navigate('/', { replace: true })
    }

    // Reset the flag when the deletion reason is cleared
    // (i.e., user has opened a new workspace)
    if (!deletionReason) {
      hasHandledDeletion.current = false
    }
  }, [deletionReason, navigate])

  // When a new workspace is selected (currentPath becomes non-null),
  // clear any lingering deletion reason.
  const previousPath = useRef(currentPath)
  useEffect(() => {
    if (currentPath && !previousPath.current && deletionReason) {
      dispatch(clearDeletionReason())
    }
    previousPath.current = currentPath
  }, [currentPath, deletionReason, dispatch])
}

/**
 * Convenience hook to access the deletion reason for display purposes.
 * Returns null when no deletion has occurred.
 */
export function useWorkspaceDeletionReason(): string | null {
  return useAppSelector(selectWorkspaceDeletionReason)
}

/**
 * Hook that provides a function to manually clear the deletion reason,
 * e.g., after the user has acknowledged a notification.
 */
export function useClearDeletionReason(): () => void {
  const dispatch = useAppDispatch()
  return useCallback(() => {
    dispatch(clearDeletionReason())
  }, [dispatch])
}
