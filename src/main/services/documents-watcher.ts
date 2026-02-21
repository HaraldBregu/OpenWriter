import chokidar, { type FSWatcher } from 'chokidar'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'

/**
 * Event payload for file system changes in the documents directory
 */
export interface DocumentFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  fileId: string
  filePath: string
  timestamp: number
}

/**
 * Configuration for the documents watcher
 */
interface WatcherConfig {
  /** Directory to watch (e.g., workspace/documents) */
  directory: string
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number
  /** How long to ignore a file after we write it (default: 2000ms) */
  ignoreWriteWindowMs?: number
}

/**
 * Track recently written files to prevent infinite loops
 */
interface IgnoredWrite {
  filePath: string
  timestamp: number
}

/**
 * DocumentsWatcherService monitors the documents directory for external file changes.
 *
 * Responsibilities:
 *   - Watch the {workspace}/documents/ directory for all file changes
 *   - Detect file creation, modification, and deletion events
 *   - Broadcast changes to renderer via EventBus
 *   - Prevent infinite loops by ignoring app-generated writes
 *   - Start/stop watching when workspace changes
 *   - Debounce rapid changes for performance
 *   - Handle errors gracefully with proper cleanup
 *
 * Architecture:
 *   - Uses chokidar for reliable cross-platform file watching
 *   - Integrates with WorkspaceService via EventBus events
 *   - Tracks recently written files to prevent feedback loops
 *   - Implements debouncing to batch rapid changes
 *
 * Lifecycle:
 *   1. Service is registered in bootstrap
 *   2. Listens to 'workspace:changed' events
 *   3. Starts watching when workspace is set
 *   4. Stops watching when workspace changes or app closes
 *
 * Usage:
 *   const watcher = new DocumentsWatcherService(eventBus)
 *   watcher.markFileAsWritten('/path/to/document/file.pdf') // Before writing
 *   // ... write file ...
 */
export class DocumentsWatcherService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentDirectory: string | null = null
  private ignoredWrites: IgnoredWrite[] = []
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private config: Required<Omit<WatcherConfig, 'directory'>>
  private workspaceEventUnsubscribe: (() => void) | null = null

  // Constants
  private readonly DOCS_DIR_NAME = 'documents'
  private readonly DEFAULT_DEBOUNCE_MS = 300
  private readonly DEFAULT_IGNORE_WINDOW_MS = 2000
  private readonly CLEANUP_INTERVAL_MS = 10000 // Clean up ignored writes every 10s

  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private readonly eventBus: EventBus) {
    this.config = {
      debounceMs: this.DEFAULT_DEBOUNCE_MS,
      ignoreWriteWindowMs: this.DEFAULT_IGNORE_WINDOW_MS
    }

    // Listen for workspace changes
    this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
      const payload = event.payload as { currentPath: string | null; previousPath: string | null }
      this.handleWorkspaceChange(payload.currentPath)
    })

    // Start periodic cleanup of old ignored writes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIgnoredWrites()
    }, this.CLEANUP_INTERVAL_MS)

    console.log('[DocumentsWatcherService] Initialized')
  }

  /**
   * Initialize the file watcher with the current workspace path.
   * This should be called after the service is constructed and workspace is loaded.
   *
   * @param workspacePath - Current workspace path, or null if no workspace
   */
  async initialize(workspacePath: string | null): Promise<void> {
    console.log('[DocumentsWatcherService] Initializing with workspace:', workspacePath)

    if (workspacePath) {
      await this.startWatching(workspacePath)
    }
  }

  /**
   * Start watching a directory.
   * Automatically determines the documents directory from workspace path.
   * Creates the directory if it doesn't exist.
   */
  async startWatching(workspacePath: string): Promise<void> {
    const docsDir = path.join(workspacePath, this.DOCS_DIR_NAME)

    // Don't restart if already watching the same directory
    if (this.currentDirectory === docsDir && this.watcher !== null) {
      console.log('[DocumentsWatcherService] Already watching:', docsDir)
      return
    }

    // Stop any existing watcher
    await this.stopWatching()

    // Ensure the documents directory exists before watching
    // chokidar cannot watch a non-existent directory
    try {
      await fs.mkdir(docsDir, { recursive: true })
    } catch (err) {
      console.error('[DocumentsWatcherService] Failed to create documents directory:', err)
      return
    }

    console.log('[DocumentsWatcherService] Starting to watch:', docsDir)

    try {
      this.watcher = chokidar.watch(docsDir, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50
        },
        usePolling: true,
        interval: 500,
        depth: 0,
        alwaysStat: false,
        ignored: (filePath: string) => {
          if (filePath === docsDir) return false
          // Ignore dotfiles and temp files
          const base = path.basename(filePath)
          if (base.startsWith('.') || base.endsWith('.tmp')) return true
          return false
        }
      })

      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileRemoved(filePath))
        .on('error', (error) => this.handleWatcherError(error))
        .on('ready', () => {
          console.log('[DocumentsWatcherService] Watcher ready, monitoring:', docsDir)
        })

      this.currentDirectory = docsDir
    } catch (error) {
      console.error('[DocumentsWatcherService] Failed to start watching:', error)
      this.watcher = null
      this.currentDirectory = null
      throw error
    }
  }

  /**
   * Stop watching the current directory.
   */
  async stopWatching(): Promise<void> {
    if (!this.watcher) {
      return
    }

    console.log('[DocumentsWatcherService] Stopping watcher for:', this.currentDirectory)

    try {
      await this.watcher.close()
    } catch (error) {
      console.error('[DocumentsWatcherService] Error closing watcher:', error)
    } finally {
      this.watcher = null
      this.currentDirectory = null
      this.clearAllDebounceTimers()
      this.ignoredWrites = []
    }
  }

  /**
   * Check if currently watching a directory.
   */
  isWatching(): boolean {
    return this.watcher !== null && this.currentDirectory !== null
  }

  /**
   * Get the currently watched directory.
   */
  getWatchedDirectory(): string | null {
    return this.currentDirectory
  }

  /**
   * Mark a file as recently written by the app.
   * This prevents the watcher from emitting a change event for this file.
   *
   * Call this BEFORE writing a file to prevent infinite loops.
   *
   * @param filePath - Absolute path to the file being written
   */
  markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.push({
      filePath: normalized,
      timestamp: Date.now()
    })

    console.log('[DocumentsWatcherService] Marked file as written (will ignore changes):', normalized)
  }

  /**
   * Update watcher configuration.
   * Restarts the watcher if currently watching.
   */
  async updateConfig(config: Partial<Omit<WatcherConfig, 'directory'>>): Promise<void> {
    this.config = {
      ...this.config,
      ...config
    }

    // Restart watcher if active
    if (this.currentDirectory) {
      const currentDir = this.currentDirectory
      await this.stopWatching()
      // Extract workspace path from documents directory
      const workspacePath = path.dirname(currentDir)
      await this.startWatching(workspacePath)
    }
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    console.log('[DocumentsWatcherService] Destroying...')

    // Unsubscribe from workspace events
    if (this.workspaceEventUnsubscribe) {
      this.workspaceEventUnsubscribe()
      this.workspaceEventUnsubscribe = null
    }

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Stop watching (async, but we don't await in destroy)
    this.stopWatching().catch((error) => {
      console.error('[DocumentsWatcherService] Error during destroy:', error)
    })

    console.log('[DocumentsWatcherService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Handle workspace change events.
   * Starts or stops watching based on the new workspace.
   */
  private handleWorkspaceChange(newWorkspacePath: string | null): void {
    if (newWorkspacePath) {
      console.log('[DocumentsWatcherService] Workspace changed, starting watcher for:', newWorkspacePath)
      this.startWatching(newWorkspacePath).catch((error) => {
        console.error('[DocumentsWatcherService] Failed to start watching new workspace:', error)
      })
    } else {
      console.log('[DocumentsWatcherService] Workspace cleared, stopping watcher')
      this.stopWatching().catch((error) => {
        console.error('[DocumentsWatcherService] Failed to stop watcher:', error)
      })
    }
  }

  /**
   * Handle file added event.
   */
  private handleFileAdded(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) {
      return
    }

    this.debouncedEmit(filePath, 'added')
  }

  /**
   * Handle file changed event.
   */
  private handleFileChanged(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) {
      return
    }

    this.debouncedEmit(filePath, 'changed')
  }

  /**
   * Handle file removed event.
   */
  private handleFileRemoved(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) {
      return
    }

    this.debouncedEmit(filePath, 'removed')
  }

  /**
   * Handle watcher errors.
   */
  private handleWatcherError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DocumentsWatcherService] Watcher error:', error)

    // Broadcast error to renderer for user notification
    this.eventBus.broadcast('documents:watcher-error', {
      error: errorMessage,
      timestamp: Date.now()
    })
  }

  /**
   * Check if a file should be ignored based on recent writes.
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const normalized = path.normalize(filePath)
    const now = Date.now()

    // Check if this file was recently written by the app
    const recentWrite = this.ignoredWrites.find(
      (ignored) =>
        ignored.filePath === normalized &&
        now - ignored.timestamp < this.config.ignoreWriteWindowMs
    )

    if (recentWrite) {
      console.log('[DocumentsWatcherService] Ignoring app-generated change for:', normalized)
      return true
    }

    return false
  }

  /**
   * Emit a file change event with debouncing.
   * Multiple rapid changes to the same file are batched.
   */
  private debouncedEmit(filePath: string, type: DocumentFileChangeEvent['type']): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.emitChangeEvent(filePath, type)
      this.debounceTimers.delete(filePath)
    }, this.config.debounceMs)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Emit a file change event to the renderer.
   */
  private emitChangeEvent(filePath: string, type: DocumentFileChangeEvent['type']): void {
    const fileId = this.extractFileIdFromFilePath(filePath)

    if (!fileId) {
      console.warn('[DocumentsWatcherService] Could not extract file ID from:', filePath)
      return
    }

    const event: DocumentFileChangeEvent = {
      type,
      fileId,
      filePath,
      timestamp: Date.now()
    }

    console.log('[DocumentsWatcherService] Document file', type, ':', fileId)

    // Broadcast to all renderer windows
    this.eventBus.broadcast('documents:file-changed', event)
  }

  /**
   * Extract file ID from file path.
   * Example: /workspace/documents/report.pdf -> report.pdf
   */
  private extractFileIdFromFilePath(filePath: string): string | null {
    const fileName = path.basename(filePath)
    // Basic validation - file IDs should not be empty
    return fileName || null
  }

  /**
   * Clear all pending debounce timers.
   */
  private clearAllDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  /**
   * Clean up old ignored writes to prevent memory leaks.
   */
  private cleanupIgnoredWrites(): void {
    const now = Date.now()
    const before = this.ignoredWrites.length

    this.ignoredWrites = this.ignoredWrites.filter(
      (ignored) => now - ignored.timestamp < this.config.ignoreWriteWindowMs
    )

    const removed = before - this.ignoredWrites.length
    if (removed > 0) {
      console.log(`[DocumentsWatcherService] Cleaned up ${removed} old ignored writes`)
    }
  }
}
