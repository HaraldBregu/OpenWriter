import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import matter from 'gray-matter'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import type { WorkspaceService } from './workspace'

/**
 * Metadata stored in frontmatter of brain conversation files
 */
export interface BrainFileMetadata {
  sectionId: string
  title?: string
  createdAt: number
  updatedAt: number
  tags?: string[]
  [key: string]: unknown
}

/**
 * Complete brain file structure
 */
export interface BrainFile {
  id: string // filename without extension (timestamp)
  sectionId: string
  path: string
  metadata: BrainFileMetadata
  content: string
  savedAt: number
}

/**
 * Input for saving a new brain conversation
 */
export interface SaveBrainFileInput {
  sectionId: string
  content: string
  metadata?: Partial<BrainFileMetadata>
}

/**
 * Result of save operation
 */
export interface SaveBrainFileResult {
  id: string
  path: string
  savedAt: number
}

/**
 * Event payload for brain file changes
 */
export interface BrainFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}

/**
 * BrainFilesService manages brain conversation files in the workspace.
 *
 * Responsibilities:
 *   - Save conversation files as markdown with YAML frontmatter
 *   - Load all brain files from workspace
 *   - Load individual files by section and ID
 *   - Delete brain files
 *   - Watch for external file changes
 *   - Organize files by section (brain/<section>/)
 *   - Prevent infinite loops with file watcher
 *
 * File Structure:
 *   <workspace>/brain/<section>/<timestamp>.md
 *
 * File Format:
 *   ---
 *   sectionId: chat
 *   title: My Conversation
 *   createdAt: 1708709000000
 *   updatedAt: 1708709000000
 *   tags: [ai, conversation]
 *   ---
 *   # Conversation content
 *   ...markdown content...
 */
export class BrainFilesService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentBrainDir: string | null = null
  private ignoredWrites = new Set<string>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null

  private readonly BRAIN_DIR_NAME = 'brain'
  private readonly IGNORE_WRITE_WINDOW_MS = 2000
  private readonly CLEANUP_INTERVAL_MS = 10000
  private readonly DEBOUNCE_MS = 300

  private debounceTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly workspace: WorkspaceService,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Initialize the service by starting to watch the current workspace.
   */
  async initialize(): Promise<void> {
    console.log('[BrainFilesService] Initializing...')

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

    console.log('[BrainFilesService] Initialized')
  }

  /**
   * Save a conversation to a markdown file.
   * Creates brain/<section>/ directory if needed.
   * Generates a unique filename based on timestamp.
   */
  async save(input: SaveBrainFileInput): Promise<SaveBrainFileResult> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.BRAIN_DIR_NAME, input.sectionId)
    await this.ensureDirectory(sectionDir)

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}.md`
    const filePath = path.join(sectionDir, filename)

    // Prepare metadata
    const metadata: BrainFileMetadata = {
      sectionId: input.sectionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input.metadata
    }

    // Create markdown with frontmatter
    const fileContent = matter.stringify(input.content, metadata)

    // Mark as app-written before saving
    this.markFileAsWritten(filePath)

    // Write file
    await fs.writeFile(filePath, fileContent, 'utf-8')

    console.log(`[BrainFilesService] Saved brain file: ${filePath}`)

    return {
      id: timestamp.toString(),
      path: filePath,
      savedAt: timestamp
    }
  }

  /**
   * Load all brain files from all sections in the workspace.
   */
  async loadAll(): Promise<BrainFile[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[BrainFilesService] Load attempt with no workspace selected')
      return []
    }

    const brainDir = path.join(currentWorkspace, this.BRAIN_DIR_NAME)

    // Check if brain directory exists
    try {
      await fs.access(brainDir)
    } catch {
      console.log('[BrainFilesService] Brain directory does not exist, returning empty array')
      return []
    }

    // Read all section directories
    const entries = await fs.readdir(brainDir, { withFileTypes: true })
    const sectionDirs = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))

    const allFiles: BrainFile[] = []

    // Load files from each section
    for (const sectionDir of sectionDirs) {
      const sectionId = sectionDir.name
      const sectionPath = path.join(brainDir, sectionId)

      try {
        const files = await this.loadFilesFromSection(sectionPath, sectionId)
        allFiles.push(...files)
      } catch (err) {
        console.warn(`[BrainFilesService] Failed to load files from section ${sectionId}:`, err)
      }
    }

    console.log(`[BrainFilesService] Loaded ${allFiles.length} brain files from workspace`)

    return allFiles
  }

  /**
   * Load a specific brain file by section and ID.
   */
  async loadOne(sectionId: string, fileId: string): Promise<BrainFile | null> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const filePath = path.join(
      currentWorkspace,
      this.BRAIN_DIR_NAME,
      sectionId,
      `${fileId}.md`
    )

    try {
      const file = await this.loadFile(filePath, sectionId)
      return file
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[BrainFilesService] File not found: ${filePath}`)
        return null
      }
      throw err
    }
  }

  /**
   * Delete a brain file.
   */
  async delete(sectionId: string, fileId: string): Promise<void> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const filePath = path.join(
      currentWorkspace,
      this.BRAIN_DIR_NAME,
      sectionId,
      `${fileId}.md`
    )

    try {
      // Mark as app-written before deleting
      this.markFileAsWritten(filePath)

      await fs.unlink(filePath)
      console.log(`[BrainFilesService] Deleted brain file: ${filePath}`)
    } catch (err) {
      // Idempotent delete - OK if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete brain file: ${(err as Error).message}`)
      }
      console.log(`[BrainFilesService] File already deleted: ${filePath}`)
    }
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    console.log('[BrainFilesService] Destroying...')

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

    // Stop watching
    this.stopWatching().catch((error) => {
      console.error('[BrainFilesService] Error during destroy:', error)
    })

    console.log('[BrainFilesService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Handle workspace change events.
   */
  private handleWorkspaceChange(newWorkspacePath: string | null): void {
    if (newWorkspacePath) {
      console.log('[BrainFilesService] Workspace changed, starting watcher')
      this.startWatching(newWorkspacePath).catch((error) => {
        console.error('[BrainFilesService] Failed to start watching new workspace:', error)
      })
    } else {
      console.log('[BrainFilesService] Workspace cleared, stopping watcher')
      this.stopWatching().catch((error) => {
        console.error('[BrainFilesService] Failed to stop watcher:', error)
      })
    }
  }

  /**
   * Start watching the brain directory for file changes.
   */
  private async startWatching(workspacePath: string): Promise<void> {
    const brainDir = path.join(workspacePath, this.BRAIN_DIR_NAME)

    // Don't restart if already watching the same directory
    if (this.currentBrainDir === brainDir && this.watcher !== null) {
      console.log('[BrainFilesService] Already watching:', brainDir)
      return
    }

    // Stop any existing watcher
    await this.stopWatching()

    // Ensure brain directory exists
    try {
      await fs.mkdir(brainDir, { recursive: true })
    } catch (err) {
      console.error('[BrainFilesService] Failed to create brain directory:', err)
      return
    }

    console.log('[BrainFilesService] Starting to watch:', brainDir)

    try {
      this.watcher = chokidar.watch(brainDir, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50
        },
        usePolling: true,
        interval: 500,
        depth: 1, // Watch brain directory and section subdirectories
        alwaysStat: false,
        ignored: (filePath: string) => {
          const base = path.basename(filePath)
          // Ignore dotfiles, temp files, and non-markdown files
          if (base.startsWith('.') || base.endsWith('.tmp')) return true
          // Only watch .md files (not directories)
          if (filePath !== brainDir && !base.endsWith('.md')) return true
          return false
        }
      })

      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileRemoved(filePath))
        .on('error', (error) => this.handleWatcherError(error))
        .on('ready', () => {
          console.log('[BrainFilesService] Watcher ready, monitoring:', brainDir)
        })

      this.currentBrainDir = brainDir
    } catch (error) {
      console.error('[BrainFilesService] Failed to start watching:', error)
      this.watcher = null
      this.currentBrainDir = null
      throw error
    }
  }

  /**
   * Stop watching the brain directory.
   */
  private async stopWatching(): Promise<void> {
    if (!this.watcher) {
      return
    }

    console.log('[BrainFilesService] Stopping watcher for:', this.currentBrainDir)

    try {
      await this.watcher.close()
    } catch (error) {
      console.error('[BrainFilesService] Error closing watcher:', error)
    } finally {
      this.watcher = null
      this.currentBrainDir = null
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
   * Handle watcher errors.
   */
  private handleWatcherError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[BrainFilesService] Watcher error:', error)

    this.eventBus.broadcast('brain:watcher-error', {
      error: errorMessage,
      timestamp: Date.now()
    })
  }

  /**
   * Check if a file should be ignored based on recent writes.
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const normalized = path.normalize(filePath)
    const shouldIgnore = this.ignoredWrites.has(normalized)

    if (shouldIgnore) {
      console.log('[BrainFilesService] Ignoring app-generated change for:', normalized)
    }

    return shouldIgnore
  }

  /**
   * Mark a file as recently written by the app.
   */
  private markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.add(normalized)
    console.log('[BrainFilesService] Marked file as written:', normalized)

    // Auto-remove after ignore window
    setTimeout(() => {
      this.ignoredWrites.delete(normalized)
    }, this.IGNORE_WRITE_WINDOW_MS)
  }

  /**
   * Emit a file change event with debouncing.
   */
  private debouncedEmit(filePath: string, type: BrainFileChangeEvent['type']): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.emitChangeEvent(filePath, type)
      this.debounceTimers.delete(filePath)
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Emit a file change event to the renderer.
   */
  private emitChangeEvent(filePath: string, type: BrainFileChangeEvent['type']): void {
    const { sectionId, fileId } = this.extractIdsFromPath(filePath)

    if (!sectionId || !fileId) {
      console.warn('[BrainFilesService] Could not extract IDs from path:', filePath)
      return
    }

    const event: BrainFileChangeEvent = {
      type,
      sectionId,
      fileId,
      filePath,
      timestamp: Date.now()
    }

    console.log(`[BrainFilesService] Brain file ${type}:`, sectionId, fileId)

    this.eventBus.broadcast('brain:file-changed', event)
  }

  /**
   * Extract section ID and file ID from file path.
   * Example: /workspace/brain/chat/1234567890.md -> { sectionId: 'chat', fileId: '1234567890' }
   */
  private extractIdsFromPath(filePath: string): { sectionId: string | null; fileId: string | null } {
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const brainIndex = parts.lastIndexOf(this.BRAIN_DIR_NAME)

    if (brainIndex === -1 || brainIndex + 2 >= parts.length) {
      return { sectionId: null, fileId: null }
    }

    const sectionId = parts[brainIndex + 1]
    const filename = parts[brainIndex + 2]
    const fileId = path.basename(filename, '.md')

    return { sectionId, fileId }
  }

  /**
   * Load all files from a section directory.
   */
  private async loadFilesFromSection(sectionPath: string, sectionId: string): Promise<BrainFile[]> {
    const files = await fs.readdir(sectionPath)
    const mdFiles = files.filter(file => file.endsWith('.md') && !file.startsWith('.'))

    const brainFiles: BrainFile[] = []

    for (const filename of mdFiles) {
      try {
        const filePath = path.join(sectionPath, filename)
        const file = await this.loadFile(filePath, sectionId)
        brainFiles.push(file)
      } catch (err) {
        console.warn(`[BrainFilesService] Failed to load file ${filename}:`, err)
      }
    }

    return brainFiles
  }

  /**
   * Load a single file and parse its frontmatter.
   */
  private async loadFile(filePath: string, sectionId: string): Promise<BrainFile> {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    const stats = await fs.stat(filePath)
    const filename = path.basename(filePath, '.md')

    return {
      id: filename,
      sectionId,
      path: filePath,
      metadata: data as BrainFileMetadata,
      content,
      savedAt: Math.floor(stats.mtimeMs)
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
        console.log(`[BrainFilesService] Created directory: ${dirPath}`)
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
   * Clean up old ignored writes.
   */
  private cleanupIgnoredWrites(): void {
    // Set automatically removes items after timeout, so this is just a placeholder
    // The actual cleanup happens in markFileAsWritten with setTimeout
  }
}
