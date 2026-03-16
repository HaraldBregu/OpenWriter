import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { shell } from 'electron';
import chokidar, { type FSWatcher } from 'chokidar';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { WorkspaceService } from './workspace-service';
import type { LoggerService } from '../services/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Valid output content types.
 * Each type maps to a subdirectory under <workspace>/output/.
 */
export type OutputType = 'documents';

/** Exhaustive list of valid output types for runtime validation. */
export const VALID_OUTPUT_TYPES: readonly OutputType[] = ['documents'] as const;

/**
 * Metadata stored in config.json of each output entry folder.
 * Captures the full context of how the content was generated.
 */
export interface OutputFileMetadata {
	title: string;
	type: string;
	category: string;
	tags: string[];
	visibility: string;
	provider: string;
	model: string;
	temperature?: number;
	maxTokens?: number | null;
	reasoning?: boolean;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

/**
 * Complete output file structure returned to the renderer.
 */
export interface OutputFile {
	/** Folder name (UUID v4) */
	id: string;
	/** The output type (e.g. documents) */
	type: OutputType;
	/** Absolute folder path on disk */
	path: string;
	/** Parsed config.json content */
	metadata: OutputFileMetadata;
	/** Markdown content from content.md */
	content: string;
	/** Unix timestamp (ms) derived from metadata.createdAt or folder mtime */
	savedAt: number;
}

/**
 * Input for saving a new output file.
 */
export interface SaveOutputFileInput {
	type: OutputType;
	/** Markdown content to write to content.md */
	content: string;
	metadata: Omit<OutputFileMetadata, 'createdAt' | 'updatedAt'>;
}

/**
 * Result of a save operation.
 */
export interface SaveOutputFileResult {
	id: string;
	path: string;
	savedAt: number;
}

/**
 * Input for updating an existing output entry.
 */
export interface UpdateOutputFileInput {
	/** Markdown content to write to content.md */
	content: string;
	metadata: Omit<OutputFileMetadata, 'createdAt' | 'updatedAt'>;
}

/**
 * Event payload for output file changes (emitted via EventBus).
 */
export interface OutputFileChangeEvent {
	type: 'added' | 'changed' | 'removed';
	outputType: OutputType;
	fileId: string;
	filePath: string;
	timestamp: number;
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
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * OutputFilesService manages output content files in the workspace.
 *
 * Responsibilities:
 *   - Save output entries as folder-based format (config.json + content.md)
 *   - Load all output files from workspace (grouped by type or flat)
 *   - Load individual files by type and ID
 *   - Delete output files / folders
 *   - Watch for external file changes
 *   - Organize files by type (output/<type>/)
 *   - Prevent infinite loops with file watcher
 *   - Transparently migrate legacy formats on first load
 *
 * File Structure:
 *   <workspace>/output/<type>/<uuid>/
 *     +-- config.json          (metadata only)
 *     +-- content.md           (single content file)
 *
 * Legacy formats (migrated on load):
 *   - Multi-block: config.json with `content[]` array + multiple `<uuid>.md` files
 *   - DATA.md: config.json + DATA.md (single monolithic markdown file)
 */
export class OutputFilesService implements Disposable {
	private watcher: FSWatcher | null = null;
	private currentOutputDir: string | null = null;
	private ignoredWrites = new Set<string>();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private workspaceEventUnsubscribe: (() => void) | null = null;

	private readonly OUTPUT_DIR_NAME = 'output';
	private readonly CONFIG_FILENAME = 'config.json';
	private readonly CONTENT_FILENAME = 'content.md';
	/** Legacy single-content file — kept for migration detection only. */
	private readonly LEGACY_DATA_FILENAME = 'DATA.md';
	private readonly IGNORE_WRITE_WINDOW_MS = 2000;
	private readonly CLEANUP_INTERVAL_MS = 10000;
	private readonly DEBOUNCE_MS = 300;

	/**
	 * Regex matching valid output folder names.
	 * Accepts both the current UUID v4 format and the legacy YYYY-MM-DD_HHmmss
	 * date format so that existing folders on disk continue to load correctly.
	 */
	private readonly DATE_FOLDER_RE =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$|^\d{4}-\d{2}-\d{2}_\d{6}$/i;

	private debounceTimers = new Map<string, NodeJS.Timeout>();

	constructor(
		private readonly workspace: WorkspaceService,
		private readonly eventBus: EventBus,
		private readonly logger?: LoggerService
	) {}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	/**
	 * Initialize the service by starting to watch the current workspace.
	 */
	async initialize(): Promise<void> {
		this.logger?.info('OutputFilesService', 'Initializing');

		// Listen for workspace changes
		this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
			const payload = event.payload as { currentPath: string | null; previousPath: string | null };
			this.handleWorkspaceChange(payload.currentPath);
		});

		// Start periodic cleanup
		this.cleanupInterval = setInterval(() => {
			this.cleanupIgnoredWrites();
		}, this.CLEANUP_INTERVAL_MS);

		// Start watching current workspace if set
		const currentWorkspace = this.workspace.getCurrent();
		if (currentWorkspace) {
			await this.startWatching(currentWorkspace);
		}

		this.logger?.info('OutputFilesService', 'Initialized');
	}

	/**
	 * Save a new output entry.
	 *
	 * Creates:
	 *   output/<type>/<uuid>/config.json
	 *   output/<type>/<uuid>/content.md
	 *
	 * The UUID folder name is the stable ID for this entry.
	 */
	async save(input: SaveOutputFileInput): Promise<SaveOutputFileResult> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}

		this.validateOutputType(input.type);

		if (typeof input.content !== 'string') {
			throw new Error('Content must be a string.');
		}

		const typeDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, input.type);
		await this.ensureDirectory(typeDir);

		const timestamp = Date.now();
		const folderName = randomUUID();
		const folderPath = path.join(typeDir, folderName);

		await this.ensureDirectory(folderPath);

		const now = new Date(timestamp).toISOString();

		const metadata: OutputFileMetadata = {
			title: input.metadata.title,
			type: 'document',
			category: input.metadata.category ?? '',
			tags: input.metadata.tags ?? [],
			visibility: input.metadata.visibility ?? 'private',
			provider: input.metadata.provider ?? APP_DEFAULTS.provider,
			model: input.metadata.model ?? APP_DEFAULTS.model,
			temperature: input.metadata.temperature ?? APP_DEFAULTS.temperature,
			maxTokens:
				input.metadata.maxTokens !== undefined ? input.metadata.maxTokens : APP_DEFAULTS.maxTokens,
			reasoning:
				input.metadata.reasoning !== undefined ? input.metadata.reasoning : APP_DEFAULTS.reasoning,
			createdAt: now,
			updatedAt: now,
		};

		const configPath = path.join(folderPath, this.CONFIG_FILENAME);
		const contentPath = path.join(folderPath, this.CONTENT_FILENAME);

		// Mark everything as app-written before touching disk so the watcher
		// ignores these self-triggered events.
		this.markFileAsWritten(folderPath);
		this.markFileAsWritten(configPath);
		this.markFileAsWritten(contentPath);

		// Write content.md and config.json
		await Promise.all([
			fs.writeFile(contentPath, input.content, 'utf-8'),
			fs.writeFile(configPath, JSON.stringify(metadata, null, 2), 'utf-8'),
		]);

		this.logger?.info('OutputFilesService', `Saved output folder: ${folderPath}`);

		return {
			id: folderName,
			path: folderPath,
			savedAt: timestamp,
		};
	}

	/**
	 * Load all output files from all type subdirectories in the workspace.
	 */
	async loadAll(): Promise<OutputFile[]> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			this.logger?.warn('OutputFilesService', 'Load attempt with no workspace selected');
			return [];
		}

		const outputDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME);

		try {
			await fs.access(outputDir);
		} catch {
			this.logger?.info(
				'OutputFilesService',
				'Output directory does not exist, returning empty array'
			);
			return [];
		}

		const allFiles: OutputFile[] = [];

		for (const outputType of VALID_OUTPUT_TYPES) {
			try {
				const files = await this.loadByType(outputType);
				allFiles.push(...files);
			} catch (err) {
				this.logger?.warn('OutputFilesService', `Failed to load files for type ${outputType}`, err);
			}
		}

		this.logger?.info(
			'OutputFilesService',
			`Loaded ${allFiles.length} output files from workspace`
		);

		return allFiles;
	}

	/**
	 * Load all output files for a specific type.
	 */
	async loadByType(outputType: OutputType): Promise<OutputFile[]> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			this.logger?.warn('OutputFilesService', 'Load attempt with no workspace selected');
			return [];
		}

		this.validateOutputType(outputType);

		const typeDir = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType);

		try {
			await fs.access(typeDir);
		} catch {
			this.logger?.info(
				'OutputFilesService',
				`Type directory does not exist for "${outputType}", returning empty array`
			);
			return [];
		}

		const entries = await fs.readdir(typeDir, { withFileTypes: true });
		const outputFiles: OutputFile[] = [];

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;

			if (entry.isDirectory() && this.DATE_FOLDER_RE.test(entry.name)) {
				const folderPath = path.join(typeDir, entry.name);
				try {
					const file = await this.loadFolder(folderPath, outputType);
					outputFiles.push(file);
				} catch (err) {
					this.logger?.warn('OutputFilesService', `Failed to load folder ${entry.name}`, err);
				}
			}
		}

		this.logger?.info(
			'OutputFilesService',
			`Loaded ${outputFiles.length} files for type "${outputType}"`
		);

		return outputFiles;
	}

	/**
	 * Load a specific output file by type and ID.
	 */
	async loadOne(outputType: OutputType, id: string): Promise<OutputFile | null> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}

		this.validateOutputType(outputType);

		const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id);

		try {
			const stat = await fs.stat(folderPath);
			if (stat.isDirectory()) {
				return await this.loadFolder(folderPath, outputType);
			}
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				this.logger?.info(
					'OutputFilesService',
					`File not found for id "${id}" in type "${outputType}"`
				);
				return null;
			}
			throw err;
		}

		return null;
	}

	/**
	 * Update the content and/or metadata of an existing output entry.
	 *
	 * Overwrites content.md and rewrites config.json with updated timestamp.
	 * On first update after migration, cleans up any leftover block `.md` files.
	 *
	 * Throws if the folder does not exist.
	 */
	async update(outputType: OutputType, id: string, input: UpdateOutputFileInput): Promise<void> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}

		this.validateOutputType(outputType);

		if (typeof input.content !== 'string') {
			throw new Error('Content must be a string.');
		}

		const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id);
		const configPath = path.join(folderPath, this.CONFIG_FILENAME);
		const contentPath = path.join(folderPath, this.CONTENT_FILENAME);

		// Read existing config to preserve createdAt
		const configRaw = await fs.readFile(configPath, 'utf-8');
		const existing = JSON.parse(configRaw) as OutputFileMetadata & { content?: unknown };

		const now = new Date().toISOString();

		const updatedMetadata: OutputFileMetadata = {
			...input.metadata,
			type: outputType,
			createdAt: existing.createdAt,
			updatedAt: now,
		};

		// Mark files as app-written before touching disk
		this.markFileAsWritten(configPath);
		this.markFileAsWritten(contentPath);

		// Write content.md and config.json
		await Promise.all([
			fs.writeFile(contentPath, input.content, 'utf-8'),
			fs.writeFile(configPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8'),
		]);

		// Clean up any leftover block .md files from the old multi-block format
		if (Array.isArray(existing.content)) {
			try {
				const children = await fs.readdir(folderPath);
				const cleanups: Promise<void>[] = [];
				for (const child of children) {
					if (
						child.endsWith('.md') &&
						child !== this.CONTENT_FILENAME &&
						child !== this.LEGACY_DATA_FILENAME
					) {
						const filePath = path.join(folderPath, child);
						this.markFileAsWritten(filePath);
						cleanups.push(
							fs.unlink(filePath).catch((err) => {
								if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
									this.logger?.warn(
										'OutputFilesService',
										`Failed to clean up old block file: ${filePath}`,
										err
									);
								}
							})
						);
					}
				}
				if (cleanups.length > 0) {
					await Promise.all(cleanups);
					this.logger?.info(
						'OutputFilesService',
						`Cleaned up ${cleanups.length} old block files in ${folderPath}`
					);
				}
			} catch (err) {
				this.logger?.warn(
					'OutputFilesService',
					`Failed to list folder for cleanup: ${folderPath}`,
					err
				);
			}
		}

		this.logger?.info('OutputFilesService', `Updated output folder: ${folderPath}`);
		this.emitChangeEvent(folderPath, 'changed');
	}

	/**
	 * Delete an output entry by type and ID.
	 */
	async delete(outputType: OutputType, id: string): Promise<void> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}

		this.validateOutputType(outputType);

		const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id);

		try {
			const stat = await fs.stat(folderPath);
			if (stat.isDirectory()) {
				// Mark the folder and its known children as written to prevent the
				// watcher from re-emitting events for this app-initiated deletion.
				this.markFileAsWritten(folderPath);
				this.markFileAsWritten(path.join(folderPath, this.CONFIG_FILENAME));
				this.markFileAsWritten(path.join(folderPath, this.LEGACY_DATA_FILENAME));

				// Also mark any block files we can find
				try {
					const children = await fs.readdir(folderPath);
					for (const child of children) {
						this.markFileAsWritten(path.join(folderPath, child));
					}
				} catch {
					// Best-effort — directory may be partially readable
				}

				await fs.rm(folderPath, { recursive: true });
				this.logger?.info('OutputFilesService', `Deleted output folder: ${folderPath}`);

				// Emit removal event directly to guarantee renderer notification.
				// On Windows, chokidar polling may not fire unlink/unlinkDir reliably
				// for recursive deletions, so we emit explicitly as a safety net.
				this.emitChangeEvent(folderPath, 'removed');
				return;
			}
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw new Error(`Failed to delete output folder: ${(err as Error).message}`);
			}
			this.logger?.info('OutputFilesService', `Folder already deleted: ${folderPath}`);
		}
	}

	/**
	 * Move an output entry to the OS Trash instead of permanently deleting it.
	 *
	 * Uses Electron's `shell.trashItem()` so the user can recover the folder
	 * from the system trash if needed.  Falls back to permanent deletion
	 * (fs.rm) on platforms where trashItem is not supported (returns false).
	 */
	async trash(outputType: OutputType, id: string): Promise<void> {
		const currentWorkspace = this.workspace.getCurrent();
		if (!currentWorkspace) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}

		this.validateOutputType(outputType);

		const folderPath = path.join(currentWorkspace, this.OUTPUT_DIR_NAME, outputType, id);

		try {
			const stat = await fs.stat(folderPath);
			if (!stat.isDirectory()) {
				this.logger?.info('OutputFilesService', `Trash target is not a directory: ${folderPath}`);
				return;
			}
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				this.logger?.info(
					'OutputFilesService',
					`Folder already gone, nothing to trash: ${folderPath}`
				);
				return;
			}
			throw new Error(`Failed to access output folder: ${(err as Error).message}`);
		}

		// Mark the folder and its children as app-written so the watcher ignores
		// the removal events that chokidar will fire after trashItem returns.
		this.markFileAsWritten(folderPath);
		this.markFileAsWritten(path.join(folderPath, this.CONFIG_FILENAME));
		this.markFileAsWritten(path.join(folderPath, this.LEGACY_DATA_FILENAME));

		try {
			const children = await fs.readdir(folderPath);
			for (const child of children) {
				this.markFileAsWritten(path.join(folderPath, child));
			}
		} catch {
			// Best-effort — directory may be partially readable
		}

		try {
			await shell.trashItem(folderPath);
		} catch (trashErr) {
			// shell.trashItem throws on platforms where moving to trash is not
			// supported (some Linux configurations without a trash daemon).
			// Fall back to permanent deletion so the operation always succeeds.
			this.logger?.warn(
				'OutputFilesService',
				`shell.trashItem failed for ${folderPath}, falling back to permanent delete`,
				trashErr
			);
			await fs.rm(folderPath, { recursive: true });
		}

		this.logger?.info('OutputFilesService', `Trashed output folder: ${folderPath}`);

		// Emit removal event directly so the renderer is notified immediately.
		// chokidar may not fire reliable events for externally-initiated moves.
		this.emitChangeEvent(folderPath, 'removed');
	}

	/**
	 * Cleanup on shutdown.
	 */
	destroy(): void {
		this.logger?.info('OutputFilesService', 'Destroying');

		if (this.workspaceEventUnsubscribe) {
			this.workspaceEventUnsubscribe();
			this.workspaceEventUnsubscribe = null;
		}

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		this.stopWatching().catch((error) => {
			this.logger?.error('OutputFilesService', 'Error during destroy', error);
		});

		this.logger?.info('OutputFilesService', 'Destroyed');
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
			);
		}
	}

	/**
	 * Handle workspace change events.
	 */
	private handleWorkspaceChange(newWorkspacePath: string | null): void {
		if (newWorkspacePath) {
			this.logger?.info('OutputFilesService', 'Workspace changed, starting watcher');
			this.startWatching(newWorkspacePath).catch((error) => {
				this.logger?.error('OutputFilesService', 'Failed to start watching new workspace', error);
			});
		} else {
			this.logger?.info('OutputFilesService', 'Workspace cleared, stopping watcher');
			this.stopWatching().catch((error) => {
				this.logger?.error('OutputFilesService', 'Failed to stop watcher', error);
			});
		}
	}

	/**
	 * Start watching the output directory for file changes.
	 *
	 * Depth layout:
	 *   output/               depth 0 (root, not counted)
	 *   output/<type>/        depth 1
	 *   output/<type>/<id>/   depth 2  <- UUID (or legacy date) entry folders
	 *   output/<type>/<id>/<file>      depth 3  <- config.json + block .md files
	 */
	private async startWatching(workspacePath: string): Promise<void> {
		const outputDir = path.join(workspacePath, this.OUTPUT_DIR_NAME);

		if (this.currentOutputDir === outputDir && this.watcher !== null) {
			this.logger?.info('OutputFilesService', `Already watching: ${outputDir}`);
			return;
		}

		await this.stopWatching();

		try {
			await fs.mkdir(outputDir, { recursive: true });
		} catch (err) {
			this.logger?.error('OutputFilesService', 'Failed to create output directory', err);
			return;
		}

		this.logger?.info('OutputFilesService', `Starting to watch: ${outputDir}`);

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
				// depth=3 covers output/ -> <type>/ -> <date-folder>/ -> content.md
				depth: 3,
				alwaysStat: false,
				ignored: (filePath: string) => {
					// Chokidar v5 normalizes all paths to forward slashes internally,
					// but path.join/path.sep use backslashes on Windows. Normalize here
					// so all comparisons are consistent.
					const normalized = path.normalize(filePath);
					const base = path.basename(normalized);

					// Always watch the root output dir itself
					if (normalized === outputDir) return false;

					// Ignore dotfiles and temp files
					if (base.startsWith('.') || base.endsWith('.tmp')) return true;

					const rel = path.relative(outputDir, normalized);
					const parts = rel.split(path.sep);

					// Depth 1 — allow valid type directories (e.g. documents)
					if (parts.length === 1) {
						return !(VALID_OUTPUT_TYPES as readonly string[]).includes(parts[0]);
					}

					// Depth 2 — allow UUID (or legacy date) named folders inside type dirs
					if (parts.length === 2) {
						return !this.DATE_FOLDER_RE.test(parts[1]);
					}

					// Depth 3 — allow config.json, content.md, and legacy DATA.md
					if (parts.length === 3) {
						const name = parts[2];
						if (name === this.CONFIG_FILENAME) return false;
						if (name === this.CONTENT_FILENAME) return false;
						if (name === this.LEGACY_DATA_FILENAME) return false;
						return true;
					}

					return true;
				},
			});

			this.watcher
				.on('add', (filePath) => this.handleFileAdded(filePath))
				.on('change', (filePath) => this.handleFileChanged(filePath))
				.on('unlink', (filePath) => this.handleFileRemoved(filePath))
				.on('unlinkDir', (dirPath) => this.handleDirRemoved(dirPath))
				.on('error', (error) => this.handleWatcherError(error))
				.on('ready', () => {
					this.logger?.info('OutputFilesService', `Watcher ready, monitoring: ${outputDir}`);
				});

			this.currentOutputDir = outputDir;
		} catch (error) {
			this.logger?.error('OutputFilesService', 'Failed to start watching', error);
			this.watcher = null;
			this.currentOutputDir = null;
			throw error;
		}
	}

	/**
	 * Stop watching the output directory.
	 */
	private async stopWatching(): Promise<void> {
		if (!this.watcher) {
			return;
		}

		this.logger?.info('OutputFilesService', `Stopping watcher for: ${this.currentOutputDir}`);

		try {
			await this.watcher.close();
		} catch (error) {
			this.logger?.error('OutputFilesService', 'Error closing watcher', error);
		} finally {
			this.watcher = null;
			this.currentOutputDir = null;
			this.clearAllDebounceTimers();
			this.ignoredWrites.clear();
		}
	}

	/**
	 * Handle file added event.
	 */
	private handleFileAdded(filePath: string): void {
		if (this.shouldIgnoreFile(filePath)) {
			return;
		}
		this.debouncedEmit(filePath, 'added');
	}

	/**
	 * Handle file changed event.
	 */
	private handleFileChanged(filePath: string): void {
		if (this.shouldIgnoreFile(filePath)) {
			return;
		}
		this.debouncedEmit(filePath, 'changed');
	}

	/**
	 * Handle file removed event.
	 */
	private handleFileRemoved(filePath: string): void {
		if (this.shouldIgnoreFile(filePath)) {
			return;
		}
		this.debouncedEmit(filePath, 'removed');
	}

	/**
	 * Handle directory removed event.
	 * On Windows, recursive folder deletion fires `unlinkDir` instead of
	 * individual `unlink` events for child files, so we must handle it
	 * explicitly to keep the renderer in sync.
	 */
	private handleDirRemoved(dirPath: string): void {
		if (this.shouldIgnoreFile(dirPath)) {
			return;
		}
		this.debouncedEmit(dirPath, 'removed');
	}

	/**
	 * Handle watcher errors.
	 */
	private handleWatcherError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);
		this.logger?.error('OutputFilesService', 'Watcher error', error);

		this.eventBus.broadcast('output:watcher-error', {
			error: errorMessage,
			timestamp: Date.now(),
		});
	}

	/**
	 * Check if a file should be ignored based on recent writes.
	 */
	private shouldIgnoreFile(filePath: string): boolean {
		const normalized = path.normalize(filePath);
		const shouldIgnore = this.ignoredWrites.has(normalized);

		if (shouldIgnore) {
			this.logger?.info('OutputFilesService', `Ignoring app-generated change for: ${normalized}`);
		}

		return shouldIgnore;
	}

	/**
	 * Mark a file or directory as recently written by the app.
	 */
	private markFileAsWritten(filePath: string): void {
		const normalized = path.normalize(filePath);
		this.ignoredWrites.add(normalized);
		this.logger?.info('OutputFilesService', `Marked as written: ${normalized}`);

		setTimeout(() => {
			this.ignoredWrites.delete(normalized);
		}, this.IGNORE_WRITE_WINDOW_MS);
	}

	/**
	 * Emit a file change event with debouncing.
	 */
	private debouncedEmit(filePath: string, type: OutputFileChangeEvent['type']): void {
		const existingTimer = this.debounceTimers.get(filePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const timer = setTimeout(() => {
			this.emitChangeEvent(filePath, type);
			this.debounceTimers.delete(filePath);
		}, this.DEBOUNCE_MS);

		this.debounceTimers.set(filePath, timer);
	}

	/**
	 * Emit a file change event to the renderer.
	 * Both config.json changes and individual block .md file changes resolve
	 * to the same fileId (the date folder), so the renderer only needs to
	 * reload the entire entry.
	 */
	private emitChangeEvent(filePath: string, type: OutputFileChangeEvent['type']): void {
		const { outputType, fileId } = this.extractIdsFromPath(filePath);

		if (!outputType || !fileId) {
			this.logger?.warn('OutputFilesService', `Could not extract IDs from path: ${filePath}`);
			return;
		}

		const event: OutputFileChangeEvent = {
			type,
			outputType,
			fileId,
			filePath,
			timestamp: Date.now(),
		};

		this.logger?.info('OutputFilesService', `Output file ${type}: ${outputType} ${fileId}`);

		this.eventBus.broadcast('output:file-changed', event);
	}

	/**
	 * Extract output type and file ID from a file path.
	 *
	 * Handles both depth-3 paths (config.json / DATA.md / <block>.md) and
	 * depth-2 paths (the entry folder itself, e.g. on unlinkDir).
	 *
	 * Expected formats (UUID variant — new):
	 *   output/<type>/<uuid>              -> { outputType, fileId: uuid }
	 *   output/<type>/<uuid>/config.json  -> { outputType, fileId: uuid }
	 *   output/<type>/<uuid>/<uuid>.md    -> { outputType, fileId: uuid }
	 *
	 * Legacy date-folder variant is also accepted (backward compat):
	 *   output/<type>/<YYYY-MM-DD_HHmmss>              -> { outputType, fileId: date-folder }
	 */
	private extractIdsFromPath(filePath: string): {
		outputType: OutputType | null;
		fileId: string | null;
	} {
		const normalized = path.normalize(filePath);
		const parts = normalized.split(path.sep);
		const outputIndex = parts.lastIndexOf(this.OUTPUT_DIR_NAME);

		if (outputIndex === -1 || outputIndex + 2 >= parts.length) {
			return { outputType: null, fileId: null };
		}

		const typePart = parts[outputIndex + 1];
		if (!(VALID_OUTPUT_TYPES as readonly string[]).includes(typePart)) {
			return { outputType: null, fileId: null };
		}

		const outputType = typePart as OutputType;
		const thirdSegment = parts[outputIndex + 2];

		// The third segment is a UUID (or legacy date) entry folder
		if (this.DATE_FOLDER_RE.test(thirdSegment)) {
			return { outputType, fileId: thirdSegment };
		}

		return { outputType: null, fileId: null };
	}

	/**
	 * Load an output entry from the folder format.
	 *
	 * Handles three migration cases in order:
	 *   1. New format: content.md exists → read it directly
	 *   2. Multi-block: config.json has `content[]` array → concatenate block files, migrate
	 *   3. Legacy DATA.md: DATA.md exists → copy to content.md, migrate
	 *   4. Empty: neither → return content: ''
	 */
	private async loadFolder(folderPath: string, outputType: OutputType): Promise<OutputFile> {
		const configPath = path.join(folderPath, this.CONFIG_FILENAME);

		const [configRaw, folderStat] = await Promise.all([
			fs.readFile(configPath, 'utf-8'),
			fs.stat(folderPath),
		]);

		let metadata: OutputFileMetadata & { content?: unknown };
		try {
			metadata = JSON.parse(configRaw) as OutputFileMetadata & { content?: unknown };
		} catch (err) {
			throw new Error(`Invalid config.json in ${folderPath}: ${(err as Error).message}`);
		}

		const folderId = path.basename(folderPath);

		// Prefer createdAt from metadata if present; fall back to mtime
		const savedAt = metadata.createdAt
			? new Date(metadata.createdAt).getTime() || Math.floor(folderStat.mtimeMs)
			: Math.floor(folderStat.mtimeMs);

		const contentPath = path.join(folderPath, this.CONTENT_FILENAME);

		// -----------------------------------------------------------------------
		// Case 1: New format — content.md exists
		// -----------------------------------------------------------------------
		try {
			const content = await fs.readFile(contentPath, 'utf-8');

			// Strip legacy content[] from metadata if still present
			const cleanMetadata: OutputFileMetadata = { ...metadata };
			delete (cleanMetadata as OutputFileMetadata & { content?: unknown }).content;

			return {
				id: folderId,
				type: outputType,
				path: folderPath,
				metadata: cleanMetadata,
				content,
				savedAt,
			};
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw err;
			}
			// content.md doesn't exist — fall through to migration
		}

		// -----------------------------------------------------------------------
		// Case 2: Multi-block migration — config.json has content[] array
		// -----------------------------------------------------------------------
		if (Array.isArray(metadata.content) && metadata.content.length > 0) {
			const blockContents: string[] = [];
			for (const desc of metadata.content as Array<{ name: string }>) {
				const blockPath = path.join(folderPath, `${desc.name}.md`);
				try {
					const blockContent = await fs.readFile(blockPath, 'utf-8');
					blockContents.push(blockContent);
				} catch (err) {
					if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
						throw err;
					}
					this.logger?.warn(
						'OutputFilesService',
						`Block file missing during migration: ${blockPath}`
					);
				}
			}

			const mergedContent = blockContents.join('\n\n');
			const cleanMetadata: OutputFileMetadata = { ...metadata };
			delete (cleanMetadata as OutputFileMetadata & { content?: unknown }).content;

			// Persist the migration
			await this.persistSingleContentMigration(
				folderPath,
				cleanMetadata,
				mergedContent,
				(metadata.content as Array<{ name: string }>).map((d) => `${d.name}.md`)
			);

			return {
				id: folderId,
				type: outputType,
				path: folderPath,
				metadata: cleanMetadata,
				content: mergedContent,
				savedAt,
			};
		}

		// -----------------------------------------------------------------------
		// Case 3: Legacy DATA.md migration
		// -----------------------------------------------------------------------
		const legacyDataPath = path.join(folderPath, this.LEGACY_DATA_FILENAME);
		try {
			const legacyContent = await fs.readFile(legacyDataPath, 'utf-8');
			const cleanMetadata: OutputFileMetadata = { ...metadata };
			delete (cleanMetadata as OutputFileMetadata & { content?: unknown }).content;

			await this.persistSingleContentMigration(folderPath, cleanMetadata, legacyContent, [
				this.LEGACY_DATA_FILENAME,
			]);

			return {
				id: folderId,
				type: outputType,
				path: folderPath,
				metadata: cleanMetadata,
				content: legacyContent,
				savedAt,
			};
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw err;
			}
		}

		// -----------------------------------------------------------------------
		// Case 4: Empty — no content found
		// -----------------------------------------------------------------------
		this.logger?.warn('OutputFilesService', `No content found in ${folderPath}`);
		const cleanMetadata: OutputFileMetadata = { ...metadata };
		delete (cleanMetadata as OutputFileMetadata & { content?: unknown }).content;

		return {
			id: folderId,
			type: outputType,
			path: folderPath,
			metadata: cleanMetadata,
			content: '',
			savedAt,
		};
	}

	/**
	 * Persist migration to single content.md format:
	 *   1. Write content.md
	 *   2. Rewrite config.json without content[] array
	 *   3. Delete old .md files
	 *
	 * All writes are marked so the watcher ignores them.
	 */
	private async persistSingleContentMigration(
		folderPath: string,
		metadata: OutputFileMetadata,
		content: string,
		oldFiles: string[]
	): Promise<void> {
		const configPath = path.join(folderPath, this.CONFIG_FILENAME);
		const contentPath = path.join(folderPath, this.CONTENT_FILENAME);

		this.markFileAsWritten(configPath);
		this.markFileAsWritten(contentPath);
		for (const oldFile of oldFiles) {
			this.markFileAsWritten(path.join(folderPath, oldFile));
		}

		try {
			await fs.writeFile(contentPath, content, 'utf-8');
			await fs.writeFile(configPath, JSON.stringify(metadata, null, 2), 'utf-8');

			// Remove old .md files
			await Promise.all(
				oldFiles.map((file) =>
					fs.unlink(path.join(folderPath, file)).catch((err) => {
						if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
							this.logger?.warn('OutputFilesService', `Could not remove old file ${file}`, err);
						}
					})
				)
			);

			this.logger?.info(
				'OutputFilesService',
				`Migrated ${folderPath} to content.md (removed ${oldFiles.length} old files)`
			);
		} catch (err) {
			// Non-fatal: migration failure just means next load will re-attempt
			this.logger?.error('OutputFilesService', `Migration failed for ${folderPath}`, err);
		}
	}

	/**
	 * Ensure a directory exists, creating it if necessary.
	 */
	private async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				await fs.mkdir(dirPath, { recursive: true });
				this.logger?.info('OutputFilesService', `Created directory: ${dirPath}`);
			} else {
				throw new Error(`Failed to access directory: ${(err as Error).message}`);
			}
		}
	}

	/**
	 * Clear all pending debounce timers.
	 */
	private clearAllDebounceTimers(): void {
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
	}

	/**
	 * Placeholder for periodic cleanup — actual cleanup is handled by markFileAsWritten timeouts.
	 */
	private cleanupIgnoredWrites(): void {
		// Cleanup is handled by setTimeout in markFileAsWritten
	}
}
