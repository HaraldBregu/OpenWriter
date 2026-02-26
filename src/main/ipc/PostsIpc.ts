import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { FileWatcherService } from '../services/file-watcher'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { PostsChannels } from '../../shared/types/ipc/channels'

/**
 * Post structure from the renderer process.
 * Must match the Post interface in src/renderer/src/store/postsSlice.ts
 */
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

/**
 * Result type for sync operations
 */
interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors?: Array<{ postId: string; error: string }>
}

/**
 * IPC handlers for syncing posts to the filesystem.
 *
 * Responsibilities:
 *   - Sync posts from renderer to workspace directory
 *   - Create/update individual post files
 *   - Delete post files
 *   - Ensure posts directory exists
 *   - Handle atomic writes to prevent corruption
 *   - Provide detailed error reporting
 *
 * File format: JSON files named {postId}.json in a "posts" subdirectory
 */
export class PostsIpc implements IpcModule {
  readonly name = 'posts'

  private readonly POSTS_DIR_NAME = 'posts'
  private readonly FILE_EXTENSION = '.json'

  // Simple in-memory cache to avoid re-reading unchanged files
  private loadCache: {
    workspacePath: string | null
    timestamp: number
    posts: Post[]
  } | null = null

  private readonly CACHE_TTL_MS = 5000 // 5 seconds cache validity

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Sync all posts to the workspace directory.
     * Creates the posts directory if needed and writes each post as a JSON file.
     *
     * Channel: 'posts:sync-to-workspace'
     * Input: Post[] - Array of posts to sync
     * Output: SyncResult - Summary of sync operation
     */
    ipcMain.handle(
      PostsChannels.syncToWorkspace,
      wrapIpcHandler(async (event: IpcMainInvokeEvent, posts: Post[]): Promise<SyncResult> => {
        // Get window-scoped services
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileWatcher = this.tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')

        const currentWorkspace = workspace.getCurrent()

        // Validate workspace is set
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const postsDir = path.join(currentWorkspace, this.POSTS_DIR_NAME)

        // Ensure posts directory exists
        await this.ensurePostsDirectory(postsDir)

        // Sync each post
        const results = await Promise.allSettled(
          posts.map((post) => this.writePostFile(postsDir, post, fileWatcher))
        )

        // Aggregate results
        const errors: Array<{ postId: string; error: string }> = []
        let syncedCount = 0
        let failedCount = 0

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            syncedCount++
          } else {
            failedCount++
            errors.push({
              postId: posts[index].id,
              error: result.reason.message || String(result.reason)
            })
          }
        })

        console.log(
          `[PostsIpc] Synced ${syncedCount} posts, ${failedCount} failed to ${postsDir}`
        )

        // Invalidate cache after sync
        this.invalidateCache()

        return {
          success: failedCount === 0,
          syncedCount,
          failedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      }, PostsChannels.syncToWorkspace)
    )

    /**
     * Update/create a single post file.
     *
     * Channel: 'posts:update-post'
     * Input: Post - Single post to update
     * Output: void
     */
    ipcMain.handle(
      PostsChannels.updatePost,
      wrapIpcHandler(async (event: IpcMainInvokeEvent, post: Post): Promise<void> => {
        // Get window-scoped services
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileWatcher = this.tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const postsDir = path.join(currentWorkspace, this.POSTS_DIR_NAME)
        await this.ensurePostsDirectory(postsDir)
        await this.writePostFile(postsDir, post, fileWatcher)

        console.log(`[PostsIpc] Updated post ${post.id}`)

        // Invalidate cache after update
        this.invalidateCache()
      }, PostsChannels.updatePost)
    )

    /**
     * Delete a post file.
     *
     * Channel: 'posts:delete-post'
     * Input: string - Post ID to delete
     * Output: void
     */
    ipcMain.handle(
      PostsChannels.deletePost,
      wrapIpcHandler(async (event: IpcMainInvokeEvent, postId: string): Promise<void> => {
        // Get window-scoped services
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileWatcher = this.tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const postsDir = path.join(currentWorkspace, this.POSTS_DIR_NAME)
        const postFilePath = this.getPostFilePath(postsDir, postId)

        try {
          // Mark file as app-written before deleting (prevents watcher from emitting event)
          if (fileWatcher) {
            fileWatcher.markFileAsWritten(postFilePath)
          }

          await fs.unlink(postFilePath)
          console.log(`[PostsIpc] Deleted post file: ${postFilePath}`)

          // Invalidate cache after delete
          this.invalidateCache()
        } catch (err) {
          // If file doesn't exist, that's okay (idempotent delete)
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw new Error(`Failed to delete post ${postId}: ${(err as Error).message}`)
          }
          console.log(`[PostsIpc] Post ${postId} already deleted (file not found)`)
        }
      }, PostsChannels.deletePost)
    )

    /**
     * Load all posts from the workspace directory.
     *
     * Channel: 'posts:load-from-workspace'
     * Input: none
     * Output: Post[] - Array of posts loaded from files
     *
     * Features:
     *   - Short-term caching (5s) to avoid redundant disk reads
     *   - Graceful handling of missing directory
     *   - Detailed error logging for parse failures
     *   - Validates post structure
     */
    ipcMain.handle(
      PostsChannels.loadFromWorkspace,
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<Post[]> => {
        // Get window-scoped workspace service
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          console.warn('[PostsIpc] Load attempt with no workspace selected')
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        // Check cache validity
        const now = Date.now()
        if (
          this.loadCache &&
          this.loadCache.workspacePath === currentWorkspace &&
          now - this.loadCache.timestamp < this.CACHE_TTL_MS
        ) {
          console.log(
            `[PostsIpc] Returning ${this.loadCache.posts.length} cached posts (age: ${now - this.loadCache.timestamp}ms)`
          )
          return this.loadCache.posts
        }

        const postsDir = path.join(currentWorkspace, this.POSTS_DIR_NAME)

        console.log(`[PostsIpc] Loading posts from: ${postsDir}`)

        // Check if posts directory exists
        try {
          await fs.access(postsDir)
        } catch {
          // Posts directory doesn't exist yet, return empty array
          console.log('[PostsIpc] Posts directory does not exist, returning empty array')
          this.loadCache = { workspacePath: currentWorkspace, timestamp: now, posts: [] }
          return []
        }

        // Read all JSON files in the posts directory
        let files: string[]
        try {
          files = await fs.readdir(postsDir)
        } catch (err) {
          const error = err as NodeJS.ErrnoException
          if (error.code === 'EACCES') {
            throw new Error(
              `Permission denied reading posts directory: ${postsDir}. ` +
                'Please check directory permissions.'
            )
          }
          throw new Error(`Failed to read posts directory: ${error.message}`)
        }

        const jsonFiles = files.filter((file) => file.endsWith(this.FILE_EXTENSION))
        console.log(`[PostsIpc] Found ${jsonFiles.length} JSON files in posts directory`)

        const posts: Post[] = []
        const errors: Array<{ file: string; error: string }> = []

        for (const file of jsonFiles) {
          try {
            const filePath = path.join(postsDir, file)
            const content = await fs.readFile(filePath, 'utf-8')

            // Parse and validate
            const post = JSON.parse(content) as Post

            // Basic validation - check field existence, not truthiness
            // (empty strings are valid for title)
            if (!post.id || post.title === undefined || !Array.isArray(post.blocks)) {
              errors.push({
                file,
                error: 'Invalid post structure: missing required fields (id, title, or blocks)'
              })
              continue
            }

            posts.push(post)
          } catch (err) {
            const error = err as Error
            errors.push({
              file,
              error:
                error.name === 'SyntaxError'
                  ? `Invalid JSON: ${error.message}`
                  : `Failed to load: ${error.message}`
            })
          }
        }

        // Log detailed errors
        if (errors.length > 0) {
          console.warn(
            `[PostsIpc] Failed to load ${errors.length} of ${jsonFiles.length} posts:`,
            errors
          )
        }

        console.log(
          `[PostsIpc] Successfully loaded ${posts.length} posts from workspace (${errors.length} failed)`
        )

        // Update cache
        this.loadCache = { workspacePath: currentWorkspace, timestamp: now, posts }

        return posts
      }, PostsChannels.loadFromWorkspace)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Try to get a window-scoped service, returning null if not found.
   * Useful for optional services like FileWatcherService.
   */
  private tryGetWindowService<T>(
    event: IpcMainInvokeEvent,
    container: ServiceContainer,
    serviceKey: string
  ): T | null {
    try {
      return getWindowService<T>(event, container, serviceKey)
    } catch {
      return null
    }
  }

  /**
   * Invalidate the load cache.
   * Called after any mutation operation (sync, update, delete).
   */
  private invalidateCache(): void {
    if (this.loadCache) {
      console.log('[PostsIpc] Cache invalidated')
      this.loadCache = null
    }
  }

  /**
   * Ensure the posts directory exists, creating it if necessary.
   * Handles permission errors appropriately.
   */
  private async ensurePostsDirectory(postsDir: string): Promise<void> {
    try {
      await fs.access(postsDir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist, create it
        try {
          await fs.mkdir(postsDir, { recursive: true })
          console.log(`[PostsIpc] Created posts directory: ${postsDir}`)
        } catch (mkdirErr) {
          throw new Error(
            `Failed to create posts directory: ${(mkdirErr as Error).message}. ` +
              'Please check directory permissions.'
          )
        }
      } else if ((err as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(
          `Permission denied accessing posts directory: ${postsDir}. ` +
            'Please check directory permissions.'
        )
      } else {
        throw new Error(`Failed to access posts directory: ${(err as Error).message}`)
      }
    }
  }

  /**
   * Get the file path for a post by ID.
   */
  private getPostFilePath(postsDir: string, postId: string): string {
    return path.join(postsDir, `${postId}${this.FILE_EXTENSION}`)
  }

  /**
   * Write a post to disk using atomic write pattern.
   * Uses a temporary file and rename to prevent corruption.
   */
  private async writePostFile(
    postsDir: string,
    post: Post,
    fileWatcher: FileWatcherService | null
  ): Promise<void> {
    const filePath = this.getPostFilePath(postsDir, post.id)
    const tempFilePath = `${filePath}.tmp`

    try {
      // Mark file as app-written BEFORE writing (prevents watcher from emitting event)
      if (fileWatcher) {
        fileWatcher.markFileAsWritten(filePath)
      }

      // Serialize post to JSON with pretty formatting for human readability
      const jsonContent = JSON.stringify(post, null, 2)

      // Write to temporary file first
      await fs.writeFile(tempFilePath, jsonContent, 'utf-8')

      // Atomic rename - this ensures we never have a partially written file
      await fs.rename(tempFilePath, filePath)

      console.log(`[PostsIpc] Wrote post ${post.id} to ${filePath}`)
    } catch (err) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFilePath)
      } catch {
        // Ignore cleanup errors
      }

      // Handle specific error cases
      if ((err as NodeJS.ErrnoException).code === 'ENOSPC') {
        throw new Error(
          `Disk full - cannot write post ${post.id}. Please free up disk space.`
        )
      } else if ((err as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(
          `Permission denied writing post ${post.id}. Please check file permissions.`
        )
      } else {
        throw new Error(`Failed to write post ${post.id}: ${(err as Error).message}`)
      }
    }
  }
}
