import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import type { ProjectWorkspaceInfo } from '../../shared/types';
import type { AgentConfig, WorkspaceAgentEntry } from '../../shared/aiSettings';
import type { LoggerService } from '../services/logger';
import type { WorkspaceService } from './workspace-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_WORKSPACE_FILENAME = 'project_workspace.openwriter';

/**
 * Current schema version written to every new project_workspace.openwriter.
 * Increment when the file shape changes in a breaking way and add migration
 * logic in `migrateIfNeeded`.
 */
const SCHEMA_VERSION = 1;

/**
 * Maximum allowed length for the `name` field.
 */
const MAX_NAME_LENGTH = 255;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ProjectWorkspaceService manages the `project_workspace.openwriter` file in the
 * root of each workspace folder.
 *
 * Responsibilities:
 *   - Read the file on demand (no caching — allows external edits to be picked
 *     up automatically without a restart).
 *   - Write the file atomically using a temp-file-then-rename strategy so that
 *     a crash mid-write never leaves a corrupt file on disk.
 *   - Validate all inputs before accepting them.
 *   - Auto-create a default file when the workspace is opened for the first
 *     time (i.e. the file does not exist yet).
 *
 * This service has no Electron dependency (other than `app.getVersion()` which
 * is lazy-resolved at write time) and can be unit-tested without mocking
 * Electron itself.
 */
export class ProjectWorkspaceService {
	constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly logger?: LoggerService
	) {}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Return the current `project_workspace.openwriter` data, creating it if it does
	 * not yet exist.
	 *
	 * @returns The parsed `ProjectWorkspaceInfo`, guaranteed non-null.
	 * @throws If no workspace is set or if the file exists but cannot be parsed.
	 */
	async getOrCreate(): Promise<ProjectWorkspaceInfo> {
		const workspacePath = this.requireWorkspace();
		const filePath = this.resolveFilePath(workspacePath);

		if (!fs.existsSync(filePath)) {
			this.logger?.info(
				'ProjectWorkspaceService',
				`project_workspace.openwriter not found, creating default at: ${filePath}`
			);
			const created = this.buildDefault(workspacePath);
			await this.atomicWrite(filePath, created);
			return created;
		}

		return this.readAndMigrate(filePath, workspacePath);
	}

	/**
	 * Update the `name` field of the project.
	 *
	 * @param name - New project name. Must be non-empty, max 255 chars.
	 * @returns The updated `ProjectWorkspaceInfo`.
	 * @throws If validation fails, no workspace is set, or the write fails.
	 */
	async updateName(name: string): Promise<ProjectWorkspaceInfo> {
		this.validateName(name);
		const workspacePath = this.requireWorkspace();
		const filePath = this.resolveFilePath(workspacePath);

		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			name: name.trim(),
			updatedAt: new Date().toISOString(),
		};

		await this.atomicWrite(filePath, updated);
		this.logger?.info('ProjectWorkspaceService', `Updated project name to: "${updated.name}"`);
		return updated;
	}

	/**
	 * Update the `description` field of the project.
	 *
	 * @param description - New description. May be empty string to clear it.
	 * @returns The updated `ProjectWorkspaceInfo`.
	 * @throws If validation fails, no workspace is set, or the write fails.
	 */
	async updateDescription(description: string): Promise<ProjectWorkspaceInfo> {
		this.validateDescription(description);
		const workspacePath = this.requireWorkspace();
		const filePath = this.resolveFilePath(workspacePath);

		const current = await this.getOrCreate();
		const updated: ProjectWorkspaceInfo = {
			...current,
			description,
			updatedAt: new Date().toISOString(),
		};

		await this.atomicWrite(filePath, updated);
		this.logger?.info('ProjectWorkspaceService', `Updated project description`);
		return updated;
	}

	// -------------------------------------------------------------------------
	// Agent settings
	// -------------------------------------------------------------------------

	/**
	 * Get all persisted agent configurations for this workspace.
	 */
	async getAgentSettings(): Promise<WorkspaceAgentEntry[]> {
		const info = await this.getOrCreate();
		return [...info.agents];
	}

	/**
	 * Get the configuration for a single agent by ID.
	 */
	async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
		const info = await this.getOrCreate();
		const entry = info.agents.find((a) => a.agentId === agentId);
		if (!entry) return null;
		const { agentId: _id, ...config } = entry;
		return config;
	}

	/**
	 * Persist the configuration for a single agent.
	 * Upserts: updates the existing entry or appends a new one.
	 */
	async setAgentConfig(agentId: string, config: AgentConfig): Promise<void> {
		const workspacePath = this.requireWorkspace();
		const filePath = this.resolveFilePath(workspacePath);
		const current = await this.getOrCreate();

		const entry: WorkspaceAgentEntry = { agentId, ...config };
		const index = current.agents.findIndex((a) => a.agentId === agentId);
		if (index >= 0) {
			current.agents[index] = entry;
		} else {
			current.agents.push(entry);
		}

		const updated: ProjectWorkspaceInfo = {
			...current,
			updatedAt: new Date().toISOString(),
		};

		await this.atomicWrite(filePath, updated);
		this.logger?.info('ProjectWorkspaceService', `Updated agent config: ${agentId}`);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Require the current workspace path or throw.
	 */
	private requireWorkspace(): string {
		const current = this.workspaceService.getCurrent();
		if (!current) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}
		return current;
	}

	/**
	 * Resolve the absolute path to `project_workspace.openwriter` in a workspace.
	 */
	private resolveFilePath(workspacePath: string): string {
		return path.join(workspacePath, PROJECT_WORKSPACE_FILENAME);
	}

	/**
	 * Build a default `ProjectWorkspaceInfo` for a freshly opened workspace.
	 * The project name defaults to the workspace folder's base name.
	 */
	private buildDefault(workspacePath: string): ProjectWorkspaceInfo {
		const now = new Date().toISOString();
		return {
			version: SCHEMA_VERSION,
			projectId: randomUUID(),
			name: path.basename(workspacePath),
			description: '',
			agents: [],
			createdAt: now,
			updatedAt: now,
			appVersion: this.getAppVersion(),
		};
	}

	/**
	 * Read and parse the project_workspace.openwriter file.
	 * Applies any pending migrations before returning.
	 *
	 * @throws If the file cannot be read or parsed as valid JSON.
	 */
	private async readAndMigrate(
		filePath: string,
		workspacePath: string
	): Promise<ProjectWorkspaceInfo> {
		let raw: string;
		try {
			raw = await fsPromises.readFile(filePath, 'utf-8');
		} catch (err) {
			throw new Error(
				`Failed to read project_workspace.openwriter: ${err instanceof Error ? err.message : String(err)}`
			);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error(
				`project_workspace.openwriter contains invalid JSON. ` +
					`Delete the file to let OpenWriter recreate it.`
			);
		}

		const info = this.validateSchema(parsed, workspacePath);
		const migrated = this.migrateIfNeeded(info, workspacePath);

		// Persist migrations back to disk if the version changed
		if (migrated.version !== info.version) {
			await this.atomicWrite(filePath, migrated);
			this.logger?.info(
				'ProjectWorkspaceService',
				`Migrated project_workspace.openwriter v${info.version} → v${migrated.version}`
			);
		}

		return migrated;
	}

	/**
	 * Validate that the parsed value conforms to the expected schema shape and
	 * fill in missing optional fields with sensible defaults.
	 *
	 * This is intentionally lenient so that manually edited files (e.g. a
	 * developer edited the file by hand and removed a field) can still be
	 * loaded rather than failing hard.
	 */
	private validateSchema(parsed: unknown, workspacePath: string): ProjectWorkspaceInfo {
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('project_workspace.openwriter must contain a JSON object at the root level.');
		}

		const record = parsed as Record<string, unknown>;
		const now = new Date().toISOString();

		return {
			version:
				typeof record['version'] === 'number' && record['version'] > 0
					? (record['version'] as number)
					: SCHEMA_VERSION,
			projectId: typeof record['projectId'] === 'string' ? record['projectId'] : randomUUID(),
			name:
				typeof record['name'] === 'string' && record['name'].trim().length > 0
					? (record['name'] as string)
					: path.basename(workspacePath),
			description:
				typeof record['description'] === 'string' ? (record['description'] as string) : '',
			agents: Array.isArray(record['agents']) ? (record['agents'] as WorkspaceAgentEntry[]) : [],
			createdAt: typeof record['createdAt'] === 'string' ? (record['createdAt'] as string) : now,
			updatedAt: typeof record['updatedAt'] === 'string' ? (record['updatedAt'] as string) : now,
			appVersion:
				typeof record['appVersion'] === 'string'
					? (record['appVersion'] as string)
					: this.getAppVersion(),
		};
	}

	/**
	 * Apply schema migrations for older file versions.
	 * Currently there is only v1, so this is a no-op placeholder for future use.
	 */
	private migrateIfNeeded(
		info: ProjectWorkspaceInfo,
		_workspacePath: string
	): ProjectWorkspaceInfo {
		// Future migrations go here, e.g.:
		//   if (info.version < 2) info = migrateV1ToV2(info);
		return info;
	}

	/**
	 * Write `data` to `filePath` atomically using a temp-sibling-then-rename
	 * strategy. This ensures no half-written file is left on disk if the
	 * process crashes during the write.
	 */
	private async atomicWrite(filePath: string, data: ProjectWorkspaceInfo): Promise<void> {
		const dir = path.dirname(filePath);
		const tmpPath = path.join(dir, `.project_workspace_tmp_${Date.now()}.openwriter`);
		const content = JSON.stringify(data, null, 2);

		try {
			await fsPromises.writeFile(tmpPath, content, 'utf-8');
			await fsPromises.rename(tmpPath, filePath);
		} catch (err) {
			// Best-effort cleanup of the temp file
			await fsPromises.unlink(tmpPath).catch(() => undefined);
			throw new Error(
				`Failed to write project_workspace.openwriter: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	/**
	 * Validate the project name field.
	 */
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

	/**
	 * Validate the project description field.
	 */
	private validateDescription(description: unknown): void {
		if (typeof description !== 'string') {
			throw new TypeError('Project description must be a string');
		}
	}

	/**
	 * Safely resolve the running Electron app version.
	 * Falls back to '0.0.0' in unit-test environments where `app` is not
	 * initialised.
	 */
	private getAppVersion(): string {
		try {
			return app.getVersion();
		} catch {
			return '0.0.0';
		}
	}
}
