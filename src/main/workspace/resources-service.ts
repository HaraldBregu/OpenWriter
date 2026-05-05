import fsPromises from 'node:fs/promises';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { ResourceInfo, ResourceEntryChangeEvent } from '../../shared/types';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../logger';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { WorkspaceService } from './workspace-service';

const RESOURCES_SUBFOLDER = 'resources';
const DEBOUNCE_MS = 300;
const IGNORE_WRITE_WINDOW_MS = 2000;

/**
 * ResourcesService manages files within the workspace `resources/` top-level folder.
 *
 * Replaces the legacy `contents/`, `files/`, and `images/` subfolders. Accepts any
 * file type — no extension filter on read; optional filter at insert time.
 */
export class ResourcesService implements Disposable {
	private static readonly LOG_SOURCE = 'ResourcesService';

	private watcher: FSWatcher | null = null;
	private currentDir: string | null = null;
	private ignoredWrites = new Map<string, number>();
	private debounceTimers = new Map<string, NodeJS.Timeout>();
	private workspaceUnsub: (() => void) | null = null;

	constructor(
		private readonly workspace: WorkspaceService,
		private readonly eventBus: EventBus,
		private readonly fileManager: FileManager,
		private readonly logger?: LoggerService
	) {}

	async initialize(): Promise<void> {
		this.workspaceUnsub = this.eventBus.on('workspace:changed', (event) => {
			const payload = event.payload as { currentPath: string | null };
			this.handleWorkspaceChange(payload.currentPath);
		});
		const current = this.workspace.getCurrent();
		if (current) {
			await this.startWatching(current);
		}
	}

	getResourcesDir(workspacePath: string): string {
		return path.join(workspacePath, RESOURCES_SUBFOLDER);
	}

	async ensureResourcesDir(workspacePath: string): Promise<void> {
		await fsPromises.mkdir(this.getResourcesDir(workspacePath), { recursive: true });
	}

	async getResources(workspacePath: string): Promise<ResourceInfo[]> {
		const dir = this.getResourcesDir(workspacePath);

		try {
			await fsPromises.access(dir);
		} catch {
			return [];
		}

		const dirEntries = await fsPromises.readdir(dir, { withFileTypes: true });
		const entries: ResourceInfo[] = [];

		for (const entry of dirEntries) {
			if (!entry.isFile()) continue;
			if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) continue;

			const filePath = path.join(dir, entry.name);
			try {
				const stats = await fsPromises.stat(filePath);
				const meta = this.fileManager.createFileMetadata(entry.name, filePath, stats);
				entries.push({
					id: meta.id,
					name: meta.name,
					path: meta.path,
					relativePath: entry.name,
					size: meta.size,
					mimeType: meta.mimeType,
					createdAt: meta.importedAt,
					modifiedAt: meta.lastModified,
				});
			} catch (err) {
				this.logger?.warn(ResourcesService.LOG_SOURCE, `Failed to stat ${entry.name}`, err);
			}
		}

		return entries;
	}

	async insertResources(
		workspacePath: string,
		sourcePaths: string[],
		extensions?: string[]
	): Promise<ResourceInfo[]> {
		await this.ensureResourcesDir(workspacePath);
		const dir = this.getResourcesDir(workspacePath);
		const allowed = extensions
			? new Set(extensions.map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase()))
			: null;
		const imported: ResourceInfo[] = [];

		for (const sourcePath of sourcePaths) {
			const ext = path.extname(sourcePath).toLowerCase();
			if (allowed && !allowed.has(ext)) {
				throw new Error(
					`File type "${ext}" is not supported. Allowed types: ${[...allowed].join(', ')}`
				);
			}

			try {
				const meta = await this.fileManager.copyFile(sourcePath, dir, (p) =>
					this.markFileAsWritten(p)
				);
				imported.push({
					id: meta.id,
					name: meta.name,
					path: meta.path,
					relativePath: meta.name,
					size: meta.size,
					mimeType: meta.mimeType,
					createdAt: meta.importedAt,
					modifiedAt: meta.lastModified,
				});
			} catch (err) {
				throw new Error(
					`Failed to import file ${path.basename(sourcePath)}: ${(err as Error).message}`
				);
			}
		}

		return imported;
	}

	async deleteResource(workspacePath: string, resourceId: string): Promise<void> {
		const dir = this.getResourcesDir(workspacePath);
		const filePath = path.join(dir, resourceId);

		const realFilePath = await fsPromises.realpath(filePath);
		const realDir = await fsPromises.realpath(dir);

		if (!realFilePath.startsWith(realDir)) {
			throw new Error('Cannot delete files outside the resources directory');
		}

		this.markFileAsWritten(filePath);
		await this.fileManager.deleteFile(realFilePath);
	}

	destroy(): void {
		this.workspaceUnsub?.();
		this.workspaceUnsub = null;
		this.stopWatching().catch((err) =>
			this.logger?.error(ResourcesService.LOG_SOURCE, 'Error during destroy', err)
		);
	}

	// ---------------------------------------------------------------------------
	// Watcher
	// ---------------------------------------------------------------------------

	private async startWatching(workspacePath: string): Promise<void> {
		const dir = this.getResourcesDir(workspacePath);
		if (this.currentDir === dir && this.watcher) return;

		await this.stopWatching();

		try {
			await fsPromises.mkdir(dir, { recursive: true });
		} catch (err) {
			this.logger?.error(ResourcesService.LOG_SOURCE, 'Failed to create resources dir', err);
			return;
		}

		const usePolling = process.platform === 'linux';
		this.watcher = chokidar.watch(dir, {
			ignoreInitial: true,
			persistent: true,
			awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
			usePolling,
			interval: 500,
			depth: 0,
			alwaysStat: false,
			ignored: (filePath: string) => {
				const normalized = path.normalize(filePath);
				if (normalized === dir) return false;
				const base = path.basename(normalized);
				return base.startsWith('.') || base.endsWith('.tmp');
			},
		});

		this.watcher
			.on('add', (p) => this.handleEvent(p, 'added'))
			.on('change', (p) => this.handleEvent(p, 'changed'))
			.on('unlink', (p) => this.handleEvent(p, 'removed'))
			.on('error', (err) => {
				this.logger?.error(ResourcesService.LOG_SOURCE, 'Watcher error', err);
			});

		this.currentDir = dir;
	}

	private async stopWatching(): Promise<void> {
		if (!this.watcher) return;
		try {
			await this.watcher.close();
		} catch (err) {
			this.logger?.error(ResourcesService.LOG_SOURCE, 'Error closing watcher', err);
		} finally {
			this.watcher = null;
			this.currentDir = null;
			this.clearDebounceTimers();
			this.ignoredWrites.clear();
		}
	}

	private handleWorkspaceChange(workspacePath: string | null): void {
		if (workspacePath) {
			this.startWatching(workspacePath).catch((err) =>
				this.logger?.error(ResourcesService.LOG_SOURCE, 'Failed to start watcher', err)
			);
		} else {
			this.stopWatching().catch((err) =>
				this.logger?.error(ResourcesService.LOG_SOURCE, 'Failed to stop watcher', err)
			);
		}
	}

	private handleEvent(filePath: string, type: ResourceEntryChangeEvent['type']): void {
		if (this.shouldIgnore(filePath)) return;

		const existing = this.debounceTimers.get(filePath);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(() => {
			const event: ResourceEntryChangeEvent = {
				type,
				resourceId: path.basename(filePath),
				resourcePath: filePath,
				timestamp: Date.now(),
			};
			this.eventBus.broadcast('resources:changed', event);
			this.debounceTimers.delete(filePath);
		}, DEBOUNCE_MS);

		this.debounceTimers.set(filePath, timer);
	}

	private markFileAsWritten(filePath: string): void {
		const normalized = path.normalize(filePath);
		this.ignoredWrites.set(normalized, Date.now());
		setTimeout(() => this.ignoredWrites.delete(normalized), IGNORE_WRITE_WINDOW_MS);
	}

	private shouldIgnore(filePath: string): boolean {
		const normalized = path.normalize(filePath);
		const stamp = this.ignoredWrites.get(normalized);
		if (!stamp) return false;
		return Date.now() - stamp < IGNORE_WRITE_WINDOW_MS;
	}

	private clearDebounceTimers(): void {
		for (const t of this.debounceTimers.values()) clearTimeout(t);
		this.debounceTimers.clear();
	}
}
