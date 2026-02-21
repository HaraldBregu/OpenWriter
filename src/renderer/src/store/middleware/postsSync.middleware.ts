import type { Middleware } from '@reduxjs/toolkit'
import type { Post } from '../postsSlice'

// Define the state shape we need (avoids circular reference with RootState)
interface PostsState {
  posts: {
    posts: Post[]
  }
}

/**
 * Debounce timer for batching rapid post updates
 * Prevents excessive file writes during active editing
 */
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null

/**
 * Track the last synced state to avoid redundant syncs
 */
let lastSyncedPosts: Post[] | null = null

/**
 * Debounce delay in milliseconds
 * Waits 1.5 seconds after the last change before syncing
 */
const SYNC_DEBOUNCE_MS = 1500

/**
 * Compares two post arrays to detect meaningful changes
 * Uses updatedAt timestamp and length as quick indicators
 */
function hasPostsChanged(prevPosts: Post[] | null, currentPosts: Post[]): boolean {
  if (!prevPosts) return true
  if (prevPosts.length !== currentPosts.length) return true

  // Compare timestamps of all posts
  for (let i = 0; i < currentPosts.length; i++) {
    const prev = prevPosts[i]
    const current = currentPosts[i]

    if (!prev || prev.id !== current.id || prev.updatedAt !== current.updatedAt) {
      return true
    }
  }

  return false
}

/**
 * Syncs posts to Electron main process via IPC
 * Only syncs if there's an active workspace
 */
async function syncPostsToElectron(posts: Post[]): Promise<void> {
  try {
    // Check if there's an active workspace
    const workspacePath = await window.api.workspaceGetCurrent()

    if (!workspacePath) {
      // No workspace selected, skip sync
      console.debug('[PostsSync] No workspace selected, skipping sync')
      return
    }

    // Only sync if there are posts or if we're clearing posts
    if (posts.length === 0 && (!lastSyncedPosts || lastSyncedPosts.length === 0)) {
      console.debug('[PostsSync] No posts to sync')
      return
    }

    // Check if posts have actually changed
    if (!hasPostsChanged(lastSyncedPosts, posts)) {
      console.debug('[PostsSync] Posts unchanged, skipping sync')
      return
    }

    console.debug('[PostsSync] Syncing posts to Electron', {
      postCount: posts.length,
      workspacePath
    })

    // Call IPC method to sync posts
    const result = await window.api.postsSyncToWorkspace(posts)

    // Update last synced state
    lastSyncedPosts = [...posts]

    console.debug('[PostsSync] Successfully synced posts', {
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: result.errors
    })

    // Show warning if some posts failed to sync
    if (result.failedCount > 0) {
      await window.api.notificationShow({
        title: 'Partial Sync',
        body: `${result.failedCount} post(s) failed to sync. Check console for details.`,
        urgency: 'normal'
      })
    }
  } catch (error) {
    console.error('[PostsSync] Failed to sync posts to Electron:', error)

    // Show user-facing error notification
    try {
      await window.api.notificationShow({
        title: 'Sync Failed',
        body: 'Failed to save posts to workspace. Your changes may not be persisted.',
        urgency: 'critical'
      })
    } catch (notifError) {
      console.error('[PostsSync] Failed to show notification:', notifError)
    }
  }
}

/**
 * Debounced sync function
 * Batches rapid changes to prevent excessive file I/O
 */
function debouncedSync(posts: Post[]): void {
  // Clear existing timeout
  if (syncTimeoutId !== null) {
    clearTimeout(syncTimeoutId)
  }

  // Schedule new sync
  syncTimeoutId = setTimeout(() => {
    syncPostsToElectron(posts)
    syncTimeoutId = null
  }, SYNC_DEBOUNCE_MS)
}

/**
 * Delete a post file from the workspace immediately
 * Called when a post is deleted from Redux
 */
async function deletePostFile(postId: string): Promise<void> {
  try {
    // Check if there's an active workspace
    const workspacePath = await window.api.workspaceGetCurrent()

    if (!workspacePath) {
      console.debug('[PostsSync] No workspace selected, skipping file deletion')
      return
    }

    console.debug('[PostsSync] Deleting post file:', postId)

    // Call IPC method to delete the post file
    await window.api.postsDeletePost(postId)

    console.debug('[PostsSync] Successfully deleted post file:', postId)
  } catch (error) {
    console.error('[PostsSync] Failed to delete post file:', error)

    // Show user-facing error notification
    try {
      await window.api.notificationShow({
        title: 'Delete Failed',
        body: `Failed to delete post file. The file may still exist in the workspace.`,
        urgency: 'normal'
      })
    } catch (notifError) {
      console.error('[PostsSync] Failed to show notification:', notifError)
    }

    throw error
  }
}

/**
 * Redux middleware that listens to post actions and syncs to Electron
 *
 * This middleware intercepts all Redux actions and triggers a sync
 * when post-related actions are dispatched. It implements debouncing
 * to prevent excessive file writes during rapid changes (e.g., typing).
 *
 * Architectural decision:
 * - Middleware approach: Chosen over hooks/sagas for centralized,
 *   action-agnostic post change detection
 * - Debouncing: 1.5s delay balances responsiveness with I/O efficiency
 * - Workspace validation: Ensures we only sync when a workspace is active
 * - Error handling: Graceful degradation with user notifications
 */
export const postsSyncMiddleware: Middleware<object, PostsState> = (store) => (next) => (action) => {
  // Let the action pass through first
  const result = next(action)

  // Check if the action affects posts
  // All post actions start with 'posts/' prefix (Redux Toolkit convention)
  if (typeof action === 'object' && action !== null && 'type' in action) {
    const actionType = (action as { type: string }).type

    if (actionType.startsWith('posts/')) {
      // Get current posts state after the action
      const state = store.getState()
      const posts = state.posts.posts

      console.debug('[PostsSync] Post action detected:', actionType, {
        postCount: posts.length
      })

      // Handle post deletion specially - delete file immediately
      if (actionType === 'posts/deletePost' && 'payload' in action) {
        const postId = action.payload as string

        // Delete the post file immediately (don't wait for debounce)
        deletePostFile(postId).catch((error) => {
          console.error('[PostsSync] Failed to delete post file:', error)
        })
      }

      // Trigger debounced sync for all post changes
      debouncedSync(posts)
    }
  }

  return result
}

/**
 * Force immediate sync (bypasses debouncing)
 * Useful for critical operations like app shutdown or workspace change
 */
export async function forcePostsSync(posts: Post[]): Promise<void> {
  // Clear any pending debounced sync
  if (syncTimeoutId !== null) {
    clearTimeout(syncTimeoutId)
    syncTimeoutId = null
  }

  await syncPostsToElectron(posts)
}

/**
 * Reset the sync state
 * Useful when switching workspaces
 */
export function resetPostsSyncState(): void {
  lastSyncedPosts = null

  if (syncTimeoutId !== null) {
    clearTimeout(syncTimeoutId)
    syncTimeoutId = null
  }
}
