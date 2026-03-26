import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import type { ModelConfig } from '../../shared/model-defaults';
import { DEFAULT_MODELS } from '../../shared/model-defaults';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	models: ModelConfig[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
}

const DEFAULTS: StoreSchema = {
	models: [...DEFAULT_MODELS],
	currentWorkspace: null,
	recentWorkspaces: [],
};

export class StoreService {
	private store: Store<StoreSchema>;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		});
	}

	// --- Model methods ---

	getModels(): ModelConfig[] {
		return [...this.store.get('models')];
	}

	addModel(model: Omit<ModelConfig, 'id'>): ModelConfig {
		const models = this.store.get('models');
		const newModel: ModelConfig = {
			...model,
			id: `model-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		};
		// If the new model is marked as default, clear existing defaults
		if (newModel.default) {
			for (const m of models) {
				m.default = false;
			}
		}
		models.push(newModel);
		this.store.set('models', models);
		return { ...newModel };
	}

	deleteModel(id: string): void {
		const models = this.store.get('models').filter((m) => m.id !== id);
		this.store.set('models', models);
	}

	setDefaultModel(id: string): void {
		const models = this.store.get('models').map((m) => ({ ...m, default: m.id === id }));
		this.store.set('models', models);
	}

	// --- Workspace settings ---

	getCurrentWorkspace(): string | null {
		return this.store.get('currentWorkspace');
	}

	setCurrentWorkspace(workspacePath: string): void {
		this.store.set('currentWorkspace', workspacePath);
		this.addRecentWorkspace(workspacePath);
	}

	getRecentWorkspaces(): WorkspaceInfo[] {
		return [...this.store.get('recentWorkspaces')];
	}

	private addRecentWorkspace(workspacePath: string): void {
		const recent = this.store.get('recentWorkspaces').filter((w) => w.path !== workspacePath);

		recent.unshift({
			path: workspacePath,
			lastOpened: Date.now(),
		});

		this.store.set('recentWorkspaces', recent.slice(0, MAX_RECENT_WORKSPACES));
	}

	clearCurrentWorkspace(): void {
		this.store.set('currentWorkspace', null);
	}

	removeRecentWorkspace(workspacePath: string): void {
		const filtered = this.store.get('recentWorkspaces').filter((w) => w.path !== workspacePath);
		this.store.set('recentWorkspaces', filtered);
	}
}
