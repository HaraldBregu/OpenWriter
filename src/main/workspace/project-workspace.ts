import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ProjectWorkspaceInfo } from '../../shared/types';
import type { LoggerService } from '../services/logger';
import type { WorkspaceService } from './workspace-service';
import type { WorkspaceMetadataService } from './workspace-metadata';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Legacy file name. Migrated into workspace.json on first read. */
const LEGACY_FILENAME = 'project_workspace.openwriter';

/**
 * Current schema version written to every new project block.
 * Increment when the shape changes in a breaking way.
 */
const SCHEMA_VERSION = 1;

/** Maximum allowed length for the `name` field. */
const MAX_NAME_LENGTH = 255;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ProjectWorkspaceService manages the project block (name, description,
 * projectId, ...) inside the workspace.json metadata file. Delegates all file
 * IO to WorkspaceMetadataService so there is a single source of truth on disk.
 *
 * Responsibilities:
 *   - Provide a typed API for reading / updating project info
 *   - Validate inputs before accepting them
 *   - Auto-create a default project block when the workspace is first opened
 *   - One-shot migration of any legacy `project_workspace.openwriter` file
 *     into the metadata file's `project` block
 */
export class ProjectWorkspaceService {
	constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly metadata: WorkspaceMetadataService,
		private readonly logger?: LoggerService
	) {}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Return the current workspace's project info, creating defaults if absent.
	 * Migrates any legacy file in the workspace root before reading.
	 */
	async getOrCreate(): Promise<ProjectWorkspaceInfo> {
		const workspacePath = this.requireWorkspace();
		await this.migrateLegacy(workspacePath);

		const existing = this.metadata.getProject();
		if (existing) return existing;

		const created = this.buildDefault(workspacePath);
		this.metadata.setProject(created);
		this.logger?.info(
			'ProjectWorkspaceService',
			`Initialised default project info at: ${workspacePath}`
		);
		return created;
	}

	/**
	 * Materialise a fresh project block at the given workspace path. Used by
	 * WorkspacesRegistry.create() right after allocating an empty folder.
	 * Throws if a project block already exists.
	 */
	async createAt(
		workspacePath: string,
		name: string,
		description: string
	): Promise<ProjectWorkspaceInfo> {
		this.validateName(name);
		this.validateDescription(description);
		await this.migrateLegacy(workspacePath);

		const now = new Date().toISOString();
		const info: ProjectWorkspaceInfo = {
			version: SCHEMA_VERSION,
			projectId: path.basename(workspacePath),
			name: name.trim(),
			description,
			createdAt: now,
			updatedAt: now,
			appVersion: this.getAppVersion(),
		};

		this.metadata.writeProjectAt(workspacePath, info);
		this.logger?.info(
			'ProjectWorkspaceService',
			`Created project info at: ${workspacePath}`
		);
		return info;
	}

	/**
	 * Read project info for an arbitrary workspace path without creating
	 * anything. Used by the recent-workspaces list. Returns null when missing.
	 */
	async readAt(workspacePath: string): Promise<ProjectWorkspaceInfo | null> {
		await this.migrateLegacy(workspacePath);
		return this.metadata.readProjectAt(workspacePath);
	}

	async updateName(name: string): Promise<ProjectWorkspaceInfo> {
		this.validateName(name);
		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			name: name.trim(),
			updatedAt: new Date().toISOString(),
		};
		this.metadata.setProject(updated);
		this.logger?.info('ProjectWorkspaceService', `Updated project name to: "${updated.name}"`);
		return updated;
	}

	async updateDescription(description: string): Promise<ProjectWorkspaceInfo> {
		this.validateDescription(description);
		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			description,
			updatedAt: new Date().toISOString(),
		};
		this.metadata.setProject(updated);
		this.logger?.info('ProjectWorkspaceService', `Updated project description`);
		return updated;
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private requireWorkspace(): string {
		const current = this.workspaceService.getCurrent();
		if (!current) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}
		return current;
	}

	/**
	 * If a legacy `project_workspace.openwriter` file exists at the workspace
	 * root, parse it, fold it into workspace.json's project block (when the
	 * block is not already present), then delete the legacy file.
	 *
	 * Idempotent: a workspace whose metadata already contains a project block
	 * still gets its legacy file deleted to avoid stale duplicates on disk.
	 */
	private async migrateLegacy(workspacePath: string): Promise<void> {
		const legacyPath = path.join(workspacePath, LEGACY_FILENAME);
		if (!fs.existsSync(legacyPath)) return;

		try {
			const existing = this.metadata.readProjectAt(workspacePath);
			if (!existing) {
				const raw = await fsPromises.readFile(legacyPath, 'utf-8');
				const parsed = JSON.parse(raw);
				const info = this.validateSchema(parsed, workspacePath);
				this.metadata.writeProjectAt(workspacePath, info);
				this.logger?.info(
					'ProjectWorkspaceService',
					`Migrated ${LEGACY_FILENAME} → workspace.json at: ${workspacePath}`
				);
			}
			await fsPromises.unlink(legacyPath);
		} catch (err) {
			this.logger?.warn(
				'ProjectWorkspaceService',
				`Failed to migrate ${LEGACY_FILENAME} at ${workspacePath}: ${
					err instanceof Error ? err.message : String(err)
				}`
			);
		}
	}

	private buildDefault(workspacePath: string): ProjectWorkspaceInfo {
		const now = new Date().toISOString();
		return {
			version: SCHEMA_VERSION,
			projectId: path.basename(workspacePath),
			name: path.basename(workspacePath),
			description: '',
			createdAt: now,
			updatedAt: now,
			appVersion: this.getAppVersion(),
		};
	}

	private validateSchema(parsed: unknown, workspacePath: string): ProjectWorkspaceInfo {
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('Legacy project file must contain a JSON object at the root level.');
		}

		const record = parsed as Record<string, unknown>;
		const now = new Date().toISOString();

		return {
			version:
				typeof record['version'] === 'number' && record['version'] > 0
					? (record['version'] as number)
					: SCHEMA_VERSION,
			projectId:
				typeof record['projectId'] === 'string'
					? record['projectId']
					: path.basename(workspacePath),
			name:
				typeof record['name'] === 'string' && record['name'].trim().length > 0
					? (record['name'] as string)
					: path.basename(workspacePath),
			description:
				typeof record['description'] === 'string' ? (record['description'] as string) : '',
			createdAt: typeof record['createdAt'] === 'string' ? (record['createdAt'] as string) : now,
			updatedAt: typeof record['updatedAt'] === 'string' ? (record['updatedAt'] as string) : now,
			appVersion:
				typeof record['appVersion'] === 'string'
					? (record['appVersion'] as string)
					: this.getAppVersion(),
		};
	}

	private validateName(name: unknown): void {
		if (typeof name !== 'string') {
			throw new TypeError('Project name must be a string');
		}
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			throw new Error('Project name must not be empty');
		}
		if (trimmed.length > MAX_NAME_LENGTH) {
			throw new Error(`Project name must not exceed ${MAX_NAME_LENGTH} characters`);
		}
	}

	private validateDescription(description: unknown): void {
		if (typeof description !== 'string') {
			throw new TypeError('Project description must be a string');
		}
	}

	private getAppVersion(): string {
		try {
			return app.getVersion();
		} catch {
			return '0.0.0';
		}
	}
}
