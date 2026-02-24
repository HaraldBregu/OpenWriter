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
 * Valid output content types.
 * Each type maps to a subdirectory under <workspace>/output/.
 */
export type OutputType = 'posts' | 'writings'

/** Exhaustive list of valid output types for runtime validation. */
export const VALID_OUTPUT_TYPES: readonly OutputType[] = ['posts', 'writings'] as const

/**
 * Metadata stored in config.json of each output entry folder.
 * Captures the full context of how the content was generated.
 */
export interface OutputFileMetadata {
  title: string
  type: OutputType
  category: string
  tags: string[]
  visibility: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Complete output file structure returned to the renderer.
 */
export interface OutputFile {
  /** Folder name (date string: YYYY-MM-DD_HHmmss) */
  id: string
  /** The output type (posts, writings, notes, messages) */
  type: OutputType
  /** Absolute folder path on disk */
  path: string
  /** Parsed config.json content */
  metadata: OutputFileMetadata
  /** Raw markdown content from DATA.md */
  content: string
  /** Unix timestamp (ms) derived from metadata.createdAt or folder mtime */
  savedAt: number
}

/**
 * Input for saving a new output file.
 */
export interface SaveOutputFileInput {
  type: OutputType
  content: string
  metadata: Omit<OutputFileMetadata, 'createdAt' | 'updatedAt'>
}

/**
 * Result of a save operation.
 */
export interface SaveOutputFileResult {
  id: string
  path: string
  savedAt: number
}

/**
 * Event payload for output file changes (emitted via EventBus).
 */
export interface OutputFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  outputType: OutputType
  fileId: string
  filePath: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_DEFAULTS = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
} as const

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * OutputFilesService manages output content files in the workspace.
 *
 * Responsibilities:
 *   - Save output entries as folder-based format (config.json + DATA.md)
 *   - Load all output files from workspace (grouped by type or flat)
 *   - Load individual files by type and ID
 *   - Delete output files / folders
 *   - Watch for external file changes
 *   - Organize files by type (output/<type>/)
 *   - Prevent infinite loops with file watcher
 *
 * File Structure:
 *   <workspace>/output/<type>/<YYYY-MM-DD_HHmmss>/
 *     +-- config.json   (metadata as JSON)
 *     +-- DATA.md       (plain markdown content)
 */
export class OutputFilesService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentOutputDir: string | null = null
  private ignoredWrites = new Set<string>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null

  private readonly OUTPUT_DIR_NAME = 'output'
  private readonly CONFIG_FILENAME = 'config.json'
  private readonly DATA_FILENAME = 'DATA.md'
  private readonly IGNORE_WRITE_WINDOW_MS = 2000
  private readonly CLEANUP_INTERVAL_MS = 10000
  private readonly DEBOUNCE_MS = 300

  /** Regex matching the date-folder naming convention: YYYY-MM-DD_HHmmss */
  private readonly DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}_\d{6}$/

  private debounceTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly workspace: WorkspaceService,
    private readonly eventBus: EventBus
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialize the service by starting to watch the current workspace.
   */
  async initialize(): Promise<void> {
    console.log('[OutputFilesService] Initializing...')

    // Listen for workspace changes
    this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
      const payload = event.payload as { currentPath: string | null; previousPath: string | null }
      this.handleWorkspaceChange(payload.currentPath)
    })

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupIgnoredWrites()
    }, this.CLEANUP_INTERVAL_MS)

    // Start watching current workspace if set
    const currentWorkspace = this.workspace.getCurrent()
    if (currentWorkspace) {
      await this.startWatching(currentWorkspace)
    }

    console.log('[OutputFilesService] Initialized')
  }

  /**
   * Save an output entry to the folder-based format.
   *
   * Creates:
   *   output/<type>/<YYYY-MM-DD_HHmmss>/config.json
   *   output/<type>/<YYYY-MM-DD_HHmmss>/DATA.md
   *
   * The folder name is the stable ID for this entry.
   */
  async save(input: SaveOutputFileInput): Promise<SaveOutputFileResult> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    this.validateOutputType(input.type)

    const typeDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, input.type)
    await this.ensureDirectory(typeDir)

    const timestamp = Date.now()
    const folderName = this.formatDateFolderName(timestamp)
    const folderPath = path.join(typeDir, folderName)

    await this.ensureDirectory(folderPath)

    const now = new Date(timestamp).toISOString()
    const metadata: OutputFileMetadata = {
      title: input.metadata.title,
      type: input.type,
      category: input.metadata.category ?? '',
      tags: input.metadata.tags ?? [],
      visibility: input.metadata.visibility ?? 'private',
      provider: input.metadata.provider ?? APP_DEFAULTS.provider,
      model: input.metadata.model ?? APP_DEFAULTS.model,
      temperature: input.metadata.temperature ?? APP_DEFAULTS.temperature,
      maxTokens: input.metadata.maxTokens !== undefined ? input.metadata.maxTokens : APP_DEFAULTS.maxTokens,
      reasoning: input.metadata.reasoning !== undefined ? input.metadata.reasoning : APP_DEFAULTS.reasoning,
      createdAt: now,
      updatedAt: now,
    }

    const configPath = path.join(folderPath, this.CONFIG_FILENAME)
    const dataPath = path.join(folderPath, this.DATA_FILENAME)

    // Mark both files (and the folder) as written before touching disk
    this.markFileAsWritten(folderPath)
    this.markFileAsWritten(configPath)
    this.markFileAsWritten(dataPath)

    await fs.writeFile(configPath, JSON.stringify(metadata, null, 2), 'utf-8')
    await fs.writeFile(dataPath, input.content, 'utf-8')

    console.log(`[OutputFilesService] Saved output folder: ${folderPath}`)

    return {
      id: folderName,
      path: folderPath,
      savedAt: timestamp,
    }
  }

  /**
   * Load all output files from all type subdirectories in the workspace.
   */
  async loadAll(): Promise<OutputFile[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[OutputFilesService] Load attempt with no workspace selected')
      return []
    }

    const outputDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME)

    try {
      await fs.access(outputDir)
    } catch {
      console.log('[OutputFilesService] Output directory does not exist, returning empty array')
      return []
    }

    const allFiles: OutputFile[] = []

    for (const outputType of VALID_OUTPUT_TYPES) {
      try {
        const files = await this.loadByType(outputType)
        allFiles.push(...files)
      } catch (err) {
        console.warn(`[OutputFilesService] Failed to load files for type ${outputType}:`, err)
      }
    }

    console.log(`[OutputFilesService] Loaded ${allFiles.length} output files from workspace`)

    return allFiles
  }

  /**
   * Load all output files for a specific type.
   */
  async loadByType(outputType: OutputType): Promise<OutputFile[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[OutputFilesService] Load attempt with no workspace selected')
      return []
    }

    this.validateOutputType(outputType)

    const typeDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType)

    try {
      await fs.access(typeDir)
    } catch {
      console.log(`[OutputFilesService] Type directory does not exist for "${outputType}", returning empty array`)
      return []
    }

    const entries = await fs.readdir(typeDir, { withFileTypes: true })
    const outputFiles: OutputFile[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      if (entry.isDirectory() && this.DATE_FOLDER_RE.test(entry.name)) {
        const folderPath = path.join(typeDir, entry.name)
        try {
          const file = await this.loadFolder(folderPath, outputType)
          outputFiles.push(file)
        } catch (err) {
          console.warn(`[OutputFilesService] Failed to load folder ${entry.name}:`, err)
        }
      }
    }

    console.log(`[OutputFilesService] Loaded ${outputFiles.length} files for type "${outputType}"`)

    return outputFiles
  }

  /**
   * Load a specific output file by type and ID.
   */
  async loadOne(outputType: OutputType, id: string): Promise<OutputFile | null> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    this.validateOutputType(outputType)

    const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id)

    try {
      const stat = await fs.stat(folderPath)
      if (stat.isDirectory()) {
        return await this.loadFolder(folderPath, outputType)
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[OutputFilesService] File not found for id "${id}" in type "${outputType}"`)
        return null
      }
      throw err
    }

    return null
  }

  /**
   * Update the content and/or metadata of an existing output entry.
   *
   * Overwrites DATA.md and updates config.json (updatedAt only; createdAt is preserved).
   * Throws if the folder does not exist.
   */
  async update(outputType: OutputType, id: string, input: { content: string; metadata: Omit<OutputFileMetadata, 'createdAt' | 'updatedAt'> }): Promise<void> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    this.validateOutputType(outputType)

    const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id)
    const configPath = path.join(folderPath, this.CONFIG_FILENAME)
    const dataPath = path.join(folderPath, this.DATA_FILENAME)

    // Read existing config to preserve createdAt
    const configRaw = await fs.readFile(configPath, 'utf-8')
    const existing = JSON.parse(configRaw) as OutputFileMetadata

    const updatedMetadata: OutputFileMetadata = {
      ...input.metadata,
      type: outputType,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    this.markFileAsWritten(configPath)
    this.markFileAsWritten(dataPath)

    await fs.writeFile(configPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8')
    await fs.writeFile(dataPath, input.content, 'utf-8')

    console.log(`[OutputFilesService] Updated output folder: ${folderPath}`)
  }

  /**
   * Delete an output entry by type and ID.
   */
  async delete(outputType: OutputType, id: string): Promise<void> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    this.validateOutputType(outputType)

    const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id)

    try {
      const stat = await fs.stat(folderPath)
      if (stat.isDirectory()) {
        // Mark the folder AND child files as written to prevent the watcher
        // from re-emitting events for this app-initiated deletion.
        this.markFileAsWritten(folderPath)
        this.markFileAsWritten(path.join(folderPath, this.CONFIG_FILENAME))
        this.markFileAsWritten(path.join(folderPath, this.DATA_FILENAME))
        await fs.rm(folderPath, { recursive: true })
        console.log(`[OutputFilesService] Deleted output folder: ${folderPath}`)

        // Emit removal event directly to guarantee renderer notification.
        // On Windows, chokidar polling may not fire unlink/unlinkDir reliably
        // for recursive deletions, so we emit explicitly as a safety net.
        this.emitChangeEvent(folderPath, 'removed')
        return
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete output folder: ${(err as Error).message}`)
      }
      console.log(`[OutputFilesService] Folder already deleted: ${folderPath}`)
    }
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    console.log('[OutputFilesService] Destroying...')

    if (this.workspaceEventUnsubscribe) {
      this.workspaceEventUnsubscribe()
      this.workspaceEventUnsubscribe = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.stopWatching().catch((error) => {
      console.error('[OutputFilesService] Error during destroy:', error)
    })

    console.log('[OutputFilesService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Validate that the given string is a valid OutputType.
   */
  private validateOutputType(type: string): asserts type is OutputType {
    if (!(VALID_OUTPUT_TYPES as readonly string[]).includes(type)) {
      throw new Error(
        `Invalid output type "${type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
      )
    }
  }

  /**
   * Format a Unix timestamp as a date-folder name: YYYY-MM-DD_HHmmss
   */
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

  /**
   * Handle workspace change events.
   */
  private handleWorkspaceChange(newWorkspacePath: string | null): void {
    if (newWorkspacePath) {
      console.log('[OutputFilesService] Workspace changed, starting watcher')
      this.startWatching(newWorkspacePath).catch((error) => {
        console.error('[OutputFilesService] Failed to start watching new workspace:', error)
      })
    } else {
      console.log('[OutputFilesService] Workspace cleared, stopping watcher')
      this.stopWatching().catch((error) => {
        console.error('[OutputFilesService] Failed to stop watcher:', error)
      })
    }
  }

  /**
   * Start watching the output directory for file changes.
   * Watches depth=2 to capture changes inside date-named folders.
   */
  private async startWatching(workspacePath: string): Promise<void> {
    const outputDir = path.join(workspacePath, this.OUTPUT_DIR_NAME)

    if (this.currentOutputDir === outputDir && this.watcher !== null) {
      console.log('[OutputFilesService] Already watching:', outputDir)
      return
    }

    await this.stopWatching()

    try {
      await fs.mkdir(outputDir, { recursive: true })
    } catch (err) {
      console.error('[OutputFilesService] Failed to create output directory:', err)
      return
    }

    console.log('[OutputFilesService] Starting to watch:', outputDir)

    try {
      this.watcher = chokidar.watch(outputDir, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50,
        },
        usePolling: true,
        interval: 500,
        depth: 2, // output/ -> <type>/ -> <date-folder>/
        alwaysStat: false,
        ignored: (filePath: string) => {
          // Chokidar v5 normalizes all paths to forward slashes internally,
          // but path.join/path.sep use backslashes on Windows. Normalize here
          // so all comparisons are consistent.
          const normalized = path.normalize(filePath)
          const base = path.basename(normalized)

          // Always watch the root output dir itself
          if (normalized === outputDir) return false

          // Ignore dotfiles and temp files
          if (base.startsWith('.') || base.endsWith('.tmp')) return true

          const rel = path.relative(outputDir, normalized)
          const parts = rel.split(path.sep)

          // Allow type directories (depth 1): posts, writings, notes, messages
          if (parts.length === 1) {
            return !(VALID_OUTPUT_TYPES as readonly string[]).includes(parts[0])
          }

          // Allow date-named folders inside type dirs (depth 2)
          if (parts.length === 2) {
            return !this.DATE_FOLDER_RE.test(parts[1])
          }

          // Allow config.json and DATA.md inside date folders (depth 3)
          if (parts.length === 3) {
            const name = parts[2]
            if (name === this.CONFIG_FILENAME || name === this.DATA_FILENAME) return false
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
          console.log('[OutputFilesService] Watcher ready, monitoring:', outputDir)
        })

      this.currentOutputDir = outputDir
    } catch (error) {
      console.error('[OutputFilesService] Failed to start watching:', error)
      this.watcher = null
      this.currentOutputDir = null
      throw error
    }
  }

  /**
   * Stop watching the output directory.
   */
  private async stopWatching(): Promise<void> {
    if (!this.watcher) {
      return
    }

    console.log('[OutputFilesService] Stopping watcher for:', this.currentOutputDir)

    try {
      await this.watcher.close()
    } catch (error) {
      console.error('[OutputFilesService] Error closing watcher:', error)
    } finally {
      this.watcher = null
      this.currentOutputDir = null
      this.clearAllDebounceTimers()
      this.ignoredWrites.clear()
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
   * Handle directory removed event.
   * On Windows, recursive folder deletion fires `unlinkDir` instead of
   * individual `unlink` events for child files, so we must handle it
   * explicitly to keep the renderer in sync.
   */
  private handleDirRemoved(dirPath: string): void {
    if (this.shouldIgnoreFile(dirPath)) {
      return
    }
    this.debouncedEmit(dirPath, 'removed')
  }

  /**
   * Handle watcher errors.
   */
  private handleWatcherError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[OutputFilesService] Watcher error:', error)

    this.eventBus.broadcast('output:watcher-error', {
      error: errorMessage,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if a file should be ignored based on recent writes.
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const normalized = path.normalize(filePath)
    const shouldIgnore = this.ignoredWrites.has(normalized)

    if (shouldIgnore) {
      console.log('[OutputFilesService] Ignoring app-generated change for:', normalized)
    }

    return shouldIgnore
  }

  /**
   * Mark a file or directory as recently written by the app.
   */
  private markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.add(normalized)
    console.log('[OutputFilesService] Marked as written:', normalized)

    setTimeout(() => {
      this.ignoredWrites.delete(normalized)
    }, this.IGNORE_WRITE_WINDOW_MS)
  }

  /**
   * Emit a file change event with debouncing.
   */
  private debouncedEmit(filePath: string, type: OutputFileChangeEvent['type']): void {
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.emitChangeEvent(filePath, type)
      this.debounceTimers.delete(filePath)
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Emit a file change event to the renderer.
   */
  private emitChangeEvent(filePath: string, type: OutputFileChangeEvent['type']): void {
    const { outputType, fileId } = this.extractIdsFromPath(filePath)

    if (!outputType || !fileId) {
      console.warn('[OutputFilesService] Could not extract IDs from path:', filePath)
      return
    }

    const event: OutputFileChangeEvent = {
      type,
      outputType,
      fileId,
      filePath,
      timestamp: Date.now(),
    }

    console.log(`[OutputFilesService] Output file ${type}:`, outputType, fileId)

    this.eventBus.broadcast('output:file-changed', event)
  }

  /**
   * Extract output type and file ID from a file path.
   *
   * Expected format:
   *   output/<type>/<YYYY-MM-DD_HHmmss>/config.json  -> { outputType, fileId: date-folder }
   *   output/<type>/<YYYY-MM-DD_HHmmss>/DATA.md      -> { outputType, fileId: date-folder }
   */
  private extractIdsFromPath(filePath: string): { outputType: OutputType | null; fileId: string | null } {
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const outputIndex = parts.lastIndexOf(this.OUTPUT_DIR_NAME)

    if (outputIndex === -1 || outputIndex + 2 >= parts.length) {
      return { outputType: null, fileId: null }
    }

    const typePart = parts[outputIndex + 1]
    if (!(VALID_OUTPUT_TYPES as readonly string[]).includes(typePart)) {
      return { outputType: null, fileId: null }
    }

    const outputType = typePart as OutputType
    const thirdSegment = parts[outputIndex + 2]

    // The third segment is a date folder
    if (this.DATE_FOLDER_RE.test(thirdSegment)) {
      return { outputType, fileId: thirdSegment }
    }

    return { outputType: null, fileId: null }
  }

  /**
   * Load an output entry from the folder format.
   * Reads config.json for metadata and DATA.md for content.
   */
  private async loadFolder(folderPath: string, outputType: OutputType): Promise<OutputFile> {
    const configPath = path.join(folderPath, this.CONFIG_FILENAME)
    const dataPath = path.join(folderPath, this.DATA_FILENAME)

    const [configRaw, content, stats] = await Promise.all([
      fs.readFile(configPath, 'utf-8'),
      fs.readFile(dataPath, 'utf-8'),
      fs.stat(folderPath),
    ])

    let metadata: OutputFileMetadata
    try {
      metadata = JSON.parse(configRaw) as OutputFileMetadata
    } catch (err) {
      throw new Error(`Invalid config.json in ${folderPath}: ${(err as Error).message}`)
    }

    const folderId = path.basename(folderPath)

    // Prefer createdAt from metadata if present; fall back to mtime
    const savedAt = metadata.createdAt
      ? new Date(metadata.createdAt).getTime() || Math.floor(stats.mtimeMs)
      : Math.floor(stats.mtimeMs)

    return {
      id: folderId,
      type: outputType,
      path: folderPath,
      metadata,
      content,
      savedAt,
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary.
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true })
        console.log(`[OutputFilesService] Created directory: ${dirPath}`)
      } else {
        throw new Error(`Failed to access directory: ${(err as Error).message}`)
      }
    }
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
   * Placeholder for periodic cleanup -- actual cleanup is handled by markFileAsWritten timeouts.
   */
  private cleanupIgnoredWrites(): void {
    // Cleanup is handled by setTimeout in markFileAsWritten
  }
}
