import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { WorkspaceService } from './workspace-service';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../services/logger';
import type { ProjectWorkspaceInfo } from '../../shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_WORKSPACE_FILENAME = 'project_workspace.json';
const PROJECT_WORKSPACE_VERSION = 1;
const JSON_INDENT_SPACES = 2;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ProjectWorkspaceService manages the project_workspace.json file in the workspace root.
 *
 * Responsibilities:
 *   - Automatically creates project_workspace.json when a workspace is set
 *   - Reads and returns the project metadata
 *   - Updates project name and description
 *   - Touches updatedAt on every modification
 *
 * The file is created lazily on first workspace set. If the file already exists,
 * only the updatedAt timestamp is refreshed.
 */
export class ProjectWorkspaceService implements Disposable {
	private workspaceEventUnsubscribe: (() => void) | null = null;

	constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly eventBus: EventBus,
		private readonly appVersion: string,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Initialize the service by ensuring the project file exists for the
	 * current workspace (if any) and subscribing to workspace changes.
	 */
	initialize(): void {
		const workspacePath = this.workspaceService.getCurrent();
		if (workspacePath) {
			this.ensureProjectFile(workspacePath);
		}

		this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
			const payload = event.payload as { currentPath: string | null; previousPath: string | null };
			if (payload.currentPath) {
				this.ensureProjectFile(payload.currentPath);
			}
		});

		this.logger?.info('ProjectWorkspaceService', 'Initialized');
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	/**
	 * Get the project workspace info for the current workspace.
	 * Returns null if no workspace is set or the file does not exist.
	 */
	getProjectInfo(): ProjectWorkspaceInfo | null {
		const workspacePath = this.workspaceService.getCurrent();
		if (!workspacePath) {
			return null;
		}
		return this.readProjectFile(workspacePath);
	}

	/**
	 * Update the project name.
	 * @throws Error if no workspace is set or name is empty.
	 */
	updateName(name: string): ProjectWorkspaceInfo {
		this.requireWorkspace();
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			throw new Error('Project name must be a non-empty string');
		}

		const workspacePath = this.workspaceService.getCurrent()!;
		const info = this.ensureProjectFile(workspacePath);
		info.name = name.trim();
		info.updatedAt = new Date().toISOString();
		this.writeProjectFile(workspacePath, info);

		this.logger?.info('ProjectWorkspaceService', `Updated project name to: ${info.name}`);
		return info;
	}

	/**
	 * Update the project description.
	 * @throws Error if no workspace is set.
	 */
	updateDescription(description: string): ProjectWorkspaceInfo {
		this.requireWorkspace();
		if (typeof description !== 'string') {
			throw new Error('Project description must be a string');
		}

		const workspacePath = this.workspaceService.getCurrent()!;
		const info = this.ensureProjectFile(workspacePath);
		info.description = description.trim();
		info.updatedAt = new Date().toISOString();
		this.writeProjectFile(workspacePath, info);

		this.logger?.info('ProjectWorkspaceService', 'Updated project description');
		return info;
	}

	/**
	 * Clean up resources on shutdown.
	 */
	destroy(): void {
		if (this.workspaceEventUnsubscribe) {
			this.workspaceEventUnsubscribe();
			this.workspaceEventUnsubscribe = null;
		}
		this.logger?.info('ProjectWorkspaceService', 'Destroyed');
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/**
	 * Ensure the project_workspace.json file exists in the given workspace.
	 * If it already exists, updates the updatedAt timestamp.
	 * If it does not exist, creates it with default values.
	 *
	 * @returns The current (or newly created) project info.
	 */
	private ensureProjectFile(workspacePath: string): ProjectWorkspaceInfo {
		const existing = this.readProjectFile(workspacePath);
		if (existing) {
			this.touchUpdatedAt(workspacePath, existing);
			return existing;
		}

		const folderName = path.basename(workspacePath);
		const now = new Date().toISOString();
		const info: ProjectWorkspaceInfo = {
			version: PROJECT_WORKSPACE_VERSION,
			projectId: randomUUID(),
			name: folderName,
			description: '',
			createdAt: now,
			updatedAt: now,
			appVersion: this.appVersion,
		};

		this.writeProjectFile(workspacePath, info);
		this.logger?.info(
			'ProjectWorkspaceService',
			`Created project_workspace.json in: ${workspacePath}`
		);
		return info;
	}

	/**
	 * Read and parse the project_workspace.json file from a workspace directory.
	 * Returns null if the file does not exist or is invalid.
	 */
	private readProjectFile(workspacePath: string): ProjectWorkspaceInfo | null {
		const filePath = this.getFilePath(workspacePath);

		if (!fs.existsSync(filePath)) {
			return null;
		}

		try {
			const raw = fs.readFileSync(filePath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);

			if (!this.isValidProjectInfo(parsed)) {
				this.logger?.warn(
					'ProjectWorkspaceService',
					`Invalid project_workspace.json schema in: ${workspacePath}`
				);
				return null;
			}

			return parsed;
		} catch (err) {
			this.logger?.error(
				'ProjectWorkspaceService',
				'Failed to read project_workspace.json',
				err
			);
			return null;
		}
	}

	/**
	 * Write the project info to the project_workspace.json file.
	 */
	private writeProjectFile(workspacePath: string, info: ProjectWorkspaceInfo): void {
		const filePath = this.getFilePath(workspacePath);

		try {
			const content = JSON.stringify(info, null, JSON_INDENT_SPACES);
			fs.writeFileSync(filePath, content, 'utf-8');
		} catch (err) {
			this.logger?.error(
				'ProjectWorkspaceService',
				'Failed to write project_workspace.json',
				err
			);
			throw new Error(
				`Failed to save project workspace file: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	/**
	 * Update the updatedAt timestamp without changing other fields.
	 */
	private touchUpdatedAt(workspacePath: string, info: ProjectWorkspaceInfo): void {
		info.updatedAt = new Date().toISOString();
		this.writeProjectFile(workspacePath, info);
	}

	/**
	 * Get the full path to the project_workspace.json file.
	 */
	private getFilePath(workspacePath: string): string {
		return path.join(workspacePath, PROJECT_WORKSPACE_FILENAME);
	}

	/**
	 * Ensure a workspace is currently set. Throws if not.
	 */
	private requireWorkspace(): void {
		if (!this.workspaceService.getCurrent()) {
			throw new Error('No workspace is currently set. Please select a workspace first.');
		}
	}

	/**
	 * Validate that a parsed object conforms to the ProjectWorkspaceInfo schema.
	 */
	private isValidProjectInfo(value: unknown): value is ProjectWorkspaceInfo {
		if (value === null || typeof value !== 'object' || Array.isArray(value)) {
			return false;
		}

		const obj = value as Record<string, unknown>;
		return (
			typeof obj.version === 'number' &&
			typeof obj.projectId === 'string' &&
			typeof obj.name === 'string' &&
			typeof obj.description === 'string' &&
			typeof obj.createdAt === 'string' &&
			typeof obj.updatedAt === 'string' &&
			typeof obj.appVersion === 'string'
		);
	}
}
