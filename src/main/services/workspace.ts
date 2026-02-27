import fs from 'node:fs'
import path from 'node:path'
import type { StoreService } from './store'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import { WORKSPACE_VALIDATION_INTERVAL_MS } from '../constants'

/**
 * Snapshot of the current workspace state.
 * Returned by getState() for a consistent, read-only view.
 */
export interface WorkspaceState {
  /** Absolute path to the current project directory, or null if none is set. */
  currentPath: string | null
  /** Timestamp (ms) when the current workspace was set. 0 if no workspace. */
  openedAt: number
}

/**
 * WorkspaceService manages the current project directory for the application.
 *
 * Responsibilities:
 *   - Hold the current workspace path in memory (starts as null)
 *   - Validate that the path exists and is a directory before accepting it
 *   - Persist the workspace path and recent history via StoreService
 *   - Emit 'workspace:changed' on the EventBus so other services can react
 *   - Optionally hydrate from the persisted store on initialization
 *
 * This service is registered once in the ServiceContainer and accessed by key.
 * It does NOT use the Singleton pattern -- the container enforces single-instance.
 */
export class WorkspaceService implements Disposable {
  private currentPath: string | null = null
  private openedAt: number = 0
  private validationTimer: ReturnType<typeof setInterval> | null = null

  /** How often (ms) to check if the workspace folder still exists. */
  private static readonly VALIDATION_INTERVAL_MS = WORKSPACE_VALIDATION_INTERVAL_MS

  constructor(
    private readonly store: StoreService,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Initialize the service by hydrating from the persisted store.
   * Call this after construction, once the app is ready.
   *
   * If the previously persisted workspace path still exists on disk,
   * it is restored as the current workspace (without re-emitting events).
   * If the path no longer exists, it is silently discarded.
   */
  initialize(): void {
    const persisted = this.store.getCurrentWorkspace()
    if (persisted && this.isValidDirectory(persisted)) {
      this.currentPath = persisted
      this.openedAt = Date.now()
      this.startValidationTimer()
      console.log('[WorkspaceService] Restored workspace from store:', persisted)
    } else if (persisted) {
      console.log('[WorkspaceService] Persisted workspace no longer exists, clearing:', persisted)
      this.store.clearCurrentWorkspace()
    } else {
      console.log('[WorkspaceService] No persisted workspace, starting with null')
    }
  }

  /**
   * Get the current workspace directory path.
   * Returns null if no workspace is set.
   */
  getCurrent(): string | null {
    return this.currentPath
  }

  /**
   * Get a snapshot of the full workspace state.
   */
  getState(): WorkspaceState {
    return {
      currentPath: this.currentPath,
      openedAt: this.openedAt
    }
  }

  /**
   * Set the current workspace directory.
   *
   * Validates that the path:
   *   1. Is a non-empty string
   *   2. Is an absolute path
   *   3. Exists on disk
   *   4. Is a directory (not a file)
   *
   * On success: updates in-memory state, persists to store, emits event.
   * On failure: throws a descriptive Error.
   */
  setCurrent(directoryPath: string): void {
    // Normalize the path to resolve .. and trailing slashes
    const normalized = path.resolve(directoryPath)

    this.validatePath(normalized)

    const previousPath = this.currentPath
    this.currentPath = normalized
    this.openedAt = Date.now()

    // Persist to store (adds to recent workspaces automatically)
    this.store.setCurrentWorkspace(normalized)

    console.log('[WorkspaceService] Workspace changed:', previousPath, '->', normalized)

    // Start periodic validation for the new workspace
    this.startValidationTimer()

    // Notify other services via EventBus (main-process listeners)
    this.eventBus.emit('workspace:changed', {
      currentPath: normalized,
      previousPath
    })

    // Broadcast to all renderer windows
    this.eventBus.broadcast('workspace:changed', {
      currentPath: normalized,
      previousPath
    })
  }

  /**
   * Clear the current workspace. Resets to the initial null state.
   */
  clear(): void {
    const previousPath = this.currentPath
    this.currentPath = null
    this.openedAt = 0

    this.stopValidationTimer()
    this.store.clearCurrentWorkspace()

    console.log('[WorkspaceService] Workspace cleared, was:', previousPath)

    this.eventBus.emit('workspace:changed', {
      currentPath: null,
      previousPath
    })

    // Broadcast to all renderer windows
    this.eventBus.broadcast('workspace:changed', {
      currentPath: null,
      previousPath
    })
  }

  /**
   * Get the list of recently opened workspaces from the persistent store.
   */
  getRecent(): Array<{ path: string; lastOpened: number }> {
    return this.store.getRecentWorkspaces()
  }

  /**
   * Remove a workspace from the recent workspaces list.
   */
  removeRecent(workspacePath: string): void {
    this.store.removeRecentWorkspace(workspacePath)
    console.log('[WorkspaceService] Removed from recent workspaces:', workspacePath)
  }

  /**
   * Check whether a workspace is currently set.
   */
  hasWorkspace(): boolean {
    return this.currentPath !== null
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    this.stopValidationTimer()
    console.log('[WorkspaceService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate that a path is suitable as a workspace directory.
   * Throws a descriptive error if validation fails.
   */
  private validatePath(absolutePath: string): void {
    if (!absolutePath || typeof absolutePath !== 'string') {
      throw new Error('Workspace path must be a non-empty string')
    }

    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`Workspace path must be absolute, got: ${absolutePath}`)
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Workspace path does not exist: ${absolutePath}`)
    }

    const stat = fs.statSync(absolutePath)
    if (!stat.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${absolutePath}`)
    }
  }

  /**
   * Quick check if a path is a valid, existing directory.
   * Returns false instead of throwing -- used during hydration.
   */
  private isValidDirectory(dirPath: string): boolean {
    try {
      const stat = fs.statSync(dirPath)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------------
  // Workspace folder validation (deletion detection)
  // ---------------------------------------------------------------------------

  /**
   * Start a periodic timer that checks whether the current workspace folder
   * still exists on disk. If the folder is found to be missing the workspace
   * is automatically cleared and a `workspace:deleted` event is emitted so
   * the renderer can redirect the user.
   */
  private startValidationTimer(): void {
    this.stopValidationTimer()

    this.validationTimer = setInterval(() => {
      if (!this.currentPath) {
        this.stopValidationTimer()
        return
      }

      if (!this.isValidDirectory(this.currentPath)) {
        console.warn(
          '[WorkspaceService] Workspace folder no longer exists:',
          this.currentPath
        )
        this.handleWorkspaceGone(this.currentPath)
      }
    }, WorkspaceService.VALIDATION_INTERVAL_MS)
  }

  /**
   * Stop the periodic validation timer.
   */
  private stopValidationTimer(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
      this.validationTimer = null
    }
  }

  /**
   * Called when the workspace folder is detected as missing.
   * Clears the workspace and notifies both the main-process services
   * and all renderer windows.
   */
  private handleWorkspaceGone(deletedPath: string): void {
    // Determine reason: if parent directory exists but the folder does not
    // it was likely deleted or renamed. Otherwise treat as inaccessible.
    let reason: 'deleted' | 'inaccessible' | 'renamed' = 'deleted'
    try {
      const parentDir = path.dirname(deletedPath)
      if (!fs.existsSync(parentDir)) {
        reason = 'inaccessible'
      }
    } catch {
      reason = 'inaccessible'
    }

    // Clear workspace state (this also stops the timer via clear())
    this.clear()

    const deletedEvent = {
      deletedPath,
      reason,
      timestamp: Date.now()
    }

    // Emit typed main-process event
    this.eventBus.emit('workspace:deleted', deletedEvent)

    // Broadcast to all renderer windows
    this.eventBus.broadcast('workspace:deleted', deletedEvent)

    console.log(
      '[WorkspaceService] Workspace gone event broadcast:',
      deletedPath,
      reason
    )
  }
}
