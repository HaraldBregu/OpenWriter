import { useEffect, useRef } from 'react'
import { useAppDispatch } from '../store'
import { handleExternalPostChange, handleExternalPostDelete } from '../store/postsSlice'

/**
 * Custom hook to listen for external file changes in the posts directory
 * and automatically update the Redux store.
 *
 * This hook should be used in the root App component to ensure
 * file watcher events are handled throughout the app lifecycle.
 *
 * Key behaviors:
 * - Listens for 'added', 'changed', and 'removed' events from the file watcher
 * - Automatically reloads the affected post from disk when changed
 * - Updates Redux store to reflect external changes
 * - Removes posts from Redux when deleted externally
 * - Handles errors gracefully with user notifications
 * - Prevents memory leaks by cleaning up event listeners
 *
 * Architecture:
 * - Uses IPC events from FileWatcherService via EventBus
 * - Integrates with Redux for state updates
 * - Coordinates with postsSyncMiddleware to prevent infinite loops
 *   (middleware marks files as written, watcher ignores them)
 *
 * Usage:
 * ```tsx
 * function App() {
 *   usePostsLoader() // Load initial posts
 *   usePostsFileWatcher() // Listen for external changes
 *   return <YourApp />
 * }
 * ```
 */
export function usePostsFileWatcher(): void {
  const dispatch = useAppDispatch()
  const isListeningRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate listeners
    if (isListeningRef.current) {
      return
    }

    console.debug('[PostsFileWatcher] Starting file watcher listener')

    /**
     * Handle file change events from the watcher.
     * Reloads the post from disk and updates Redux.
     */
    const handleFileChange = async (event: {
      type: 'added' | 'changed' | 'removed'
      postId: string
      filePath: string
      timestamp: number
    }): Promise<void> => {
      console.debug('[PostsFileWatcher] File change detected:', event)

      try {
        if (event.type === 'removed') {
          // Post was deleted externally - remove from Redux
          console.debug('[PostsFileWatcher] Post deleted externally:', event.postId)
          dispatch(handleExternalPostDelete(event.postId))

          // Show user notification
          await window.notification.show({
            title: 'Post Deleted',
            body: `Post was deleted externally: ${event.postId}`,
            urgency: 'normal'
          })
        } else {
          // Post was added or changed externally - reload from disk
          console.debug('[PostsFileWatcher] Post changed externally, reloading:', event.postId)

          // Reload all posts from workspace to get the latest data
          // Note: We reload all posts rather than trying to parse a single file
          // because the IPC layer already has this functionality and caching
          const posts = await window.posts.loadFromWorkspace()

          // Find the changed post in the loaded data
          const updatedPost = posts.find((p) => p.id === event.postId)

          if (updatedPost) {
            dispatch(handleExternalPostChange(updatedPost))

            // Show user notification
            const actionText = event.type === 'added' ? 'created' : 'modified'
            await window.notification.show({
              title: 'Post Updated',
              body: `Post was ${actionText} externally: ${updatedPost.title || event.postId}`,
              urgency: 'low'
            })
          } else {
            console.warn('[PostsFileWatcher] Post not found after reload:', event.postId)
          }
        }
      } catch (error) {
        console.error('[PostsFileWatcher] Failed to handle file change:', error)

        // Show error notification
        try {
          await window.notification.show({
            title: 'Sync Error',
            body: 'Failed to sync external file changes. Please refresh manually.',
            urgency: 'normal'
          })
        } catch (notifError) {
          console.error('[PostsFileWatcher] Failed to show notification:', notifError)
        }
      }
    }

    /**
     * Handle watcher errors.
     * Notifies the user when the file watcher encounters issues.
     */
    const handleWatcherError = async (errorData: {
      error: string
      timestamp: number
    }): Promise<void> => {
      console.error('[PostsFileWatcher] Watcher error:', errorData)

      try {
        await window.notification.show({
          title: 'File Watcher Error',
          body: `Error monitoring posts directory: ${errorData.error}`,
          urgency: 'critical'
        })
      } catch (notifError) {
        console.error('[PostsFileWatcher] Failed to show notification:', notifError)
      }
    }

    // Register event listeners
    const unsubscribeFileChange = window.api.onPostsFileChange(handleFileChange)
    const unsubscribeWatcherError = window.api.onPostsWatcherError(handleWatcherError)

    isListeningRef.current = true

    console.debug('[PostsFileWatcher] File watcher listener registered')

    // Cleanup on unmount
    return () => {
      console.debug('[PostsFileWatcher] Cleaning up file watcher listener')
      unsubscribeFileChange()
      unsubscribeWatcherError()
      isListeningRef.current = false
    }
  }, [dispatch])
}
