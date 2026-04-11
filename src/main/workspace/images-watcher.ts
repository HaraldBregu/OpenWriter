import chokidar, { type FSWatcher } from 'chokidar';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../services/logger';
import type { ImageEntryChangeEvent } from '../../shared/types';

const IMAGES_SUBFOLDER = 'images';
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_IGNORE_WINDOW_MS = 2000;
const CLEANUP_INTERVAL_MS = 10000;

interface IgnoredWrite {
	filePath: string;
	timestamp: number;
}

/**
 * ImagesWatcherService monitors `resources/images/` for external changes.
 *
 * Modelled on FilesWatcherService but watches only the images sub-folder.
 * Broadcasts `images:changed` events via EventBus.
 */
export class ImagesWatcherService implements Disposable {
	private watcher: FSWatcher | null = null;
	private currentDirectory: string | null = null;
	private ignoredWrites: IgnoredWrite[] = [];
	private debounceTimers = new Map<string, NodeJS.Timeout>();
	private readonly debounceMs = DEFAULT_DEBOUNCE_MS;
	private readonly ignoreWriteWindowMs = DEFAULT_IGNORE_WINDOW_MS;
	private workspaceEventUnsubscribe: (() => void) | null = null;
	private cleanupInterval: NodeJS.Timeout | null = null;

	private static readonly LOG_SOURCE = 'ImagesWatcherService';

	constructor(
		private readonly eventBus: EventBus,
		private readonly logger?: LoggerService
	) {
		this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
			const payload = event.payload as { currentPath: string | null; previousPath: string | null };
			this.handleWorkspaceChange(payload.currentPath);
		});

		this.cleanupInterval = setInterval(() => {
			this.cleanupIgnoredWrites();
		}, CLEANUP_INTERVAL_MS);

		this.logger?.info(ImagesWatcherService.LOG_SOURCE, 'Initialized');
	}

	/**
	 * Initialize the watcher with the current workspace path.
	 */
	async initialize(workspacePath: string | null): Promise<void> {
		if (workspacePath) {
			await this.startWatching(workspacePath);
		}
	}

	/**
	 * Start watching `resources/images/` within the given workspace.
	 */
	async startWatching(workspacePath: string): Promise<void> {
		const imagesDir = path.join(workspacePath, 'resources', IMAGES_SUBFOLDER);

		if (this.currentDirectory === imagesDir && this.watcher !== null) {
			return;
		}

		await this.stopWatching();

		try {
			await fsPromises.mkdir(imagesDir, { recursive: true });
		} catch (err) {
			this.logger?.error(
				ImagesWatcherService.LOG_SOURCE,
				'Failed to create images directory',
				err
			);
			return;
		}

		this.logger?.info(ImagesWatcherService.LOG_SOURCE, `Starting to watch: ${imagesDir}`);

		try {
			this.watcher = chokidar.watch(imagesDir, {
				ignoreInitial: true,
				persistent: true,
				awaitWriteFinish: {
					stabilityThreshold: 200,
					pollInterval: 50,
				},
				usePolling: true,
				interval: 500,
				depth: 0,
				alwaysStat: false,
				ignored: (filePath: string) => {
					const normalized = path.normalize(filePath);
					if (normalized === imagesDir) return false;
					const base = path.basename(normalized);
					return base.startsWith('.') || base.endsWith('.tmp');
				},
			});

			this.watcher
				.on('add', (filePath) => this.handleEvent(filePath, 'added'))
				.on('change', (filePath) => this.handleEvent(filePath, 'changed'))
				.on('unlink', (filePath) => this.handleEvent(filePath, 'removed'))
				.on('error', (error) => this.handleWatcherError(error))
				.on('ready', () => {
					this.logger?.info(ImagesWatcherService.LOG_SOURCE, `Watcher ready for: ${imagesDir}`);
				});

			this.currentDirectory = imagesDir;
		} catch (error) {
			this.logger?.error(ImagesWatcherService.LOG_SOURCE, 'Failed to start watching', error);
			this.watcher = null;
			this.currentDirectory = null;
			throw error;
		}
	}

	/**
	 * Stop watching.
	 */
	async stopWatching(): Promise<void> {
		if (!this.watcher) return;

		try {
			await this.watcher.close();
		} catch (error) {
			this.logger?.error(ImagesWatcherService.LOG_SOURCE, 'Error closing watcher', error);
		} finally {
			this.watcher = null;
			this.currentDirectory = null;
			this.clearAllDebounceTimers();
			this.ignoredWrites = [];
		}
	}

	/**
	 * Mark a file as recently written by the app to prevent feedback loops.
	 */
	markFileAsWritten(filePath: string): void {
		this.ignoredWrites.push({
			filePath: path.normalize(filePath),
			timestamp: Date.now(),
		});
	}

	destroy(): void {
		if (this.workspaceEventUnsubscribe) {
			this.workspaceEventUnsubscribe();
			this.workspaceEventUnsubscribe = null;
		}

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		this.stopWatching().catch((error) => {
			this.logger?.error(ImagesWatcherService.LOG_SOURCE, 'Error during destroy', error);
		});
	}

	// ---------------------------------------------------------------------------
	// Private
	// ---------------------------------------------------------------------------

	private handleWorkspaceChange(newWorkspacePath: string | null): void {
		if (newWorkspacePath) {
			this.startWatching(newWorkspacePath).catch((error) => {
				this.logger?.error(
					ImagesWatcherService.LOG_SOURCE,
					'Failed to start watching new workspace',
					error
				);
			});
		} else {
			this.stopWatching().catch((error) => {
				this.logger?.error(ImagesWatcherService.LOG_SOURCE, 'Failed to stop watcher', error);
			});
		}
	}

	private handleEvent(filePath: string, type: ImageEntryChangeEvent['type']): void {
		if (this.shouldIgnoreFile(filePath)) return;
		this.debouncedEmit(filePath, type);
	}

	private shouldIgnoreFile(filePath: string): boolean {
		const normalized = path.normalize(filePath);
		const now = Date.now();
		return this.ignoredWrites.some(
			(ignored) =>
				ignored.filePath === normalized && now - ignored.timestamp < this.ignoreWriteWindowMs
		);
	}

	private debouncedEmit(filePath: string, type: ImageEntryChangeEvent['type']): void {
		const existingTimer = this.debounceTimers.get(filePath);
		if (existingTimer) clearTimeout(existingTimer);

		const timer = setTimeout(() => {
			this.emitChangeEvent(filePath, type);
			this.debounceTimers.delete(filePath);
		}, this.debounceMs);

		this.debounceTimers.set(filePath, timer);
	}

	private emitChangeEvent(filePath: string, type: ImageEntryChangeEvent['type']): void {
		const fileId = path.basename(filePath);
		if (!fileId) return;

		const event: ImageEntryChangeEvent = { type, fileId, filePath, timestamp: Date.now() };
		this.logger?.info(ImagesWatcherService.LOG_SOURCE, `Image ${type}: ${fileId}`);
		this.eventBus.broadcast('images:changed', event);
	}

	private handleWatcherError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);
		this.logger?.error(ImagesWatcherService.LOG_SOURCE, 'Watcher error', error);
		this.eventBus.broadcast('images:watcher-error', {
			error: errorMessage,
			timestamp: Date.now(),
		});
	}

	private clearAllDebounceTimers(): void {
		for (const timer of this.debounceTimers.values()) clearTimeout(timer);
		this.debounceTimers.clear();
	}

	private cleanupIgnoredWrites(): void {
		const now = Date.now();
		this.ignoredWrites = this.ignoredWrites.filter(
			(ignored) => now - ignored.timestamp < this.ignoreWriteWindowMs
		);
	}
}
