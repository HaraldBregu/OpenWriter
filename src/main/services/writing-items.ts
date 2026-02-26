import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import type { WorkspaceService } from './workspace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of a writing item.
 * Stored verbatim in config.json so values must remain stable across versions.
 */
export type WritingItemStatus = 'draft' | 'in-progress' | 'complete' | 'archived'

/** Exhaustive list of valid statuses for runtime validation. */
export const VALID_WRITING_ITEM_STATUSES: readonly WritingItemStatus[] = [
  'draft',
  'in-progress',
  'complete',
  'archived',
] as const

/**
 * Metadata block stored inside config.json for each writing item folder.
 */
export interface WritingItemMetadata {
  /** Human-readable title chosen by the user */
  title: string
  /** Current editorial status */
  status: WritingItemStatus
  /** Free-form category string (e.g. "blog", "story", "notes") */
  category: string
  /** User-defined tag list */
  tags: string[]
  /** ISO 8601 creation timestamp */
  createdAt: string
  /** ISO 8601 last-update timestamp */
  updatedAt: string
}

/**
 * Full writing item structure returned to the renderer.
 */
export interface WritingItem {
  /**
   * Stable folder name used as the item identifier.
   * Format: YYYY-MM-DD_HHmmss
   */
  id: string
  /** Absolute path to the folder on disk */
  path: string
  /** Parsed config.json */
  metadata: WritingItemMetadata
  /** Raw markdown content from content.md */
  content: string
  /** Unix timestamp (ms) derived from metadata.createdAt or folder mtime */
  savedAt: number
}

/**
 * Input for creating a new writing item.
 */
export interface CreateWritingItemInput {
  title: string
  content?: string
  status?: WritingItemStatus
  category?: string
  tags?: string[]
}

/**
 * Result returned after creating or saving a writing item.
 */
export interface WriteWritingItemResult {
  id: string
  path: string
  savedAt: number
}

/**
 * Input for saving (updating) an existing writing item.
 * Partial — only supplied fields are mutated; the rest are preserved.
 */
export interface SaveWritingItemInput {
  title?: string
  content?: string
  status?: WritingItemStatus
  category?: string
  tags?: string[]
}

/**
 * Payload emitted via EventBus when a writing item changes on disk.
 */
export interface WritingItemChangeEvent {
  type: 'added' | 'changed' | 'removed'
  itemId: string
  itemPath: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WRITINGS_DIR_NAME = 'writings'
const CONFIG_FILENAME = 'config.json'
const CONTENT_FILENAME = 'content.md'
const DEBOUNCE_MS = 300
const IGNORE_WRITE_WINDOW_MS = 2000
const CLEANUP_INTERVAL_MS = 10_000

// Matches the folder naming convention: YYYY-MM-DD_HHmmss
const DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}_\d{6}$/

const DEFAULT_STATUS: WritingItemStatus = 'draft'

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * WritingItemsService manages writing item files in the workspace.
 *
 * Responsibilities:
 *   - Create writing items as folder-based format (config.json + content.md)
 *   - Load all writing items from workspace
 *   - Load a specific writing item by ID
 *   - Save (update) an existing writing item
 *   - Delete writing items
 *   - Watch for external file changes and notify the renderer
 *   - Prevent watcher infinite-loops for app-initiated writes
 *   - React to workspace changes (switch / clear)
 *
 * File structure:
 *   <workspace>/writings/<YYYY-MM-DD_HHmmss>/
 *     +-- config.json   (WritingItemMetadata)
 *     +-- content.md    (raw markdown text)
 *
 * The folder name is the stable, URL-safe identifier for every item.
 *
 * Broadcast events:
 *   - 'writing-items:file-changed'  { type, itemId, itemPath, timestamp }
 *   - 'writing-items:watcher-error' { error, timestamp }
 */
export class WritingItemsService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentWritingsDir: string | null = null
  private ignoredWrites = new Set<string>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly workspace: WorkspaceService,
    private readonly eventBus: EventBus
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the service.
   * Starts watching the current workspace (if any) and subscribes to future
   * workspace-change events so the watcher is restarted automatically.
   */
  async initialize(): Promise<void> {
    console.log('[WritingItemsService] Initializing...')

    // Subscribe to workspace changes so we restart the watcher on switch
    this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
      const payload = event.payload as { currentPath: string | null; previousPath: string | null }
      this.handleWorkspaceChange(payload.currentPath)
    })

    // Periodic no-op cleanup (ignoredWrites entries self-expire via setTimeout)
    this.cleanupInterval = setInterval(() => {
      /* intentional no-op — entries are removed by their own setTimeout */
    }, CLEANUP_INTERVAL_MS)
    this.cleanupInterval.unref?.()

    const currentWorkspace = this.workspace.getCurrent()
    if (currentWorkspace) {
      await this.startWatching(currentWorkspace)
    }

    console.log('[WritingItemsService] Initialized')
  }

  /**
   * Cleanup on app shutdown.
   */
  destroy(): void {
    console.log('[WritingItemsService] Destroying...')

    if (this.workspaceEventUnsubscribe) {
      this.workspaceEventUnsubscribe()
      this.workspaceEventUnsubscribe = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.stopWatching().catch((err) => {
      console.error('[WritingItemsService] Error during destroy:', err)
    })

    console.log('[WritingItemsService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Create a new writing item in the current workspace.
   *
   * Creates:
   *   writings/<YYYY-MM-DD_HHmmss>/config.json
   *   writings/<YYYY-MM-DD_HHmmss>/content.md
   *
   * The folder name is the stable item ID.
   *
   * @throws Error if no workspace is set or title is empty
   */
  async create(input: CreateWritingItemInput): Promise<WriteWritingItemResult> {
    const currentWorkspace = this.requireWorkspace()

    if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
      throw new Error('Writing item title must be a non-empty string.')
    }

    if (input.status !== undefined && !this.isValidStatus(input.status)) {
      throw new Error(
        `Invalid status "${input.status}". Must be one of: ${VALID_WRITING_ITEM_STATUSES.join(', ')}`
      )
    }

    const writingsDir = path.join(currentWorkspace, WRITINGS_DIR_NAME)
    await this.ensureDirectory(writingsDir)

    const timestamp = Date.now()
    const folderName = this.formatDateFolderName(timestamp)
    const folderPath = path.join(writingsDir, folderName)

    await this.ensureDirectory(folderPath)

    const now = new Date(timestamp).toISOString()
    const metadata: WritingItemMetadata = {
      title: input.title.trim(),
      status: input.status ?? DEFAULT_STATUS,
      category: input.category ?? '',
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }

    const configPath = path.join(folderPath, CONFIG_FILENAME)
    const contentPath = path.join(folderPath, CONTENT_FILENAME)
    const contentText = input.content ?? ''

    // Mark as app-written before touching disk so the watcher ignores these events
    this.markFileAsWritten(folderPath)
    this.markFileAsWritten(configPath)
    this.markFileAsWritten(contentPath)

    await Promise.all([
      fs.writeFile(configPath, JSON.stringify(metadata, null, 2), 'utf-8'),
      fs.writeFile(contentPath, contentText, 'utf-8'),
    ])

    console.log(`[WritingItemsService] Created writing item: ${folderPath}`)

    return { id: folderName, path: folderPath, savedAt: timestamp }
  }

  /**
   * Load all writing items from the current workspace.
   * Returns an empty array if no workspace is set or no items exist yet.
   */
  async loadAll(): Promise<WritingItem[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[WritingItemsService] loadAll called with no workspace')
      return []
    }

    const writingsDir = path.join(currentWorkspace, WRITINGS_DIR_NAME)

    try {
      await fs.access(writingsDir)
    } catch {
      console.log('[WritingItemsService] Writings directory does not exist yet, returning []')
      return []
    }

    const entries = await fs.readdir(writingsDir, { withFileTypes: true })
    const items: WritingItem[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (!entry.isDirectory()) continue
      if (!DATE_FOLDER_RE.test(entry.name)) continue

      const folderPath = path.join(writingsDir, entry.name)
      try {
        const item = await this.loadFolder(folderPath)
        items.push(item)
      } catch (err) {
        console.warn(`[WritingItemsService] Skipping unreadable folder "${entry.name}":`, err)
      }
    }

    // Sort newest-first by savedAt
    items.sort((a, b) => b.savedAt - a.savedAt)

    console.log(`[WritingItemsService] Loaded ${items.length} writing items`)
    return items
  }

  /**
   * Load a single writing item by its ID (folder name).
   * Returns null if the item does not exist.
   *
   * @throws Error if no workspace is set
   */
  async loadOne(id: string): Promise<WritingItem | null> {
    const currentWorkspace = this.requireWorkspace()

    this.validateId(id)

    const folderPath = path.join(currentWorkspace, WRITINGS_DIR_NAME, id)

    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) return null
      return await this.loadFolder(folderPath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[WritingItemsService] Writing item not found: "${id}"`)
        return null
      }
      throw err
    }
  }

  /**
   * Save (update) an existing writing item.
   *
   * Only the fields supplied in `input` are updated; omitted fields are
   * preserved from the existing config.json.
   *
   * @throws Error if no workspace is set, if the item doesn't exist, or if
   *   an invalid status is provided
   */
  async save(id: string, input: SaveWritingItemInput): Promise<WriteWritingItemResult> {
    const currentWorkspace = this.requireWorkspace()

    this.validateId(id)

    if (input.status !== undefined && !this.isValidStatus(input.status)) {
      throw new Error(
        `Invalid status "${input.status}". Must be one of: ${VALID_WRITING_ITEM_STATUSES.join(', ')}`
      )
    }

    if (input.title !== undefined && (!input.title.trim())) {
      throw new Error('Writing item title must be a non-empty string.')
    }

    const folderPath = path.join(currentWorkspace, WRITINGS_DIR_NAME, id)

    // Verify the folder exists before attempting an update
    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) {
        throw new Error(`Writing item path is not a directory: "${folderPath}"`)
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Writing item not found: "${id}"`)
      }
      throw err
    }

    const configPath = path.join(folderPath, CONFIG_FILENAME)
    const contentPath = path.join(folderPath, CONTENT_FILENAME)

    // Read existing data so we can do a partial update
    const [existingConfigRaw] = await Promise.all([fs.readFile(configPath, 'utf-8')])
    const existingMetadata = JSON.parse(existingConfigRaw) as WritingItemMetadata

    const now = new Date().toISOString()

    const updatedMetadata: WritingItemMetadata = {
      title: input.title !== undefined ? input.title.trim() : existingMetadata.title,
      status: input.status !== undefined ? input.status : existingMetadata.status,
      category: input.category !== undefined ? input.category : existingMetadata.category,
      tags: input.tags !== undefined ? input.tags : existingMetadata.tags,
      createdAt: existingMetadata.createdAt,
      updatedAt: now,
    }

    // Mark before touching disk
    this.markFileAsWritten(configPath)
    if (input.content !== undefined) {
      this.markFileAsWritten(contentPath)
    }

    const writes: Promise<void>[] = [
      fs.writeFile(configPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8'),
    ]
    if (input.content !== undefined) {
      writes.push(fs.writeFile(contentPath, input.content, 'utf-8'))
    }
    await Promise.all(writes)

    const savedAt = new Date(updatedMetadata.updatedAt).getTime()
    console.log(`[WritingItemsService] Saved writing item: ${folderPath}`)
    return { id, path: folderPath, savedAt }
  }

  /**
   * Delete a writing item by ID.
   * A no-op if the item does not exist.
   *
   * @throws Error if no workspace is set
   */
  async delete(id: string): Promise<void> {
    const currentWorkspace = this.requireWorkspace()

    this.validateId(id)

    const folderPath = path.join(currentWorkspace, WRITINGS_DIR_NAME, id)

    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) {
        throw new Error(`Writing item path is not a directory: "${folderPath}"`)
      }

      // Mark folder and known children so the watcher ignores app-initiated deletion
      this.markFileAsWritten(folderPath)
      this.markFileAsWritten(path.join(folderPath, CONFIG_FILENAME))
      this.markFileAsWritten(path.join(folderPath, CONTENT_FILENAME))

      await fs.rm(folderPath, { recursive: true })
      console.log(`[WritingItemsService] Deleted writing item: ${folderPath}`)

      // Explicitly emit the removal so the renderer is notified immediately
      // (especially important on Windows where chokidar polling may be delayed)
      this.emitChangeEvent(folderPath, 'removed')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[WritingItemsService] Writing item already deleted: "${id}"`)
        return
      }
      throw err
    }
  }

  // ---------------------------------------------------------------------------
  // Private — workspace change handling
  // ---------------------------------------------------------------------------

  private handleWorkspaceChange(newWorkspacePath: string | null): void {
    if (newWorkspacePath) {
      console.log('[WritingItemsService] Workspace changed, restarting watcher')
      this.startWatching(newWorkspacePath).catch((err) => {
        console.error('[WritingItemsService] Failed to start watcher for new workspace:', err)
      })
    } else {
      console.log('[WritingItemsService] Workspace cleared, stopping watcher')
      this.stopWatching().catch((err) => {
        console.error('[WritingItemsService] Failed to stop watcher:', err)
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Private — file watcher
  // ---------------------------------------------------------------------------

  /**
   * Start watching the writings directory of a workspace.
   *
   * Depth layout:
   *   writings/               depth 0 (root)
   *   writings/<date-folder>/ depth 1  <- item folders
   *   writings/<date-folder>/<file>    depth 2  <- config.json + content.md
   */
  private async startWatching(workspacePath: string): Promise<void> {
    const writingsDir = path.join(workspacePath, WRITINGS_DIR_NAME)

    if (this.currentWritingsDir === writingsDir && this.watcher !== null) {
      console.log('[WritingItemsService] Already watching:', writingsDir)
      return
    }

    await this.stopWatching()

    // Create the directory so chokidar can watch it from the start
    try {
      await fs.mkdir(writingsDir, { recursive: true })
    } catch (err) {
      console.error('[WritingItemsService] Failed to create writings directory:', err)
      return
    }

    console.log('[WritingItemsService] Starting watcher:', writingsDir)

    try {
      this.watcher = chokidar.watch(writingsDir, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
        usePolling: true,
        interval: 500,
        // depth=2: writings/ -> <date-folder>/ -> config.json / content.md
        depth: 2,
        alwaysStat: false,
        ignored: (filePath: string) => {
          const normalized = path.normalize(filePath)
          const base = path.basename(normalized)

          // Always watch the root writings dir itself
          if (normalized === writingsDir) return false

          // Ignore dotfiles and temp files
          if (base.startsWith('.') || base.endsWith('.tmp')) return true

          const rel = path.relative(writingsDir, normalized)
          const parts = rel.split(path.sep)

          // Depth 1 — must be a date-named folder
          if (parts.length === 1) {
            return !DATE_FOLDER_RE.test(parts[0])
          }

          // Depth 2 — allow only config.json and content.md
          if (parts.length === 2) {
            const name = parts[1]
            if (name === CONFIG_FILENAME) return false
            if (name === CONTENT_FILENAME) return false
            return true
          }

          return true
        },
      })

      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileRemoved(filePath))
        .on('unlinkDir', (dirPath) => this.handleDirRemoved(dirPath))
        .on('error', (error) => this.handleWatcherError(error))
        .on('ready', () => {
          console.log('[WritingItemsService] Watcher ready:', writingsDir)
        })

      this.currentWritingsDir = writingsDir
    } catch (error) {
      console.error('[WritingItemsService] Failed to start watcher:', error)
      this.watcher = null
      this.currentWritingsDir = null
      throw error
    }
  }

  private async stopWatching(): Promise<void> {
    if (!this.watcher) return

    console.log('[WritingItemsService] Stopping watcher:', this.currentWritingsDir)

    try {
      await this.watcher.close()
    } catch (err) {
      console.error('[WritingItemsService] Error closing watcher:', err)
    } finally {
      this.watcher = null
      this.currentWritingsDir = null
      this.clearAllDebounceTimers()
      this.ignoredWrites.clear()
    }
  }

  // ---------------------------------------------------------------------------
  // Private — watcher event handlers
  // ---------------------------------------------------------------------------

  private handleFileAdded(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) return
    this.debouncedEmit(filePath, 'added')
  }

  private handleFileChanged(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) return
    this.debouncedEmit(filePath, 'changed')
  }

  private handleFileRemoved(filePath: string): void {
    if (this.shouldIgnoreFile(filePath)) return
    this.debouncedEmit(filePath, 'removed')
  }

  /**
   * On Windows, recursive folder deletion fires unlinkDir instead of
   * individual unlink events for children — handle explicitly.
   */
  private handleDirRemoved(dirPath: string): void {
    if (this.shouldIgnoreFile(dirPath)) return
    this.debouncedEmit(dirPath, 'removed')
  }

  private handleWatcherError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[WritingItemsService] Watcher error:', error)
    this.eventBus.broadcast('writing-items:watcher-error', {
      error: message,
      timestamp: Date.now(),
    })
  }

  private shouldIgnoreFile(filePath: string): boolean {
    const normalized = path.normalize(filePath)
    const ignore = this.ignoredWrites.has(normalized)
    if (ignore) {
      console.log('[WritingItemsService] Ignoring app-generated change:', normalized)
    }
    return ignore
  }

  private markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.add(normalized)
    setTimeout(() => {
      this.ignoredWrites.delete(normalized)
    }, IGNORE_WRITE_WINDOW_MS)
  }

  private debouncedEmit(filePath: string, type: WritingItemChangeEvent['type']): void {
    const existing = this.debounceTimers.get(filePath)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.emitChangeEvent(filePath, type)
      this.debounceTimers.delete(filePath)
    }, DEBOUNCE_MS)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Emit a writing-item change event to the renderer.
   *
   * Both config.json and content.md changes resolve to the same itemId
   * (the date-folder name), so the renderer only needs to reload the item once.
   */
  private emitChangeEvent(filePath: string, type: WritingItemChangeEvent['type']): void {
    const itemId = this.extractItemIdFromPath(filePath)

    if (!itemId) {
      console.warn('[WritingItemsService] Could not extract item ID from path:', filePath)
      return
    }

    const event: WritingItemChangeEvent = {
      type,
      itemId,
      itemPath: filePath,
      timestamp: Date.now(),
    }

    console.log(`[WritingItemsService] Writing item ${type}: ${itemId}`)
    this.eventBus.broadcast('writing-items:file-changed', event)
  }

  /**
   * Extract the writing item ID (date-folder name) from a file path.
   *
   * Handles both:
   *   writings/<YYYY-MM-DD_HHmmss>              -> YYYY-MM-DD_HHmmss
   *   writings/<YYYY-MM-DD_HHmmss>/config.json  -> YYYY-MM-DD_HHmmss
   *   writings/<YYYY-MM-DD_HHmmss>/content.md   -> YYYY-MM-DD_HHmmss
   */
  private extractItemIdFromPath(filePath: string): string | null {
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const writingsIndex = parts.lastIndexOf(WRITINGS_DIR_NAME)

    if (writingsIndex === -1 || writingsIndex + 1 >= parts.length) {
      return null
    }

    const candidateId = parts[writingsIndex + 1]
    return DATE_FOLDER_RE.test(candidateId) ? candidateId : null
  }

  // ---------------------------------------------------------------------------
  // Private — folder loading
  // ---------------------------------------------------------------------------

  /**
   * Load a writing item from an on-disk folder.
   */
  private async loadFolder(folderPath: string): Promise<WritingItem> {
    const configPath = path.join(folderPath, CONFIG_FILENAME)
    const contentPath = path.join(folderPath, CONTENT_FILENAME)

    const [configRaw, folderStat] = await Promise.all([
      fs.readFile(configPath, 'utf-8'),
      fs.stat(folderPath),
    ])

    let metadata: WritingItemMetadata
    try {
      metadata = JSON.parse(configRaw) as WritingItemMetadata
    } catch (err) {
      throw new Error(`Invalid config.json in ${folderPath}: ${(err as Error).message}`)
    }

    let content = ''
    try {
      content = await fs.readFile(contentPath, 'utf-8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      // content.md missing — treat as empty (graceful degradation)
      console.warn(`[WritingItemsService] content.md missing in ${folderPath}, treating as empty`)
    }

    const folderId = path.basename(folderPath)
    const savedAt = metadata.createdAt
      ? new Date(metadata.createdAt).getTime() || Math.floor(folderStat.mtimeMs)
      : Math.floor(folderStat.mtimeMs)

    return { id: folderId, path: folderPath, metadata, content, savedAt }
  }

  // ---------------------------------------------------------------------------
  // Private — utilities
  // ---------------------------------------------------------------------------

  /** Require that a workspace is set; returns the path or throws. */
  private requireWorkspace(): string {
    const ws = this.workspace.getCurrent()
    if (!ws) {
      throw new Error('No workspace is currently set. Please select a workspace first.')
    }
    return ws
  }

  /** Validate a writing item ID (must be a date-folder name). */
  private validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Writing item ID must be a non-empty string.')
    }
    if (!DATE_FOLDER_RE.test(id)) {
      throw new Error(
        `Invalid writing item ID "${id}". Expected format: YYYY-MM-DD_HHmmss`
      )
    }
  }

  /** Runtime type guard for WritingItemStatus. */
  private isValidStatus(status: string): status is WritingItemStatus {
    return (VALID_WRITING_ITEM_STATUSES as readonly string[]).includes(status)
  }

  /** Format a Unix timestamp as a date-folder name: YYYY-MM-DD_HHmmss */
  private formatDateFolderName(timestamp: number): string {
    const d = new Date(timestamp)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}_${hh}${mi}${ss}`
  }

  /** Ensure a directory exists, creating it recursively if needed. */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true })
        console.log(`[WritingItemsService] Created directory: ${dirPath}`)
      } else {
        throw new Error(`Failed to access directory: ${(err as Error).message}`)
      }
    }
  }

  private clearAllDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}
