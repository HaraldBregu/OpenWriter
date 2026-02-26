import fs from 'node:fs'
import path from 'node:path'
import type { WorkspaceService } from './workspace'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single indexed directory entry persisted in the workspace.tsrct metadata file.
 */
export interface IndexedDirectory {
  /** Unique identifier for this directory entry */
  id: string
  /** Absolute path to the directory */
  path: string
  /** Timestamp when the directory was added */
  addedAt: number
  /** Whether the directory has been indexed by the RAG pipeline */
  isIndexed: boolean
  /** Timestamp of the last successful indexing, if any */
  lastIndexedAt?: number
}

/**
 * Settings block in the workspace.tsrct metadata file.
 */
export interface WorkspaceSettings {
  directories: IndexedDirectory[]
}

/**
 * Full schema for the workspace.tsrct metadata file.
 */
export interface WorkspaceMetadata {
  metadata: {
    version: number
    createdAt: number
    updatedAt: number
  }
  settings: WorkspaceSettings
}

/**
 * Result of a directory validation check.
 */
export interface DirectoryValidationResult {
  valid: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METADATA_FILENAME = 'workspace.tsrct'
const METADATA_VERSION = 1
const DEBOUNCE_MS = 800

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * WorkspaceMetadataService manages the workspace.tsrct metadata file in the workspace root.
 *
 * Pattern: Repository + Observer
 * - Repository: Encapsulates all read/write operations for the workspace.tsrct file
 * - Observer: Emits events via EventBus when directories change so other
 *   services (e.g. DocumentsWatcherService, RAG pipeline) can react
 *
 * Design decisions:
 * - No caching: Always reads fresh data from file to reflect external edits
 * - Debounced writes: Prevents excessive file I/O when multiple directories
 *   are added in quick succession (e.g. multi-select dialog)
 * - Validation before add: Checks existence, is-directory, permissions,
 *   duplicates, and symlink resolution before accepting a path
 * - Workspace-relative storage: Paths are stored as absolute in the file
 *   but validated against the current workspace context
 * - Atomic reads: Always reads the full file, never partial updates
 */
export class WorkspaceMetadataService implements Disposable {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingWrite: { metadata: WorkspaceMetadata; workspacePath: string } | null = null
  private cache: { metadata: WorkspaceMetadata; workspacePath: string } | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Initialize the service by loading metadata from the current workspace.
   * If no workspace is set, this is a no-op.
   * If the workspace.tsrct file does not exist, it will be created on the first write.
   */
  initialize(): void {
    const workspacePath = this.workspaceService.getCurrent()

    // CRITICAL: Always clear cache on initialization to ensure fresh data
    // This is especially important in workspace mode where the service is initialized
    // before the workspace path is set, then reinitialized after
    console.log('[WorkspaceMetadataService] Clearing cache before initialization')
    this.cache = null

    if (workspacePath) {
      const metadata = this.readMetadataFile(workspacePath)
      console.log(
        '[WorkspaceMetadataService] Initialized with',
        metadata?.settings.directories.length ?? 0,
        'directories from',
        workspacePath
      )
    } else {
      console.log('[WorkspaceMetadataService] No workspace set, starting empty')
    }

    // Listen for workspace changes to re-initialize
    // Note: Only register listener once (check if already registered)
    this.eventBus.on('workspace:changed', (event) => {
      const payload = event.payload as { currentPath: string | null; previousPath: string | null }
      this.handleWorkspaceChanged(payload.currentPath)
    })
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get all indexed directories from the current workspace metadata.
   * Returns an empty array if no workspace is set or no directories exist.
   */
  getDirectories(): IndexedDirectory[] {
    const workspacePath = this.workspaceService.getCurrent()
    const directories = this.getMetadata().settings.directories
    console.log(
      '[WorkspaceMetadataService] getDirectories called:',
      'PID=', process.pid,
      'workspace=', workspacePath,
      'count=', directories.length,
      'cached=', this.cache !== null && this.cache.workspacePath === workspacePath,
      'paths=', directories.map(d => d.path).join(', ')
    )
    return directories
  }

  /**
   * Add a directory to the workspace metadata.
   *
   * Validates the path before adding:
   * 1. Must be non-empty and absolute
   * 2. Must exist on disk
   * 3. Must be a directory (not a file)
   * 4. Must be readable
   * 5. Must not already be tracked (after resolving symlinks)
   *
   * @returns The created IndexedDirectory entry
   * @throws Error if validation fails or no workspace is set
   */
  addDirectory(dirPath: string): IndexedDirectory {
    this.requireWorkspace()

    const normalized = path.resolve(dirPath)
    const validation = this.validateDirectory(normalized)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const metadata = this.getMetadata()

    // Resolve symlinks for duplicate detection
    const realPath = this.resolveRealPath(normalized)
    const duplicate = metadata.settings.directories.find((d) => {
      return this.resolveRealPath(d.path) === realPath
    })
    if (duplicate) {
      throw new Error(
        `Directory already tracked: "${duplicate.path}" (resolves to same location)`
      )
    }

    const entry: IndexedDirectory = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      path: normalized,
      addedAt: Date.now(),
      isIndexed: false
    }

    metadata.settings.directories.push(entry)
    metadata.metadata.updatedAt = Date.now()

    this.scheduleSave(metadata)
    this.emitDirectoriesChanged()

    console.log('[WorkspaceMetadataService] Added directory:', normalized)
    return entry
  }

  /**
   * Add multiple directories at once (e.g. from a multi-select dialog).
   * Skips invalid or duplicate paths and returns only the successfully added entries.
   *
   * @returns Object with added entries and any errors encountered
   */
  addDirectories(dirPaths: string[]): {
    added: IndexedDirectory[]
    errors: Array<{ path: string; error: string }>
  } {
    this.requireWorkspace()

    const added: IndexedDirectory[] = []
    const errors: Array<{ path: string; error: string }> = []

    for (const dirPath of dirPaths) {
      try {
        const entry = this.addDirectory(dirPath)
        added.push(entry)
      } catch (err) {
        errors.push({
          path: dirPath,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    return { added, errors }
  }

  /**
   * Remove a directory by its ID.
   * @returns true if the directory was found and removed, false otherwise
   */
  removeDirectory(id: string): boolean {
    const metadata = this.getMetadata()
    const index = metadata.settings.directories.findIndex((d) => d.id === id)
    if (index === -1) {
      return false
    }

    const removed = metadata.settings.directories.splice(index, 1)[0]
    metadata.metadata.updatedAt = Date.now()

    this.scheduleSave(metadata)
    this.emitDirectoriesChanged()

    console.log('[WorkspaceMetadataService] Removed directory:', removed.path)
    return true
  }

  /**
   * Update the indexing status of a directory.
   * Called by the RAG pipeline after indexing completes.
   */
  markDirectoryIndexed(id: string, isIndexed: boolean): boolean {
    const metadata = this.getMetadata()
    const entry = metadata.settings.directories.find((d) => d.id === id)
    if (!entry) {
      return false
    }

    entry.isIndexed = isIndexed
    if (isIndexed) {
      entry.lastIndexedAt = Date.now()
    }
    metadata.metadata.updatedAt = Date.now()

    this.scheduleSave(metadata)
    return true
  }

  /**
   * Validate a directory path without adding it.
   * Useful for UI validation before presenting confirmation.
   */
  validateDirectory(dirPath: string): DirectoryValidationResult {
    if (!dirPath || typeof dirPath !== 'string') {
      return { valid: false, error: 'Directory path must be a non-empty string' }
    }

    const normalized = path.resolve(dirPath)

    if (!path.isAbsolute(normalized)) {
      return { valid: false, error: `Path must be absolute, got: ${dirPath}` }
    }

    if (!fs.existsSync(normalized)) {
      return { valid: false, error: `Directory does not exist: ${normalized}` }
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(normalized)
    } catch (err) {
      return {
        valid: false,
        error: `Cannot stat path: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (!stat.isDirectory()) {
      return { valid: false, error: `Path is not a directory: ${normalized}` }
    }

    // Check read permission
    try {
      fs.accessSync(normalized, fs.constants.R_OK)
    } catch {
      return { valid: false, error: `No read permission for directory: ${normalized}` }
    }

    return { valid: true }
  }

  /**
   * Force an immediate save of the current metadata to disk.
   * Cancels any pending debounced write.
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.pendingWrite) {
      this.writeMetadataFile(this.pendingWrite.metadata, this.pendingWrite.workspacePath)
      this.pendingWrite = null
    }
  }

  /**
   * Clean up resources on shutdown.
   * Flushes any pending writes to ensure data is not lost.
   */
  destroy(): void {
    this.flush()
    console.log('[WorkspaceMetadataService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the current metadata, using cache if available for the current workspace,
   * otherwise reading from file.
   *
   * CRITICAL: Uses in-memory cache to ensure pending changes are visible to subsequent
   * operations (e.g., duplicate detection when adding multiple directories).
   * Cache is invalidated when workspace changes.
   */
  private getMetadata(): WorkspaceMetadata {
    const workspacePath = this.workspaceService.getCurrent()
    if (!workspacePath) {
      console.log('[WorkspaceMetadataService] getMetadata: No workspace set, returning defaults')
      return this.createDefaultMetadata()
    }

    // Return cached metadata if it's for the current workspace
    if (this.cache && this.cache.workspacePath === workspacePath) {
      console.log('[WorkspaceMetadataService] getMetadata: Using cache for', workspacePath)
      return this.cache.metadata
    }

    // Cache miss or workspace changed - read from file
    console.log('[WorkspaceMetadataService] getMetadata: Reading from file for', workspacePath)
    const metadata = this.readMetadataFile(workspacePath) ?? this.createDefaultMetadata()

    // Update cache
    this.cache = { metadata, workspacePath }

    return metadata
  }

  /**
   * Ensure a workspace is currently set. Throws if not.
   */
  private requireWorkspace(): void {
    if (!this.workspaceService.getCurrent()) {
      throw new Error('No workspace is currently set. Please select a workspace first.')
    }
  }

  /**
   * Get the full path to the workspace.tsrct file in the given workspace.
   */
  private getMetadataFilePath(workspacePath: string): string {
    return path.join(workspacePath, METADATA_FILENAME)
  }

  /**
   * Read and parse the workspace.tsrct file from a workspace directory.
   * Returns null if the file does not exist or is invalid.
   */
  private readMetadataFile(workspacePath: string): WorkspaceMetadata | null {
    const filePath = this.getMetadataFilePath(workspacePath)

    console.log('[WorkspaceMetadataService] readMetadataFile:',
      'PID=', process.pid,
      'file=', filePath,
      'exists=', fs.existsSync(filePath))

    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as WorkspaceMetadata

      // Basic schema validation
      if (!parsed.metadata || !parsed.settings) {
        console.warn('[WorkspaceMetadataService] Invalid metadata file schema, using defaults')
        return null
      }

      // Ensure directories array exists
      if (!Array.isArray(parsed.settings.directories)) {
        parsed.settings.directories = []
      }

      console.log('[WorkspaceMetadataService] Read', parsed.settings.directories.length, 'directories from', filePath,
        'paths=', parsed.settings.directories.map(d => d.path).join(', '))

      return parsed
    } catch (err) {
      console.error('[WorkspaceMetadataService] Failed to read metadata file:', err)
      return null
    }
  }

  /**
   * Write the metadata to the workspace.tsrct file in the specified workspace.
   * @param metadata - The metadata to write
   * @param workspacePath - The workspace path to write to (required to handle workspace switches)
   */
  private writeMetadataFile(metadata: WorkspaceMetadata, workspacePath: string): void {
    if (!workspacePath) {
      console.warn('[WorkspaceMetadataService] No workspace path provided, cannot save metadata')
      return
    }

    const filePath = this.getMetadataFilePath(workspacePath)

    try {
      const content = JSON.stringify(metadata, null, 2)
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log('[WorkspaceMetadataService] Saved metadata to:', filePath)
    } catch (err) {
      console.error('[WorkspaceMetadataService] Failed to write metadata file:', err)
      throw new Error(
        `Failed to save workspace metadata: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Schedule a debounced save. Multiple calls within DEBOUNCE_MS will
   * coalesce into a single write.
   *
   * CRITICAL: Captures the current workspace path to ensure writes go to the
   * correct workspace even if the user switches workspaces before the timer fires.
   * Also updates the cache to ensure pending changes are visible immediately.
   */
  private scheduleSave(metadata: WorkspaceMetadata): void {
    const workspacePath = this.workspaceService.getCurrent()
    if (!workspacePath) {
      console.warn('[WorkspaceMetadataService] No workspace set, cannot schedule save')
      return
    }

    this.pendingWrite = { metadata, workspacePath }

    // Update cache so pending changes are immediately visible
    this.cache = { metadata, workspacePath }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      if (this.pendingWrite) {
        this.writeMetadataFile(this.pendingWrite.metadata, this.pendingWrite.workspacePath)
        this.pendingWrite = null
      }
    }, DEBOUNCE_MS)
  }

  /**
   * Create a fresh default metadata structure.
   */
  private createDefaultMetadata(): WorkspaceMetadata {
    const now = Date.now()
    return {
      metadata: {
        version: METADATA_VERSION,
        createdAt: now,
        updatedAt: now
      },
      settings: {
        directories: []
      }
    }
  }

  /**
   * Resolve a path through symlinks to its real filesystem location.
   * Falls back to the original path if resolution fails (e.g. broken symlink).
   */
  private resolveRealPath(dirPath: string): string {
    try {
      return fs.realpathSync(dirPath)
    } catch {
      return dirPath
    }
  }

  /**
   * Handle workspace change events.
   * Flushes any pending writes for the old workspace, clears cache, then emits directory changes.
   */
  private handleWorkspaceChanged(newPath: string | null): void {
    console.log('[WorkspaceMetadataService] ========== WORKSPACE CHANGED ==========')
    console.log('[WorkspaceMetadataService] New workspace:', newPath)
    console.log('[WorkspaceMetadataService] Cache before clear:', this.cache?.workspacePath, 'dirs=', this.cache?.metadata.settings.directories.length)
    console.log('[WorkspaceMetadataService] Pending write:', this.pendingWrite?.workspacePath, 'dirs=', this.pendingWrite?.metadata.settings.directories.length)

    // Flush pending writes for the previous workspace
    // The flush() method will write to the correct workspace path because
    // we captured it in scheduleSave()
    this.flush()

    // Clear cache to force fresh read from new workspace
    const oldCache = this.cache
    this.cache = null
    console.log('[WorkspaceMetadataService] Cache cleared (was for workspace:', oldCache?.workspacePath, ')')

    if (newPath) {
      const metadata = this.readMetadataFile(newPath)
      console.log(
        '[WorkspaceMetadataService] Switched workspace, loaded',
        metadata?.settings.directories.length ?? 0,
        'directories from',
        newPath
      )
    } else {
      console.log('[WorkspaceMetadataService] Workspace cleared, metadata reset')
    }

    console.log('[WorkspaceMetadataService] About to emit directories:changed event')
    this.emitDirectoriesChanged()
    console.log('[WorkspaceMetadataService] ========== END WORKSPACE CHANGED ==========')
  }

  /**
   * Broadcast directory changes to renderer windows.
   * Always reads fresh data from file.
   */
  private emitDirectoriesChanged(): void {
    const workspacePath = this.workspaceService.getCurrent()
    const directories = this.getDirectories()
    console.log('[WorkspaceMetadataService] emitDirectoriesChanged:',
      'PID=', process.pid,
      'workspace=', workspacePath,
      'broadcasting', directories.length, 'directories',
      'paths=', directories.map(d => d.path).join(', '))
    this.eventBus.broadcast('directories:changed', directories)
  }
}
