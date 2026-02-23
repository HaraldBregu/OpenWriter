import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import matter from 'gray-matter'
import type { EventBus } from '../core/EventBus'
import type { Disposable } from '../core/ServiceContainer'
import type { WorkspaceService } from './workspace'

/**
 * Metadata stored in config.json of personality conversation folders.
 * All inference settings are included here.
 */
export interface PersonalityFileMetadata {
  title: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
  createdAt?: string // ISO 8601 date string
  [key: string]: unknown
}

/**
 * Section-level config stored at <workspace>/personality/<section>/config.json.
 * Provides default inference settings for new conversations in this section.
 */
export interface SectionConfig {
  schemaVersion: number
  provider: string
  model: string
  temperature?: number | null
  maxTokens?: number | null
  reasoning?: boolean
  displayName?: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Partial update payload for a section config.
 * All fields are optional — only those supplied will be updated.
 */
export interface SectionConfigUpdate {
  provider?: string
  model?: string
  temperature?: number | null
  maxTokens?: number | null
  reasoning?: boolean
  displayName?: string
  description?: string
}

/**
 * Complete personality file structure
 */
export interface PersonalityFile {
  id: string // folder name (date string: YYYY-MM-DD_HHmmss) or legacy timestamp
  sectionId: string
  path: string // folder path for new format, file path for legacy
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
 * App-level hardcoded defaults used as the final fallback in the metadata resolution chain.
 * Caller-supplied metadata → section config → APP_DEFAULTS.
 */
const APP_DEFAULTS = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
} as const

/**
 * PersonalityFilesService manages personality conversation files in the workspace.
 *
 * Responsibilities:
 *   - Save conversation files as folder-based format (config.json + DATA.md)
 *   - Load all personality files from workspace (new folder format + legacy .md)
 *   - Load individual files by section and ID
 *   - Delete personality files / folders
 *   - Watch for external file changes
 *   - Organize files by section (personality/<section>/)
 *   - Prevent infinite loops with file watcher
 *
 * New File Structure:
 *   <workspace>/personality/<section>/<YYYY-MM-DD_HHmmss>/
 *     ├── config.json   (model configuration as JSON)
 *     └── DATA.md       (plain markdown content, no frontmatter)
 *
 * Legacy File Structure (read-only backward compat):
 *   <workspace>/personality/<section>/<timestamp>.md  (YAML frontmatter + markdown)
 */
export class PersonalityFilesService implements Disposable {
  private watcher: FSWatcher | null = null
  private currentPersonalityDir: string | null = null
  private ignoredWrites = new Set<string>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private workspaceEventUnsubscribe: (() => void) | null = null

  private readonly PERSONALITY_DIR_NAME = 'personality'
  private readonly CONFIG_FILENAME = 'config.json'
  private readonly DATA_FILENAME = 'DATA.md'
  private readonly IGNORE_WRITE_WINDOW_MS = 2000
  private readonly CLEANUP_INTERVAL_MS = 10000
  private readonly DEBOUNCE_MS = 300

  /** Regex matching the new date-folder naming convention: YYYY-MM-DD_HHmmss */
  private readonly DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}_\d{6}$/

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
   * Save a conversation to the new folder-based format.
   *
   * Creates:
   *   personality/<section>/<YYYY-MM-DD_HHmmss>/config.json
   *   personality/<section>/<YYYY-MM-DD_HHmmss>/DATA.md
   *
   * The folder name is the stable ID for this entry.
   */
  async save(input: SavePersonalityFileInput): Promise<SavePersonalityFileResult> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME, input.sectionId)
    await this.ensureDirectory(sectionDir)

    const timestamp = Date.now()
    const folderName = this.formatDateFolderName(timestamp)
    const folderPath = path.join(sectionDir, folderName)

    await this.ensureDirectory(folderPath)

    // Build metadata via 3-layer fallback: caller → section config → app defaults
    const resolved = await this.resolveMetadata(input.sectionId, input.metadata)
    const metadata: PersonalityFileMetadata = {
      ...resolved,
      title: input.metadata?.title ?? input.sectionId,
      createdAt: new Date(timestamp).toISOString(),
    }

    // Copy any extra unknown keys from input metadata that are not part of the known set
    if (input.metadata) {
      const knownKeys = new Set(['title', 'provider', 'model', 'temperature', 'maxTokens', 'reasoning', 'createdAt'])
      for (const [key, value] of Object.entries(input.metadata)) {
        if (!knownKeys.has(key)) {
          metadata[key] = value
        }
      }
    }

    const configPath = path.join(folderPath, this.CONFIG_FILENAME)
    const dataPath = path.join(folderPath, this.DATA_FILENAME)

    // Mark both files (and the folder) as written before touching disk
    this.markFileAsWritten(folderPath)
    this.markFileAsWritten(configPath)
    this.markFileAsWritten(dataPath)

    await fs.writeFile(configPath, JSON.stringify(metadata, null, 2), 'utf-8')
    await fs.writeFile(dataPath, input.content, 'utf-8')

    console.log(`[PersonalityFilesService] Saved personality folder: ${folderPath}`)

    // Auto-create the section-level config if it doesn't exist yet.
    // Uses the resolved inference settings so the first save seeds sensible defaults.
    try {
      const existingSection = await this.loadSectionConfig(input.sectionId)
      if (!existingSection) {
        await this.saveSectionConfig(input.sectionId, {
          provider: resolved.provider,
          model: resolved.model,
          temperature: resolved.temperature,
          maxTokens: resolved.maxTokens,
          reasoning: resolved.reasoning,
        })
        console.log(`[PersonalityFilesService] Auto-created section config for: ${input.sectionId}`)
      }
    } catch (err) {
      // Non-fatal — the conversation was saved successfully regardless
      console.warn(`[PersonalityFilesService] Failed to auto-create section config:`, err)
    }

    return {
      id: folderName,
      path: folderPath,
      savedAt: timestamp,
    }
  }

  /**
   * Load all personality files from all sections in the workspace.
   * Supports both new folder format and legacy .md files.
   */
  async loadAll(): Promise<PersonalityFile[]> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      console.warn('[PersonalityFilesService] Load attempt with no workspace selected')
      return []
    }

    const personalityDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME)

    try {
      await fs.access(personalityDir)
    } catch {
      console.log('[PersonalityFilesService] Personality directory does not exist, returning empty array')
      return []
    }

    const entries = await fs.readdir(personalityDir, { withFileTypes: true })
    const sectionDirs = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))

    const allFiles: PersonalityFile[] = []

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
   * Tries new folder format first, then falls back to legacy .md file.
   */
  async loadOne(sectionId: string, fileId: string): Promise<PersonalityFile | null> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME, sectionId)

    // Try new folder format first
    const folderPath = path.join(sectionDir, fileId)
    try {
      const stat = await fs.stat(folderPath)
      if (stat.isDirectory()) {
        const file = await this.loadFolder(folderPath, sectionId)
        return file
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }

    // Fall back to legacy .md format
    const legacyPath = path.join(sectionDir, `${fileId}.md`)
    try {
      const file = await this.loadLegacyFile(legacyPath, sectionId)
      return file
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[PersonalityFilesService] File not found for id "${fileId}" in section "${sectionId}"`)
        return null
      }
      throw err
    }
  }

  /**
   * Delete a personality entry.
   * Tries new folder format first, then falls back to legacy .md file.
   */
  async delete(sectionId: string, fileId: string): Promise<void> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME, sectionId)
    const folderPath = path.join(sectionDir, fileId)

    // Try to delete as a folder first
    try {
      const stat = await fs.stat(folderPath)
      if (stat.isDirectory()) {
        this.markFileAsWritten(folderPath)
        await fs.rm(folderPath, { recursive: true })
        console.log(`[PersonalityFilesService] Deleted personality folder: ${folderPath}`)
        return
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete personality folder: ${(err as Error).message}`)
      }
    }

    // Fall back to legacy single-file deletion
    const legacyPath = path.join(sectionDir, `${fileId}.md`)
    try {
      this.markFileAsWritten(legacyPath)
      await fs.unlink(legacyPath)
      console.log(`[PersonalityFilesService] Deleted legacy personality file: ${legacyPath}`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete personality file: ${(err as Error).message}`)
      }
      console.log(`[PersonalityFilesService] File already deleted: ${legacyPath}`)
    }
  }

  /**
   * Load the section-level config for the given section.
   * Returns null when the file does not exist yet (section is unconfigured).
   */
  async loadSectionConfig(sectionId: string): Promise<SectionConfig | null> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const configPath = path.join(
      currentWorkspace,
      this.PERSONALITY_DIR_NAME,
      sectionId,
      this.CONFIG_FILENAME
    )

    try {
      const raw = await fs.readFile(configPath, 'utf-8')
      const parsed = JSON.parse(raw) as SectionConfig
      console.log(`[PersonalityFilesService] Loaded section config for: ${sectionId}`)
      return parsed
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[PersonalityFilesService] No section config found for: ${sectionId}`)
        return null
      }
      throw new Error(`Failed to load section config for "${sectionId}": ${(err as Error).message}`)
    }
  }

  /**
   * Create or update the section-level config for the given section.
   * Merges the supplied update onto any existing config (or creates from scratch).
   * Returns the full updated SectionConfig.
   */
  async saveSectionConfig(sectionId: string, update: SectionConfigUpdate): Promise<SectionConfig> {
    const currentWorkspace = this.workspace.getCurrent()
    if (!currentWorkspace) {
      throw new Error('No workspace selected. Please select a workspace first.')
    }

    const sectionDir = path.join(currentWorkspace, this.PERSONALITY_DIR_NAME, sectionId)
    await this.ensureDirectory(sectionDir)

    const configPath = path.join(sectionDir, this.CONFIG_FILENAME)

    // Load existing config or build a fresh one
    let existing: SectionConfig | null = null
    try {
      const raw = await fs.readFile(configPath, 'utf-8')
      existing = JSON.parse(raw) as SectionConfig
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to read existing section config for "${sectionId}": ${(err as Error).message}`)
      }
    }

    const now = new Date().toISOString()

    const updated: SectionConfig = {
      schemaVersion: 1,
      provider: update.provider ?? existing?.provider ?? APP_DEFAULTS.provider,
      model: update.model ?? existing?.model ?? APP_DEFAULTS.model,
      temperature: update.temperature !== undefined ? update.temperature : (existing?.temperature ?? APP_DEFAULTS.temperature),
      maxTokens: update.maxTokens !== undefined ? update.maxTokens : (existing?.maxTokens ?? APP_DEFAULTS.maxTokens),
      reasoning: update.reasoning !== undefined ? update.reasoning : (existing?.reasoning ?? APP_DEFAULTS.reasoning),
      displayName: update.displayName !== undefined ? update.displayName : existing?.displayName,
      description: update.description !== undefined ? update.description : existing?.description,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    // Mark the file as written to suppress the watcher event
    this.markFileAsWritten(configPath)

    await fs.writeFile(configPath, JSON.stringify(updated, null, 2), 'utf-8')

    console.log(`[PersonalityFilesService] Saved section config for: ${sectionId}`)

    // Broadcast so the renderer can react to externally-triggered changes
    this.eventBus.broadcast('personality:section-config-changed', {
      sectionId,
      config: updated,
      timestamp: Date.now(),
    })

    return updated
  }

  /**
   * Cleanup on shutdown.
   */
  destroy(): void {
    console.log('[PersonalityFilesService] Destroying...')

    if (this.workspaceEventUnsubscribe) {
      this.workspaceEventUnsubscribe()
      this.workspaceEventUnsubscribe = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.stopWatching().catch((error) => {
      console.error('[PersonalityFilesService] Error during destroy:', error)
    })

    console.log('[PersonalityFilesService] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Resolve metadata for a new conversation using a 3-layer fallback chain:
   *   1. caller-supplied input (highest priority)
   *   2. section config (loaded from disk if present)
   *   3. app-level hardcoded defaults (lowest priority)
   *
   * Only the inference-related fields participate in fallback resolution.
   * The caller is still responsible for title and createdAt.
   */
  private async resolveMetadata(
    sectionId: string,
    callerInput?: Partial<PersonalityFileMetadata>
  ): Promise<Pick<PersonalityFileMetadata, 'provider' | 'model' | 'temperature' | 'maxTokens' | 'reasoning'>> {
    // Try to load section config for tier-2 fallback
    let sectionConfig: SectionConfig | null = null
    try {
      sectionConfig = await this.loadSectionConfig(sectionId)
    } catch (err) {
      console.warn(`[PersonalityFilesService] Could not load section config during resolve (will use app defaults):`, err)
    }

    return {
      provider:
        callerInput?.provider ??
        sectionConfig?.provider ??
        APP_DEFAULTS.provider,
      model:
        callerInput?.model ??
        sectionConfig?.model ??
        APP_DEFAULTS.model,
      temperature:
        callerInput?.temperature !== undefined
          ? callerInput.temperature
          : sectionConfig?.temperature !== undefined && sectionConfig.temperature !== null
            ? sectionConfig.temperature
            : APP_DEFAULTS.temperature,
      maxTokens:
        callerInput?.maxTokens !== undefined
          ? callerInput.maxTokens
          : sectionConfig?.maxTokens !== undefined && sectionConfig.maxTokens !== null
            ? sectionConfig.maxTokens
            : APP_DEFAULTS.maxTokens,
      reasoning:
        callerInput?.reasoning !== undefined
          ? callerInput.reasoning
          : sectionConfig?.reasoning !== undefined
            ? sectionConfig.reasoning
            : APP_DEFAULTS.reasoning,
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
   * Watches depth=2 to capture changes inside date-named folders.
   */
  private async startWatching(workspacePath: string): Promise<void> {
    const personalityDir = path.join(workspacePath, this.PERSONALITY_DIR_NAME)

    if (this.currentPersonalityDir === personalityDir && this.watcher !== null) {
      console.log('[PersonalityFilesService] Already watching:', personalityDir)
      return
    }

    await this.stopWatching()

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
          pollInterval: 50,
        },
        usePolling: true,
        interval: 500,
        depth: 2, // personality/ -> <section>/ -> <date-folder>/
        alwaysStat: false,
        ignored: (filePath: string) => {
          const base = path.basename(filePath)

          // Always watch the root personality dir itself
          if (filePath === personalityDir) return false

          // Ignore dotfiles and temp files
          if (base.startsWith('.') || base.endsWith('.tmp')) return true

          const rel = path.relative(personalityDir, filePath)
          const parts = rel.split(path.sep)

          // Allow section directories (depth 1)
          if (parts.length === 1) return false

          // Allow date-named folders inside sections (depth 2),
          // as well as the section-level config.json and legacy .md files
          if (parts.length === 2) {
            const name = parts[1]
            if (this.DATE_FOLDER_RE.test(name)) return false
            if (name.endsWith('.md')) return false
            // Section-level config file — watch for external edits
            if (name === this.CONFIG_FILENAME) return false
            return true
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
      console.log('[PersonalityFilesService] Ignoring app-generated change for:', normalized)
    }

    return shouldIgnore
  }

  /**
   * Mark a file or directory as recently written by the app.
   */
  private markFileAsWritten(filePath: string): void {
    const normalized = path.normalize(filePath)
    this.ignoredWrites.add(normalized)
    console.log('[PersonalityFilesService] Marked as written:', normalized)

    setTimeout(() => {
      this.ignoredWrites.delete(normalized)
    }, this.IGNORE_WRITE_WINDOW_MS)
  }

  /**
   * Emit a file change event with debouncing.
   */
  private debouncedEmit(filePath: string, type: PersonalityFileChangeEvent['type']): void {
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
   *
   * Section-level config.json changes (depth 2) are routed to
   * `personality:section-config-changed` instead of `personality:file-changed`
   * so the renderer can update section defaults without re-loading all files.
   */
  private emitChangeEvent(filePath: string, type: PersonalityFileChangeEvent['type']): void {
    // Detect section-level config.json: personality/<section>/config.json
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const personalityIndex = parts.lastIndexOf(this.PERSONALITY_DIR_NAME)

    if (
      personalityIndex !== -1 &&
      parts.length === personalityIndex + 3 &&
      parts[personalityIndex + 2] === this.CONFIG_FILENAME
    ) {
      // This is a section-level config.json change — emit the dedicated event
      const sectionId = parts[personalityIndex + 1]
      console.log(`[PersonalityFilesService] Section config ${type}:`, sectionId)

      // Re-read the config from disk so the renderer gets the latest state
      this.loadSectionConfig(sectionId)
        .then((config) => {
          this.eventBus.broadcast('personality:section-config-changed', {
            sectionId,
            config,
            timestamp: Date.now(),
          })
        })
        .catch((err) => {
          console.warn(`[PersonalityFilesService] Could not re-read section config after watcher event:`, err)
          // Broadcast without config data so the renderer can at least invalidate its cache
          this.eventBus.broadcast('personality:section-config-changed', {
            sectionId,
            config: null,
            timestamp: Date.now(),
          })
        })
      return
    }

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
      timestamp: Date.now(),
    }

    console.log(`[PersonalityFilesService] Personality file ${type}:`, sectionId, fileId)

    this.eventBus.broadcast('personality:file-changed', event)
  }

  /**
   * Extract section ID and file ID from a file path.
   *
   * New format:
   *   personality/<section>/<YYYY-MM-DD_HHmmss>/config.json  -> { sectionId, fileId: date-folder }
   *   personality/<section>/<YYYY-MM-DD_HHmmss>/DATA.md      -> { sectionId, fileId: date-folder }
   *
   * Legacy format:
   *   personality/<section>/<timestamp>.md                   -> { sectionId, fileId: timestamp }
   */
  private extractIdsFromPath(filePath: string): { sectionId: string | null; fileId: string | null } {
    const normalized = path.normalize(filePath)
    const parts = normalized.split(path.sep)
    const personalityIndex = parts.lastIndexOf(this.PERSONALITY_DIR_NAME)

    if (personalityIndex === -1 || personalityIndex + 2 >= parts.length) {
      return { sectionId: null, fileId: null }
    }

    const sectionId = parts[personalityIndex + 1]
    const thirdSegment = parts[personalityIndex + 2]

    // New format: the third segment is a date folder, and there may be a fourth segment
    if (this.DATE_FOLDER_RE.test(thirdSegment)) {
      return { sectionId, fileId: thirdSegment }
    }

    // Legacy format: third segment is a .md file
    const fileId = path.basename(thirdSegment, '.md')
    return { sectionId, fileId }
  }

  /**
   * Load all files from a section directory.
   * Handles both new folder format and legacy .md files.
   */
  private async loadFilesFromSection(sectionPath: string, sectionId: string): Promise<PersonalityFile[]> {
    const entries = await fs.readdir(sectionPath, { withFileTypes: true })
    const personalityFiles: PersonalityFile[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      if (entry.isDirectory() && this.DATE_FOLDER_RE.test(entry.name)) {
        // New folder-based format
        const folderPath = path.join(sectionPath, entry.name)
        try {
          const file = await this.loadFolder(folderPath, sectionId)
          personalityFiles.push(file)
        } catch (err) {
          console.warn(`[PersonalityFilesService] Failed to load folder ${entry.name}:`, err)
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Legacy flat .md file
        const filePath = path.join(sectionPath, entry.name)
        try {
          const file = await this.loadLegacyFile(filePath, sectionId)
          personalityFiles.push(file)
        } catch (err) {
          console.warn(`[PersonalityFilesService] Failed to load legacy file ${entry.name}:`, err)
        }
      }
    }

    return personalityFiles
  }

  /**
   * Load a personality entry from the new folder format.
   * Reads config.json for metadata and DATA.md for content.
   */
  private async loadFolder(folderPath: string, sectionId: string): Promise<PersonalityFile> {
    const configPath = path.join(folderPath, this.CONFIG_FILENAME)
    const dataPath = path.join(folderPath, this.DATA_FILENAME)

    const [configRaw, content, stats] = await Promise.all([
      fs.readFile(configPath, 'utf-8'),
      fs.readFile(dataPath, 'utf-8'),
      fs.stat(folderPath),
    ])

    let metadata: PersonalityFileMetadata
    try {
      metadata = JSON.parse(configRaw) as PersonalityFileMetadata
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
      sectionId,
      path: folderPath,
      metadata,
      content,
      savedAt,
    }
  }

  /**
   * Load a legacy flat .md file (YAML frontmatter + markdown).
   * Used for backward compatibility only; no new files are written in this format.
   */
  private async loadLegacyFile(filePath: string, sectionId: string): Promise<PersonalityFile> {
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
      savedAt: Math.floor(stats.mtimeMs),
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
   * Placeholder for periodic cleanup — actual cleanup is handled by markFileAsWritten timeouts.
   */
  private cleanupIgnoredWrites(): void {
    // Cleanup is handled by setTimeout in markFileAsWritten
  }
}
