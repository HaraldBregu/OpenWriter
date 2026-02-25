/**
 * Example React hook for using the Posts IPC API
 *
 * This file demonstrates best practices for loading, creating, updating,
 * and deleting posts using the enhanced PostsIpc implementation.
 */

import { useState, useEffect, useCallback } from 'react'

interface Post {
  id: string
  title: string
  blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
}

interface UsePostsReturn {
  posts: Post[]
  loading: boolean
  error: string | null
  loadPosts: () => Promise<void>
  createPost: (post: Omit<Post, 'createdAt' | 'updatedAt'>) => Promise<void>
  updatePost: (post: Post) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  syncAllPosts: () => Promise<void>
}

/**
 * Custom hook for managing posts with the workspace filesystem.
 *
 * Features:
 *   - Automatic loading on mount
 *   - Loading and error states
 *   - CRUD operations
 *   - Automatic cache invalidation
 *
 * Usage:
 *   const { posts, loading, createPost } = usePosts()
 */
export function usePosts(): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all posts from the workspace.
   * The main process will use cache if available (5s TTL).
   */
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[usePosts] Loading posts from workspace...')
      const loadedPosts = await window.posts.loadFromWorkspace()

      setPosts(loadedPosts)
      console.log(`[usePosts] Loaded ${loadedPosts.length} posts`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[usePosts] Failed to load posts:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a new post.
   * Automatically reloads posts after creation.
   */
  const createPost = useCallback(
    async (postData: Omit<Post, 'createdAt' | 'updatedAt'>) => {
      try {
        setError(null)

        const now = Date.now()
        const newPost: Post = {
          ...postData,
          createdAt: now,
          updatedAt: now
        }

        console.log(`[usePosts] Creating post: ${newPost.id}`)
        await window.posts.update(newPost)

        // Reload posts (cache is automatically invalidated by update)
        await loadPosts()

        console.log(`[usePosts] Post created successfully: ${newPost.id}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[usePosts] Failed to create post:', errorMessage)
        setError(errorMessage)
        throw err
      }
    },
    [loadPosts]
  )

  /**
   * Update an existing post.
   * Automatically reloads posts after update.
   */
  const updatePost = useCallback(
    async (post: Post) => {
      try {
        setError(null)

        const updatedPost: Post = {
          ...post,
          updatedAt: Date.now()
        }

        console.log(`[usePosts] Updating post: ${post.id}`)
        await window.posts.update(updatedPost)

        // Reload posts (cache is automatically invalidated by update)
        await loadPosts()

        console.log(`[usePosts] Post updated successfully: ${post.id}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[usePosts] Failed to update post:', errorMessage)
        setError(errorMessage)
        throw err
      }
    },
    [loadPosts]
  )

  /**
   * Delete a post.
   * Automatically reloads posts after deletion.
   */
  const deletePost = useCallback(
    async (postId: string) => {
      try {
        setError(null)

        console.log(`[usePosts] Deleting post: ${postId}`)
        await window.posts.delete(postId)

        // Reload posts (cache is automatically invalidated by delete)
        await loadPosts()

        console.log(`[usePosts] Post deleted successfully: ${postId}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[usePosts] Failed to delete post:', errorMessage)
        setError(errorMessage)
        throw err
      }
    },
    [loadPosts]
  )

  /**
   * Sync all posts to the workspace.
   * Useful for batch operations or migrations.
   */
  const syncAllPosts = useCallback(async () => {
    try {
      setError(null)

      console.log(`[usePosts] Syncing ${posts.length} posts to workspace...`)
      const result = await window.posts.syncToWorkspace(posts)

      if (result.success) {
        console.log(`[usePosts] Synced ${result.syncedCount} posts successfully`)
      } else {
        console.warn(
          `[usePosts] Partial sync: ${result.syncedCount} succeeded, ${result.failedCount} failed`
        )
        if (result.errors) {
          console.error('[usePosts] Sync errors:', result.errors)
        }
      }

      // Reload to ensure consistency
      await loadPosts()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[usePosts] Failed to sync posts:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [posts, loadPosts])

  // Load posts on mount
  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  return {
    posts,
    loading,
    error,
    loadPosts,
    createPost,
    updatePost,
    deletePost,
    syncAllPosts
  }
}

/**
 * Example usage in a component:
 */
export function PostsListExample() {
  const { posts, loading, error, createPost, deletePost } = usePosts()

  const handleCreatePost = async () => {
    await createPost({
      id: `post-${Date.now()}`,
      title: 'New Post',
      blocks: [{ id: 'block-1', content: 'Hello World' }],
      category: 'general',
      tags: ['example'],
      visibility: 'public'
    })
  }

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost(postId)
    }
  }

  if (loading) {
    return <div>Loading posts...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h1>Posts ({posts.length})</h1>

      <button onClick={handleCreatePost}>Create New Post</button>

      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h2>{post.title}</h2>
            <p>Category: {post.category}</p>
            <p>Tags: {post.tags.join(', ')}</p>
            <button onClick={() => handleDeletePost(post.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {posts.length === 0 && <p>No posts yet. Create your first post!</p>}
    </div>
  )
}
