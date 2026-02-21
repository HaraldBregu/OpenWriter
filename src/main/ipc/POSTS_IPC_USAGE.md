# Posts IPC Usage Guide

This guide explains how to use the Posts IPC handlers to sync posts to the filesystem.

## Overview

The Posts IPC module provides functionality to:
- Sync all posts from the renderer to the workspace directory
- Create/update individual post files
- Delete post files
- Load posts from the workspace directory

All post files are stored as JSON in a `posts` subdirectory within the current workspace.

## File Structure

```
workspace/
└── posts/
    ├── {postId1}.json
    ├── {postId2}.json
    └── {postId3}.json
```

Each post is stored as a separate JSON file named with its ID.

## Available Methods

### 1. Sync All Posts to Workspace

Syncs all posts to the workspace directory in a single operation.

```typescript
const result = await window.api.postsSyncToWorkspace(posts)

// Result structure:
{
  success: boolean,           // true if all posts synced successfully
  syncedCount: number,        // Number of successfully synced posts
  failedCount: number,        // Number of failed posts
  errors?: Array<{           // Optional array of errors (only if failures occurred)
    postId: string,
    error: string
  }>
}
```

**Example:**

```typescript
import { useSelector } from 'react-redux'
import { selectPosts } from '@/store/postsSlice'

function SyncButton() {
  const posts = useSelector(selectPosts)

  const handleSync = async () => {
    try {
      const result = await window.api.postsSyncToWorkspace(posts)

      if (result.success) {
        console.log(`Successfully synced ${result.syncedCount} posts`)
      } else {
        console.error(`Failed to sync ${result.failedCount} posts`)
        result.errors?.forEach(({ postId, error }) => {
          console.error(`Post ${postId}: ${error}`)
        })
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  return <button onClick={handleSync}>Sync All Posts</button>
}
```

### 2. Update Single Post

Updates or creates a single post file.

```typescript
await window.api.postsUpdatePost(post)
```

**Example:**

```typescript
import { useSelector } from 'react-redux'
import { selectPostById } from '@/store/postsSlice'

function PostEditor({ postId }: { postId: string }) {
  const post = useSelector(selectPostById(postId))

  const handleSave = async () => {
    if (!post) return

    try {
      await window.api.postsUpdatePost(post)
      console.log('Post saved to workspace')
    } catch (error) {
      console.error('Failed to save post:', error)
    }
  }

  return <button onClick={handleSave}>Save to Workspace</button>
}
```

### 3. Delete Post

Deletes a post file from the workspace.

```typescript
await window.api.postsDeletePost(postId)
```

**Example:**

```typescript
import { useDispatch } from 'react-redux'
import { deletePost } from '@/store/postsSlice'

function DeleteButton({ postId }: { postId: string }) {
  const dispatch = useDispatch()

  const handleDelete = async () => {
    try {
      // Delete from filesystem
      await window.api.postsDeletePost(postId)

      // Delete from Redux store
      dispatch(deletePost(postId))

      console.log('Post deleted')
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  return <button onClick={handleDelete}>Delete Post</button>
}
```

### 4. Load Posts from Workspace

Loads all posts from the workspace directory.

```typescript
const posts = await window.api.postsLoadFromWorkspace()
```

**Example:**

```typescript
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

function PostLoader() {
  const dispatch = useDispatch()

  useEffect(() => {
    loadPostsFromWorkspace()
  }, [])

  const loadPostsFromWorkspace = async () => {
    try {
      const posts = await window.api.postsLoadFromWorkspace()

      // Populate Redux store with loaded posts
      posts.forEach(post => {
        // You'll need to add an action to import posts
        // dispatch(importPost(post))
      })

      console.log(`Loaded ${posts.length} posts from workspace`)
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  return <button onClick={loadPostsFromWorkspace}>Load from Workspace</button>
}
```

## Error Handling

All methods throw errors in the following scenarios:

### No Workspace Selected

```typescript
try {
  await window.api.postsUpdatePost(post)
} catch (error) {
  // Error: "No workspace selected. Please select a workspace first."
}
```

### Permission Denied

```typescript
try {
  await window.api.postsUpdatePost(post)
} catch (error) {
  // Error: "Permission denied writing post {postId}. Please check file permissions."
}
```

### Disk Full

```typescript
try {
  await window.api.postsUpdatePost(post)
} catch (error) {
  // Error: "Disk full - cannot write post {postId}. Please free up disk space."
}
```

### Generic Errors

```typescript
try {
  await window.api.postsUpdatePost(post)
} catch (error) {
  // Error: "Failed to write post {postId}: {error message}"
}
```

## Best Practices

### 1. Auto-save on Changes

Use a debounced save to sync posts after edits:

```typescript
import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { selectPostById } from '@/store/postsSlice'

function useAutoSave(postId: string, delay = 2000) {
  const post = useSelector(selectPostById(postId))
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!post) return

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule save
    timeoutRef.current = setTimeout(async () => {
      try {
        await window.api.postsUpdatePost(post)
        console.log('Auto-saved post', postId)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [post, postId, delay])
}
```

### 2. Batch Sync on Workspace Change

Sync all posts when a workspace is opened or changed:

```typescript
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectPosts } from '@/store/postsSlice'

function useWorkspaceSync() {
  const posts = useSelector(selectPosts)

  useEffect(() => {
    const syncPosts = async () => {
      try {
        const result = await window.api.postsSyncToWorkspace(posts)

        if (!result.success) {
          console.error(`Failed to sync ${result.failedCount} posts`)
        }
      } catch (error) {
        console.error('Workspace sync failed:', error)
      }
    }

    // Sync whenever workspace changes (you'll need to track this)
    syncPosts()
  }, [posts])
}
```

### 3. Graceful Error Handling

Always handle errors gracefully and inform the user:

```typescript
import { toast } from '@/components/ui/toast'

async function savePost(post: Post) {
  try {
    await window.api.postsUpdatePost(post)
    toast.success('Post saved to workspace')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('No workspace selected')) {
      toast.error('Please select a workspace first')
    } else if (message.includes('Permission denied')) {
      toast.error('Cannot save: Permission denied. Check folder permissions.')
    } else if (message.includes('Disk full')) {
      toast.error('Cannot save: Disk is full. Please free up space.')
    } else {
      toast.error(`Failed to save post: ${message}`)
    }
  }
}
```

### 4. Loading State Management

Show loading states during sync operations:

```typescript
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectPosts } from '@/store/postsSlice'

function SyncButton() {
  const posts = useSelector(selectPosts)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const result = await window.api.postsSyncToWorkspace(posts)

      if (result.success) {
        console.log(`Synced ${result.syncedCount} posts`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync All Posts'}
    </button>
  )
}
```

## File Format

Posts are stored as JSON with pretty formatting for human readability:

```json
{
  "id": "abc123",
  "title": "My First Post",
  "blocks": [
    {
      "id": "block1",
      "content": "This is the first block"
    },
    {
      "id": "block2",
      "content": "This is the second block"
    }
  ],
  "category": "technology",
  "tags": ["javascript", "electron"],
  "visibility": "public",
  "createdAt": 1708531200000,
  "updatedAt": 1708531200000
}
```

## Implementation Details

### Atomic Writes

All write operations use atomic writes (write to temp file, then rename) to prevent corruption if the write is interrupted.

### Directory Creation

The `posts` directory is automatically created if it doesn't exist. No manual setup required.

### Idempotent Deletes

Deleting a post that doesn't exist will succeed without error (idempotent operation).

### Partial Sync Success

The `postsSyncToWorkspace` method will attempt to sync all posts, even if some fail. Check the result for details on failures.

## TypeScript Types

All types are automatically inferred from the preload script, but here's the structure for reference:

```typescript
interface Post {
  id: string
  title: string
  blocks: Array<{
    id: string
    content: string
  }>
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
}

interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors?: Array<{
    postId: string
    error: string
  }>
}
```
