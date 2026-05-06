import path from 'node:path';
import { app } from 'electron';
import type { ProjectWorkspaceInfo, EditorMaxWidthType } from '../../shared/types';
import type { LoggerService } from '../logger';
import type { WorkspaceService } from './workspace-service';
import type { WorkspaceMetadataService } from './workspace-metadata';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Current schema version written to every new project block.
 * Increment when the shape changes in a breaking way.
 */
const SCHEMA_VERSION = 3;

/** Maximum allowed length for the `name` field. */
const MAX_NAME_LENGTH = 255;

/** Allowed values for `maxWidthType`. */
const MAX_WIDTH_TYPES: readonly EditorMaxWidthType[] = ['small', 'medium', 'large', 'full'];
const DEFAULT_MAX_WIDTH_TYPE: EditorMaxWidthType = 'medium';

/** Allowed range for `textSize` (whole-number percentage). */
const MIN_TEXT_SIZE = 50;
const MAX_TEXT_SIZE = 300;
const DEFAULT_TEXT_SIZE = 100;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ProjectWorkspaceService manages the project block (name, description,
 * projectId, ...) inside the workspace.json metadata file. Delegates all file
 * IO to WorkspaceMetadataService so there is a single source of truth on disk.
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
	 */
	async getOrCreate(): Promise<ProjectWorkspaceInfo> {
		const workspacePath = this.requireWorkspace();

		const existing = this.metadata.getProject();
		if (existing) {
			const maxWidthOk = this.isValidMaxWidthType(existing.maxWidthType);
			const textOk = this.isValidTextSize(existing.textSize);
			if (maxWidthOk && textOk) return existing;
			const migrated: ProjectWorkspaceInfo = {
				...existing,
				maxWidthType: maxWidthOk ? existing.maxWidthType : DEFAULT_MAX_WIDTH_TYPE,
				textSize: textOk ? existing.textSize : DEFAULT_TEXT_SIZE,
				version: SCHEMA_VERSION,
			};
			this.metadata.setProject(migrated);
			this.logger?.info(
				'ProjectWorkspaceService',
				`Migrated project info to schema v${SCHEMA_VERSION} (editor prefs)`
			);
			return migrated;
		}

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

		const now = new Date().toISOString();
		const info: ProjectWorkspaceInfo = {
			version: SCHEMA_VERSION,
			projectId: path.basename(workspacePath),
			name: name.trim(),
			description,
			createdAt: now,
			updatedAt: now,
			appVersion: this.getAppVersion(),
			editorWidth: DEFAULT_EDITOR_WIDTH,
			textSize: DEFAULT_TEXT_SIZE,
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

	async updateEditorWidth(percentage: number): Promise<ProjectWorkspaceInfo> {
		this.validateEditorWidth(percentage);
		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			editorWidth: percentage,
			updatedAt: new Date().toISOString(),
		};
		this.metadata.setProject(updated);
		this.logger?.info(
			'ProjectWorkspaceService',
			`Updated editor width to: ${percentage}%`
		);
		return updated;
	}

	async updateTextSize(percentage: number): Promise<ProjectWorkspaceInfo> {
		this.validateTextSize(percentage);
		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			textSize: percentage,
			updatedAt: new Date().toISOString(),
		};
		this.metadata.setProject(updated);
		this.logger?.info(
			'ProjectWorkspaceService',
			`Updated text size to: ${percentage}%`
		);
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
			editorWidth: DEFAULT_EDITOR_WIDTH,
			textSize: DEFAULT_TEXT_SIZE,
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

	private validateEditorWidth(value: unknown): void {
		if (!this.isValidEditorWidth(value)) {
			throw new RangeError(
				`Editor width must be a whole number between ${MIN_EDITOR_WIDTH} and ${MAX_EDITOR_WIDTH}`
			);
		}
	}

	private isValidEditorWidth(value: unknown): value is number {
		return (
			typeof value === 'number' &&
			Number.isFinite(value) &&
			Number.isInteger(value) &&
			value >= MIN_EDITOR_WIDTH &&
			value <= MAX_EDITOR_WIDTH
		);
	}

	private validateTextSize(value: unknown): void {
		if (!this.isValidTextSize(value)) {
			throw new RangeError(
				`Text size must be a whole number between ${MIN_TEXT_SIZE} and ${MAX_TEXT_SIZE}`
			);
		}
	}

	private isValidTextSize(value: unknown): value is number {
		return (
			typeof value === 'number' &&
			Number.isFinite(value) &&
			Number.isInteger(value) &&
			value >= MIN_TEXT_SIZE &&
			value <= MAX_TEXT_SIZE
		);
	}

	private getAppVersion(): string {
		try {
			return app.getVersion();
		} catch {
			return '0.0.0';
		}
	}
}
