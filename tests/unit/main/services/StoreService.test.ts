/**
 * Tests for StoreService.
 * Validates electron-store-based settings persistence for model settings and workspaces.
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
			expect(service.getAllModelSettings()).toEqual({});
		});
	});

	describe('model settings', () => {
		it('should return null for unknown provider', () => {
			const service = new StoreService();
			expect(service.getModelSettings('unknown')).toBeNull();
		});

		it('should set and get selected model', () => {
			const service = new StoreService();
			service.setSelectedModel('openai', 'gpt-4o');
			const settings = service.getModelSettings('openai');
			expect(settings).not.toBeNull();
			expect(settings?.selectedModel).toBe('gpt-4o');
			expect(settings?.apiToken).toBe('');
		});

		it('should preserve existing apiToken when setting model', () => {
			const service = new StoreService();
			service.setApiToken('openai', 'my-token');
			service.setSelectedModel('openai', 'gpt-4o-mini');
			const settings = service.getModelSettings('openai');
			expect(settings?.apiToken).toBe('my-token');
			expect(settings?.selectedModel).toBe('gpt-4o-mini');
		});

		it('should set API token', () => {
			const service = new StoreService();
			service.setApiToken('anthropic', 'sk-123');
			const settings = service.getModelSettings('anthropic');
			expect(settings?.apiToken).toBe('sk-123');
		});

		it('should set full model settings', () => {
			const service = new StoreService();
			service.setModelSettings('custom', {
				selectedModel: 'llama',
				apiToken: 'key',
				temperature: 0.7,
				maxTokens: 2048,
				reasoning: false,
			});
			expect(service.getModelSettings('custom')).toEqual({
				selectedModel: 'llama',
				apiToken: 'key',
				temperature: 0.7,
				maxTokens: 2048,
				reasoning: false,
			});
		});

		it('should return all model settings', () => {
			const service = new StoreService();
			service.setSelectedModel('a', 'model-a');
			service.setSelectedModel('b', 'model-b');
			const all = service.getAllModelSettings();
			expect(Object.keys(all)).toHaveLength(2);
		});

		it('should set inference defaults', () => {
			const service = new StoreService();
			service.setApiToken('openai', 'tok');
			service.setInferenceDefaults('openai', { temperature: 0.5, reasoning: true });
			const settings = service.getModelSettings('openai');
			expect(settings?.temperature).toBe(0.5);
			expect(settings?.reasoning).toBe(true);
			expect(settings?.apiToken).toBe('tok');
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
