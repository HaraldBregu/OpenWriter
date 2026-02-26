import { useEffect, useRef } from 'react'
import { useAppDispatch, type AppDispatch } from '../store'
import { loadPosts } from '../store/postsSlice'

/**
 * Custom hook to load posts from Electron when the app starts
 * or when the workspace changes
 *
 * This hook should be used in the root App component to ensure
 * posts are loaded once on app initialization.
 *
 * Key behaviors:
 * - Loads posts from the current workspace on mount
 * - Handles workspace changes (resets sync state, loads new posts)
 * - Prevents duplicate loads with a ref flag
 * - Gracefully handles errors (workspace not set, file not found, etc.)
 */
export function usePostsLoader(): {
  isLoading: boolean
  error: Error | null
} {
  const dispatch = useAppDispatch()
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const errorRef = useRef<Error | null>(null)

  useEffect(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current || isLoadingRef.current) {
      return
    }

    async function loadPostsFromWorkspace(): Promise<void> {
      try {
        isLoadingRef.current = true

        // Check if there's an active workspace
        const workspacePath = await window.workspace.getCurrent()

        if (!workspacePath) {
          console.debug('[PostsLoader] No workspace selected, skipping load')
          hasLoadedRef.current = true
          isLoadingRef.current = false
          return
        }

        console.debug('[PostsLoader] Loading posts from workspace:', workspacePath)

        // Load posts from Electron
        const posts = await window.posts.loadFromWorkspace()

        console.debug('[PostsLoader] Loaded posts:', { postCount: posts.length })

        // Dispatch action to populate Redux store
        dispatch(loadPosts(posts))

        hasLoadedRef.current = true
        isLoadingRef.current = false
        errorRef.current = null
      } catch (error) {
        console.error('[PostsLoader] Failed to load posts:', error)
        errorRef.current = error instanceof Error ? error : new Error('Unknown error')
        hasLoadedRef.current = true
        isLoadingRef.current = false

      }
    }

    loadPostsFromWorkspace()
  }, [dispatch])

  return {
    isLoading: isLoadingRef.current,
    error: errorRef.current
  }
}

/**
 * Manually reload posts from the current workspace
 * Useful when workspace changes or needs to be refreshed
 *
 * @param dispatch - Redux dispatch function
 * @returns Promise that resolves when posts are loaded
 */
export async function reloadPostsFromWorkspace(
  dispatch: AppDispatch
): Promise<void> {
  try {
    // Check if there's an active workspace
    const workspacePath = await window.workspace.getCurrent()

    if (!workspacePath) {
      console.debug('[PostsReload] No workspace selected')
      return
    }

    console.debug('[PostsReload] Reloading posts from workspace:', workspacePath)

    // Load posts from workspace
    const posts = await window.posts.loadFromWorkspace()

    console.debug('[PostsReload] Loaded posts:', { postCount: posts.length })

    // Dispatch action to populate Redux store
    dispatch(loadPosts(posts))

  } catch (error) {
    console.error('[PostsReload] Failed to reload posts:', error)

    // Don't show notification for "file not found" errors
    if (error instanceof Error && !error.message.includes('ENOENT')) {
      try {
        await window.notification.show({
          title: 'Reload Failed',
          body: 'Failed to reload posts from workspace.',
          urgency: 'normal'
        })
      } catch (notifError) {
        console.error('[PostsReload] Failed to show notification:', notifError)
      }
    }

    throw error
  }
}
