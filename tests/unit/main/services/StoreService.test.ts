/**
 * Tests for StoreService.
 * Validates electron-store-based model management and workspace persistence.
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
import type { ModelConfig } from '../../../../src/shared/model-defaults';

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
			// Default models are seeded from DEFAULT_MODELS
			expect(Array.isArray(service.getModels())).toBe(true);
		});
	});

	describe('model management', () => {
		it('should return an array of models', () => {
			const service = new StoreService();
			const models = service.getModels();
			expect(Array.isArray(models)).toBe(true);
		});

		it('should add a new model and return it with a generated id', () => {
			const service = new StoreService();
			const input: Omit<ModelConfig, 'id'> = {
				provider: 'openai',
				model: 'gpt-4o',
				apikey: 'sk-test',
				baseurl: '',
				default: false,
			};
			const added = service.addModel(input);
			expect(added.id).toMatch(/^model-\d+-[a-z0-9]+$/);
			expect(added.provider).toBe('openai');
			expect(added.model).toBe('gpt-4o');
			expect(service.getModels().some((m) => m.id === added.id)).toBe(true);
		});

		it('should clear existing defaults when adding a model marked as default', () => {
			const service = new StoreService();
			// Add a first default model
			const first = service.addModel({
				provider: 'openai',
				model: 'gpt-4o',
				apikey: '',
				baseurl: '',
				default: true,
			});
			// Add a second default model
			service.addModel({
				provider: 'anthropic',
				model: 'claude-opus-4-6',
				apikey: '',
				baseurl: '',
				default: true,
			});
			const models = service.getModels();
			const defaultModels = models.filter((m) => m.default);
			// Only one should be default — the newly added one
			expect(defaultModels).toHaveLength(1);
			expect(defaultModels[0].provider).toBe('anthropic');
			// The first model should no longer be default
			const firstInStore = models.find((m) => m.id === first.id);
			expect(firstInStore?.default).toBe(false);
		});

		it('should delete a model by id', () => {
			const service = new StoreService();
			const added = service.addModel({
				provider: 'openai',
				model: 'gpt-4o-mini',
				apikey: '',
				baseurl: '',
				default: false,
			});
			service.deleteModel(added.id);
			expect(service.getModels().some((m) => m.id === added.id)).toBe(false);
		});

		it('should not throw when deleting a non-existent model id', () => {
			const service = new StoreService();
			expect(() => service.deleteModel('nonexistent-id')).not.toThrow();
		});

		it('should set a model as default and clear others', () => {
			const service = new StoreService();
			const a = service.addModel({
				provider: 'openai',
				model: 'gpt-4o',
				apikey: '',
				baseurl: '',
				default: false,
			});
			const b = service.addModel({
				provider: 'openai',
				model: 'gpt-4o-mini',
				apikey: '',
				baseurl: '',
				default: false,
			});
			service.setDefaultModel(a.id);
			const models = service.getModels();
			const modelA = models.find((m) => m.id === a.id);
			const modelB = models.find((m) => m.id === b.id);
			expect(modelA?.default).toBe(true);
			expect(modelB?.default).toBe(false);
		});

		it('should return a copy from getModels (mutation does not affect store)', () => {
			const service = new StoreService();
			service.addModel({
				provider: 'openai',
				model: 'gpt-4o',
				apikey: '',
				baseurl: '',
				default: false,
			});
			const models = service.getModels();
			const originalLength = models.length;
			// Mutate the returned array
			models.push({
				id: 'fake',
				provider: 'x',
				model: 'y',
				apikey: '',
				baseurl: '',
				default: false,
			});
			// Store should not be affected
			expect(service.getModels()).toHaveLength(originalLength);
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
