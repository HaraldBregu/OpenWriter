import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceService } from './workspace-service';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../services/logger';
import type { ProjectWorkspaceInfo } from '../../shared/types';

const METADATA_FILENAME = 'workspace.json';
const DEBOUNCE_MS = 800;

/**
 * WorkspaceMetadataService manages the workspace.json file in the workspace root.
 *
 * The file is a flat ProjectWorkspaceInfo (version, projectId, name, description,
 * createdAt, updatedAt, appVersion).
 *
 * Pattern: Repository
 *
 * Design decisions:
 * - In-memory cache for the active workspace; invalidated on workspace change
 * - Debounced writes coalesce rapid updates
 */
export class WorkspaceMetadataService implements Disposable {
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingWrite: { info: ProjectWorkspaceInfo; workspacePath: string } | null = null;
	private cache: { info: ProjectWorkspaceInfo | null; workspacePath: string } | null = null;
	private workspaceEventUnsubscribe: (() => void) | null = null;

	constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly eventBus: EventBus,
		private readonly logger?: LoggerService
	) {}

	initialize(): void {
		this.cache = null;
		const workspacePath = this.workspaceService.getCurrent();
		if (workspacePath) {
			this.readFromFile(workspacePath);
		}

		if (!this.workspaceEventUnsubscribe) {
			this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', () => {
				this.flush();
				this.cache = null;
			});
		}
	}

	getProject(): ProjectWorkspaceInfo | null {
		const workspacePath = this.workspaceService.getCurrent();
		if (!workspacePath) return null;
		if (this.cache && this.cache.workspacePath === workspacePath) {
			return this.cache.info;
		}
		return this.readFromFile(workspacePath);
	}

	readProjectAt(workspacePath: string): ProjectWorkspaceInfo | null {
		return this.readFromFile(workspacePath);
	}

	setProject(info: ProjectWorkspaceInfo): void {
		const workspacePath = this.workspaceService.getCurrent();
		if (!workspacePath) {
			throw new Error('No workspace is currently set. Please select a workspace first.');
		}
		const updated: ProjectWorkspaceInfo = { ...info, updatedAt: new Date().toISOString() };
		this.cache = { info: updated, workspacePath };
		this.scheduleSave(updated, workspacePath);
		this.logger?.info('WorkspaceMetadataService', `Set project info: ${updated.name}`);
	}

	writeProjectAt(workspacePath: string, info: ProjectWorkspaceInfo): void {
		const filePath = this.getFilePath(workspacePath);
		if (fs.existsSync(filePath)) {
			throw new Error(`Project info already exists at: ${workspacePath}`);
		}
		this.writeToFile(workspacePath, info);
		if (this.workspaceService.getCurrent() === workspacePath) {
			this.cache = { info, workspacePath };
		}
	}

	flush(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.pendingWrite) {
			this.writeToFile(this.pendingWrite.workspacePath, this.pendingWrite.info);
			this.pendingWrite = null;
		}
	}

	destroy(): void {
		if (this.workspaceEventUnsubscribe) {
			this.workspaceEventUnsubscribe();
			this.workspaceEventUnsubscribe = null;
		}
		this.flush();
	}

	private getFilePath(workspacePath: string): string {
		return path.join(workspacePath, METADATA_FILENAME);
	}

	private readFromFile(workspacePath: string): ProjectWorkspaceInfo | null {
		const filePath = this.getFilePath(workspacePath);

		if (!fs.existsSync(filePath)) {
			this.cache = { info: null, workspacePath };
			return null;
		}

		try {
			const raw = fs.readFileSync(filePath, 'utf-8');
			const parsed = JSON.parse(raw) as ProjectWorkspaceInfo;

			if (typeof parsed?.projectId !== 'string' || typeof parsed?.name !== 'string') {
				this.logger?.warn(
					'WorkspaceMetadataService',
					`Invalid workspace.json schema at ${filePath}`
				);
				this.cache = { info: null, workspacePath };
				return null;
			}

			this.cache = { info: parsed, workspacePath };
			return parsed;
		} catch (err) {
			this.logger?.error('WorkspaceMetadataService', 'Failed to read workspace.json', err);
			this.cache = { info: null, workspacePath };
			return null;
		}
	}

	private writeToFile(workspacePath: string, info: ProjectWorkspaceInfo): void {
		const filePath = this.getFilePath(workspacePath);
		try {
			const content = JSON.stringify(info, null, 2);
			fs.writeFileSync(filePath, content, 'utf-8');
			this.logger?.info('WorkspaceMetadataService', `Saved workspace.json to: ${filePath}`);
		} catch (err) {
			this.logger?.error('WorkspaceMetadataService', 'Failed to write workspace.json', err);
			throw new Error(
				`Failed to save workspace metadata: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	private scheduleSave(info: ProjectWorkspaceInfo, workspacePath: string): void {
		this.pendingWrite = { info, workspacePath };

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null;
			if (this.pendingWrite) {
				this.writeToFile(this.pendingWrite.workspacePath, this.pendingWrite.info);
				this.pendingWrite = null;
			}
		}, DEBOUNCE_MS);
	}
}
