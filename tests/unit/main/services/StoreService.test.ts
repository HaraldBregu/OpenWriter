/**
 * Tests for StoreService.
 * Validates electron-store-based API key and workspace persistence.
 */

// In-memory store backing for the mock
let mockStoreData: Record<string, unknown> = {};

jest.mock('electron-store', () => {
	return jest.fn().mockImplementation((opts: { defaults?: Record<string, unknown> }) => {
		// Reset store data and apply defaults
		mockStoreData = { ...(opts?.defaults ?? {}) };

		// Run migrations if provided
		if (opts && 'migrations' in opts) {
			const migrations = (opts as Record<string, unknown>).migrations as Record<
				string,
				(store: { get: (key: string) => unknown; set: (key: string, val: unknown) => void }) => void
			>;
			const migrationStore = {
				get: (key: string) => mockStoreData[key],
				set: (key: string, val: unknown) => {
					mockStoreData[key] = val;
				},
			};
			for (const fn of Object.values(migrations)) {
				fn(migrationStore);
			}
		}

		return {
			get: jest.fn((key: string) => mockStoreData[key]),
			set: jest.fn((key: string, val: unknown) => {
				mockStoreData[key] = val;
			}),
		};
	});
});

import { StoreService } from '../../../../src/main/services/store';

describe('StoreService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockStoreData = {};
	});

	describe('constructor', () => {
		it('should create service with defaults when store is empty', () => {
			const service = new StoreService();
			expect(service.getCurrentWorkspace()).toBeNull();
			expect(service.getRecentWorkspaces()).toEqual([]);
			expect(service.getAllApiKeys()).toEqual({});
		});
	});

	describe('API key settings', () => {
		it('should return null for unknown provider', () => {
			const service = new StoreService();
			expect(service.getApiKey('unknown')).toBeNull();
		});

		it('should set and get an API key', () => {
			const service = new StoreService();
			service.setApiKey('openai', 'sk-test-123');
			expect(service.getApiKey('openai')).toBe('sk-test-123');
		});

		it('should overwrite existing API key', () => {
			const service = new StoreService();
			service.setApiKey('openai', 'sk-old');
			service.setApiKey('openai', 'sk-new');
			expect(service.getApiKey('openai')).toBe('sk-new');
		});

		it('should return all API keys', () => {
			const service = new StoreService();
			service.setApiKey('openai', 'sk-openai');
			service.setApiKey('anthropic', 'sk-anthropic');
			const all = service.getAllApiKeys();
			expect(Object.keys(all)).toHaveLength(2);
			expect(all.openai).toBe('sk-openai');
			expect(all.anthropic).toBe('sk-anthropic');
		});
	});

	describe('workspace settings', () => {
		it('should set and get current workspace', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/path/to/project');
			expect(service.getCurrentWorkspace()).toBe('/path/to/project');
		});

		it('should add workspace to recent workspaces', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/project1');
			service.setCurrentWorkspace('/project2');
			const recent = service.getRecentWorkspaces();
			expect(recent[0].path).toBe('/project2');
			expect(recent[1].path).toBe('/project1');
		});

		it('should not duplicate recent workspaces', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/project1');
			service.setCurrentWorkspace('/project2');
			service.setCurrentWorkspace('/project1');
			const recent = service.getRecentWorkspaces();
			const paths = recent.map((w) => w.path);
			expect(paths.filter((p) => p === '/project1')).toHaveLength(1);
			expect(paths[0]).toBe('/project1');
		});

		it('should keep only last 10 recent workspaces', () => {
			const service = new StoreService();
			for (let i = 0; i < 15; i++) {
				service.setCurrentWorkspace(`/project${i}`);
			}
			expect(service.getRecentWorkspaces()).toHaveLength(10);
		});

		it('should clear current workspace', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/project');
			service.clearCurrentWorkspace();
			expect(service.getCurrentWorkspace()).toBeNull();
		});

		it('should remove a recent workspace', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/project1');
			service.setCurrentWorkspace('/project2');
			service.removeRecentWorkspace('/project1');
			const paths = service.getRecentWorkspaces().map((w) => w.path);
			expect(paths).not.toContain('/project1');
			expect(paths).toContain('/project2');
		});

		it('should return a copy of recent workspaces', () => {
			const service = new StoreService();
			service.setCurrentWorkspace('/test');
			const recent1 = service.getRecentWorkspaces();
			recent1.push({ path: '/fake', lastOpened: 0 });
			expect(service.getRecentWorkspaces()).toHaveLength(1);
		});
	});
});
