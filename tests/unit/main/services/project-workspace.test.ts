import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectWorkspaceService } from '../../../../src/main/workspace/project-workspace';
import type { WorkspaceService } from '../../../../src/main/workspace/workspace-service';
import type { ProjectWorkspaceInfo } from '../../../../src/shared/types';

// Mock Electron's app module so getAppVersion() works in test context
jest.mock('electron', () => ({
	app: {
		getVersion: jest.fn(() => '1.0.0-test'),
	},
}));

describe('ProjectWorkspaceService', () => {
	let tempDir: string;
	let workspaceDir: string;
	let service: ProjectWorkspaceService;
	let mockWorkspaceService: jest.Mocked<WorkspaceService>;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-workspace-test-'));
		workspaceDir = path.join(tempDir, 'test-workspace');
		fs.mkdirSync(workspaceDir, { recursive: true });

		let currentWorkspace: string | null = workspaceDir;

		mockWorkspaceService = {
			getCurrent: jest.fn(() => currentWorkspace),
			setCurrent: jest.fn((wsPath: string) => {
				currentWorkspace = wsPath;
			}),
			getState: jest.fn(),
			clear: jest.fn(() => {
				currentWorkspace = null;
			}),
			getRecent: jest.fn(),
			hasWorkspace: jest.fn(),
			destroy: jest.fn(),
			initialize: jest.fn(),
			removeRecent: jest.fn(),
		} as unknown as jest.Mocked<WorkspaceService>;

		service = new ProjectWorkspaceService(mockWorkspaceService);
	});

	afterEach(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	// ---------------------------------------------------------------------------
	// Helper
	// ---------------------------------------------------------------------------

	function readProjectFile(): ProjectWorkspaceInfo {
		const filePath = path.join(workspaceDir, 'project_workspace.openwriter');
		const raw = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(raw);
	}

	function projectFileExists(): boolean {
		return fs.existsSync(path.join(workspaceDir, 'project_workspace.openwriter'));
	}

	// ---------------------------------------------------------------------------
	// getOrCreate
	// ---------------------------------------------------------------------------

	describe('getOrCreate', () => {
		it('should create project_workspace.openwriter if it does not exist', async () => {
			expect(projectFileExists()).toBe(false);

			const info = await service.getOrCreate();

			expect(projectFileExists()).toBe(true);
			expect(info.version).toBe(1);
			expect(info.projectId).toBeDefined();
			expect(info.name).toBe('test-workspace');
			expect(info.description).toBe('');
			expect(info.createdAt).toBeDefined();
			expect(info.updatedAt).toBeDefined();
			expect(info.appVersion).toBe('1.0.0-test');
		});

		it('should return existing project_workspace.openwriter data', async () => {
			const existingData: ProjectWorkspaceInfo = {
				version: 1,
				projectId: 'existing-id-123',
				name: 'My Project',
				description: 'A test project',
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-06-01T00:00:00.000Z',
				appVersion: '0.9.0',
			};
			fs.writeFileSync(
				path.join(workspaceDir, 'project_workspace.openwriter'),
				JSON.stringify(existingData, null, 2),
				'utf-8'
			);

			const info = await service.getOrCreate();

			expect(info.projectId).toBe('existing-id-123');
			expect(info.name).toBe('My Project');
			expect(info.description).toBe('A test project');
			expect(info.createdAt).toBe('2025-01-01T00:00:00.000Z');
			expect(info.appVersion).toBe('0.9.0');
		});

		it('should throw when no workspace is set', async () => {
			mockWorkspaceService.clear();

			await expect(service.getOrCreate()).rejects.toThrow('No workspace selected');
		});

		it('should generate unique project IDs for different workspaces', async () => {
			const info1 = await service.getOrCreate();

			const workspace2 = path.join(tempDir, 'workspace-2');
			fs.mkdirSync(workspace2, { recursive: true });
			mockWorkspaceService.setCurrent(workspace2);

			const service2 = new ProjectWorkspaceService(mockWorkspaceService);
			const info2 = await service2.getOrCreate();

			expect(info1.projectId).not.toBe(info2.projectId);
		});

		it('should handle malformed JSON by throwing', async () => {
			fs.writeFileSync(
				path.join(workspaceDir, 'project_workspace.openwriter'),
				'{ invalid json }}',
				'utf-8'
			);

			await expect(service.getOrCreate()).rejects.toThrow('invalid JSON');
		});

		it('should handle missing fields gracefully with defaults', async () => {
			fs.writeFileSync(
				path.join(workspaceDir, 'project_workspace.openwriter'),
				JSON.stringify({ version: 1 }),
				'utf-8'
			);

			const info = await service.getOrCreate();

			expect(info.version).toBe(1);
			expect(info.projectId).toBeDefined();
			expect(info.name).toBe('test-workspace'); // defaults to folder name
			expect(info.description).toBe('');
		});
	});

	// ---------------------------------------------------------------------------
	// updateName
	// ---------------------------------------------------------------------------

	describe('updateName', () => {
		it('should update the project name', async () => {
			await service.getOrCreate();

			const updated = await service.updateName('New Project Name');

			expect(updated.name).toBe('New Project Name');
			const onDisk = readProjectFile();
			expect(onDisk.name).toBe('New Project Name');
		});

		it('should trim whitespace from name', async () => {
			await service.getOrCreate();

			const updated = await service.updateName('  Trimmed Name  ');

			expect(updated.name).toBe('Trimmed Name');
		});

		it('should update the updatedAt timestamp', async () => {
			const initial = await service.getOrCreate();
			const initialUpdatedAt = initial.updatedAt;

			// Small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			const updated = await service.updateName('Updated Name');

			expect(updated.updatedAt).not.toBe(initialUpdatedAt);
		});

		it('should preserve other fields when updating name', async () => {
			const initial = await service.getOrCreate();

			const updated = await service.updateName('New Name');

			expect(updated.projectId).toBe(initial.projectId);
			expect(updated.createdAt).toBe(initial.createdAt);
			expect(updated.version).toBe(initial.version);
			expect(updated.description).toBe(initial.description);
		});

		it('should throw for empty name', async () => {
			await service.getOrCreate();

			await expect(service.updateName('')).rejects.toThrow('must not be empty');
		});

		it('should throw for whitespace-only name', async () => {
			await service.getOrCreate();

			await expect(service.updateName('   ')).rejects.toThrow('must not be empty');
		});

		it('should throw when no workspace is set', async () => {
			mockWorkspaceService.clear();

			await expect(service.updateName('test')).rejects.toThrow('No workspace selected');
		});
	});

	// ---------------------------------------------------------------------------
	// updateDescription
	// ---------------------------------------------------------------------------

	describe('updateDescription', () => {
		it('should update the project description', async () => {
			await service.getOrCreate();

			const updated = await service.updateDescription('A great project');

			expect(updated.description).toBe('A great project');
			const onDisk = readProjectFile();
			expect(onDisk.description).toBe('A great project');
		});

		it('should allow empty description', async () => {
			await service.getOrCreate();
			await service.updateDescription('Some description');

			const updated = await service.updateDescription('');

			expect(updated.description).toBe('');
		});

		it('should update the updatedAt timestamp', async () => {
			const initial = await service.getOrCreate();
			const initialUpdatedAt = initial.updatedAt;

			await new Promise((resolve) => setTimeout(resolve, 10));

			const updated = await service.updateDescription('New description');

			expect(updated.updatedAt).not.toBe(initialUpdatedAt);
		});

		it('should preserve other fields when updating description', async () => {
			const initial = await service.getOrCreate();

			const updated = await service.updateDescription('New description');

			expect(updated.projectId).toBe(initial.projectId);
			expect(updated.createdAt).toBe(initial.createdAt);
			expect(updated.name).toBe(initial.name);
		});

		it('should throw when no workspace is set', async () => {
			mockWorkspaceService.clear();

			await expect(service.updateDescription('test')).rejects.toThrow('No workspace selected');
		});
	});

	// ---------------------------------------------------------------------------
	// File integrity
	// ---------------------------------------------------------------------------

	describe('file integrity', () => {
		it('should write valid JSON to disk', async () => {
			await service.getOrCreate();

			const raw = fs.readFileSync(path.join(workspaceDir, 'project_workspace.openwriter'), 'utf-8');

			expect(() => JSON.parse(raw)).not.toThrow();
		});

		it('should write pretty-printed JSON', async () => {
			await service.getOrCreate();

			const raw = fs.readFileSync(path.join(workspaceDir, 'project_workspace.openwriter'), 'utf-8');

			// Pretty-printed JSON contains newlines and indentation
			expect(raw).toContain('\n');
			expect(raw).toContain('  ');
		});

		it('should create the file even if called multiple times', async () => {
			const info1 = await service.getOrCreate();
			const info2 = await service.getOrCreate();

			// Same project ID should be returned
			expect(info1.projectId).toBe(info2.projectId);
		});
	});
});
