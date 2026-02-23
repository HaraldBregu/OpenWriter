import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import matter from 'gray-matter'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import type { WorkspaceService } from './workspace'

/**
 * Metadata stored in frontmatter of personality conversation files
 */
export interface PersonalityFileMetadata {
  sectionId: string
  title?: string
  createdAt: number
  updatedAt: number
  tags?: string[]
  [key: string]: unknown
}

/**
 * Complete personality file structure
 */
export interface PersonalityFile {
  id: string // filename without extension (timestamp)
  sectionId: string
  path: string
  metadata: PersonalityFileMetadata
  content: string
  savedAt: number
}

/**
 * Input for saving a new personality conversation
 */
export interface SavePersonalityFileInput {
  sectionId: string
  content: string
  metadata?: Partial<PersonalityFileMetadata>
}

/**
 * Result of save operation
 */
export interface SavePersonalityFileResult {
  id: string
  path: string
  savedAt: number
}

/**
 * Event payload for personality file changes
 */
export interface PersonalityFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}

/**
 * PersonalityFilesService manages personality conversation files in the workspace.
 *
 * Responsibilities:
 *   - Save conversation files as markdown with YAML frontmatter
 *   - Load all personality files from workspace
 *   - Load individual files by section and ID
 *   - Delete personality files
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
export class PersonalityFilesService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentPersonalityDir: string | null = null
  private ignoredWrites = new Set<string>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null

  private readonly PERSONALITY_DIR_NAME = 'brain'
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
    console.log('[PersonalityFilesService] Initializing...')

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

    console.log('[PersonalityFilesService] Initialized')
  }

  /**
   * Save a conversation to a markdown file.
   * Creates brain/<section>/ directory if needed.
   * Generates a unique filename based on timestamp.
   */
  async save(input: SavePersonalityFileInput): Promise<SavePersonalityFileResult> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME, input.sectionId)
    await this.ensureDirectory(sectionDir)

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}.md`
    const filePath = path.join(sectionDir, filename)

    // Prepare metadata
    const metadata: PersonalityFileMetadata = {
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

    console.log(`[PersonalityFilesService] Saved personality file: ${filePath}`)

    return {
      id: timestamp.toString(),
      path: filePath,
      savedAt: timestamp
    }
  }

  /**
   * Load all personality files from all sections in the workspace.
   */
  async loadAll(): Promise<PersonalityFile[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[PersonalityFilesService] Load attempt with no workspace selected')
      return []
    }

    const personalityDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME)

    // Check if personality directory exists
    try {
      await fs.access(personalityDir)
    } catch {
      console.log('[PersonalityFilesService] Personality directory does not exist, returning empty array')
      return []
    }

    // Read all section directories
    const entries = await fs.readdir(personalityDir, { withFileTypes: true })
    const sectionDirs = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))

    const allFiles: PersonalityFile[] = []

    // Load files from each section
    for (const sectionDir of sectionDirs) {
      const sectionId = sectionDir.name
      const sectionPath = path.join(personalityDir, sectionId)

      try {
        const files = await this.loadFilesFromSection(sectionPath, sectionId)
        allFiles.push(...files)
      } catch (err) {
        console.warn(`[PersonalityFilesService] Failed to load files from section ${sectionId}:`, err)
      }
    }

    console.log(`[PersonalityFilesService] Loaded ${allFiles.length} personality files from workspace`)

    return allFiles
  }

  /**
   * Load a specific personality file by section and ID.
   */
  async loadOne(sectionId: string, fileId: string): Promise<PersonalityFile | null> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const filePath = path.join(
      currentWorkspace,
      this.PERSONALITY_DIR_NAME,
      sectionId,
      `${fileId}.md`
    )

    try {
      const file = await this.loadFile(filePath, sectionId)
      return file
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[PersonalityFilesService] File not found: ${filePath}`)
        return null
      }
      throw err
    }
  }

  /**
   * Delete a personality file.
   */
  async delete(sectionId: string, fileId: string): Promise<void> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const filePath = path.join(
      currentWorkspace,
      this.PERSONALITY_DIR_NAME,
      sectionId,
      `${fileId}.md`
    )

    try {
      // Mark as app-written before deleting
      this.markFileAsWritten(filePath)

      await fs.unlink(filePath)
      console.log(`[PersonalityFilesService] Deleted personality file: ${filePath}`)
    } catch (err) {
      // Idempotent delete - OK if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete personality file: ${(err as Error).message}`)
      }
      console.log(`[PersonalityFilesService] File already deleted: ${filePath}`)
    }
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    console.log('[PersonalityFilesService] Destroying...')

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
      console.error('[PersonalityFilesService] Error during destroy:', error)
    })

    console.log('[PersonalityFilesService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Handle workspace change events.
   */
  private handleWorkspaceChange(newWorkspacePath: string | null): void {
    if (newWorkspacePath) {
      console.log('[PersonalityFilesService] Workspace changed, starting watcher')
      this.startWatching(newWorkspacePath).catch((error) => {
        console.error('[PersonalityFilesService] Failed to start watching new workspace:', error)
      })
    } else {
      console.log('[PersonalityFilesService] Workspace cleared, stopping watcher')
      this.stopWatching().catch((error) => {
        console.error('[PersonalityFilesService] Failed to stop watcher:', error)
      })
    }
  }

  /**
   * Start watching the personality directory for file changes.
   */
  private async startWatching(workspacePath: string): Promise<void> {
    const personalityDir = path.join(workspacePath, this.PERSONALITY_DIR_NAME)

    // Don't restart if already watching the same directory
    if (this.currentPersonalityDir === personalityDir && this.watcher !== null) {
      console.log('[PersonalityFilesService] Already watching:', personalityDir)
      return
    }

    // Stop any existing watcher
    await this.stopWatching()

    // Ensure personality directory exists
    try {
      await fs.mkdir(personalityDir, { recursive: true })
    } catch (err) {
      console.error('[PersonalityFilesService] Failed to create personality directory:', err)
      return
    }

    console.log('[PersonalityFilesService] Starting to watch:', personalityDir)

    try {
      this.watcher = chokidar.watch(personalityDir, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50
        },
        usePolling: true,
        interval: 500,
        depth: 1, // Watch personality directory and section subdirectories
        alwaysStat: false,
        ignored: (filePath: string) => {
          const base = path.basename(filePath)
          // Ignore dotfiles, temp files, and non-markdown files
          if (base.startsWith('.') || base.endsWith('.tmp')) return true
          // Only watch .md files (not directories)
          if (filePath !== personalityDir && !base.endsWith('.md')) return true
          return false
        }
      })

      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileRemoved(filePath))
        .on('error', (error) => this.handleWatcherError(error))
        .on('ready', () => {
          console.log('[PersonalityFilesService] Watcher ready, monitoring:', personalityDir)
        })

      this.currentPersonalityDir = personalityDir
    } catch (error) {
      console.error('[PersonalityFilesService] Failed to start watching:', error)
      this.watcher = null
      this.currentPersonalityDir = null
      throw error
    }
  }

  /**
   * Stop watching the personality directory.
   */
  private async stopWatching(): Promise<void> {
    if (!this.watcher) {
      return
    }

    console.log('[PersonalityFilesService] Stopping watcher for:', this.currentPersonalityDir)

    try {
      await this.watcher.close()
    } catch (error) {
      console.error('[PersonalityFilesService] Error closing watcher:', error)
    } finally {
      this.watcher = null
      this.currentPersonalityDir = null
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
    console.error('[PersonalityFilesService] Watcher error:', error)

    this.eventBus.broadcast('personality:watcher-error', {
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
      console.log('[PersonalityFilesService] Ignoring app-generated change for:', normalized)
    }

    return shouldIgnore
  }

  /**
   * Mark a file as recently written by the app.
   */
  private markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.add(normalized)
    console.log('[PersonalityFilesService] Marked file as written:', normalized)

    // Auto-remove after ignore window
    setTimeout(() => {
      this.ignoredWrites.delete(normalized)
    }, this.IGNORE_WRITE_WINDOW_MS)
  }

  /**
   * Emit a file change event with debouncing.
   */
  private debouncedEmit(filePath: string, type: PersonalityFileChangeEvent['type']): void {
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
  private emitChangeEvent(filePath: string, type: PersonalityFileChangeEvent['type']): void {
    const { sectionId, fileId } = this.extractIdsFromPath(filePath)

    if (!sectionId || !fileId) {
      console.warn('[PersonalityFilesService] Could not extract IDs from path:', filePath)
      return
    }

    const event: PersonalityFileChangeEvent = {
      type,
      sectionId,
      fileId,
      filePath,
      timestamp: Date.now()
    }

    console.log(`[PersonalityFilesService] Personality file ${type}:`, sectionId, fileId)

    this.eventBus.broadcast('personality:file-changed', event)
  }

  /**
   * Extract section ID and file ID from file path.
   * Example: /workspace/brain/chat/1234567890.md -> { sectionId: 'chat', fileId: '1234567890' }
   */
  private extractIdsFromPath(filePath: string): { sectionId: string | null; fileId: string | null } {
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const personalityIndex = parts.lastIndexOf(this.PERSONALITY_DIR_NAME)

    if (personalityIndex === -1 || personalityIndex + 2 >= parts.length) {
      return { sectionId: null, fileId: null }
    }

    const sectionId = parts[personalityIndex + 1]
    const filename = parts[personalityIndex + 2]
    const fileId = path.basename(filename, '.md')

    return { sectionId, fileId }
  }

  /**
   * Load all files from a section directory.
   */
  private async loadFilesFromSection(sectionPath: string, sectionId: string): Promise<PersonalityFile[]> {
    const files = await fs.readdir(sectionPath)
    const mdFiles = files.filter(file => file.endsWith('.md') && !file.startsWith('.'))

    const personalityFiles: PersonalityFile[] = []

    for (const filename of mdFiles) {
      try {
        const filePath = path.join(sectionPath, filename)
        const file = await this.loadFile(filePath, sectionId)
        personalityFiles.push(file)
      } catch (err) {
        console.warn(`[PersonalityFilesService] Failed to load file ${filename}:`, err)
      }
    }

    return personalityFiles
  }

  /**
   * Load a single file and parse its frontmatter.
   */
  private async loadFile(filePath: string, sectionId: string): Promise<PersonalityFile> {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    const stats = await fs.stat(filePath)
    const filename = path.basename(filePath, '.md')

    return {
      id: filename,
      sectionId,
      path: filePath,
      metadata: data as PersonalityFileMetadata,
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
        console.log(`[PersonalityFilesService] Created directory: ${dirPath}`)
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
