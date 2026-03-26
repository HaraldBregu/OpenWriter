import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import {
	createModelId,
	toModelConfig,
	type CreateModelInput,
	type ModelConfig,
} from '../../shared/model-defaults';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	models: CreateModelInput[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
}

const DEFAULTS: StoreSchema = {
	models: DEFAULT_MODELS.map((model) => ({ ...model })),
	currentWorkspace: null,
	recentWorkspaces: [],
};

type RawStore = {
	get: (key: string) => unknown;
	set: (key: string, value: unknown) => void;
	delete: (key: string) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeModelInput(value: unknown): CreateModelInput | null {
	if (!isRecord(value)) {
		return null;
	}

	const provider = typeof value.provider === 'string' ? value.provider.trim() : '';
	const apikey =
		typeof value.apikey === 'string'
			? value.apikey
			: typeof value.apiKey === 'string'
				? value.apiKey
				: '';
	const baseurl =
		typeof value.baseurl === 'string'
			? value.baseurl.trim()
			: typeof value.baseUrl === 'string'
				? value.baseUrl.trim()
				: '';
	if (provider.length === 0) {
		return null;
	}

	return { provider, apikey, baseurl };
}

function normalizeModels(value: unknown): CreateModelInput[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized: CreateModelInput[] = [];

	value.forEach((entry) => {
		const model = normalizeModelInput(entry);
		if (!model) {
			return;
		}
		normalized.push(model);
	});

	return normalized;
}

function cloneModel(model: CreateModelInput): CreateModelInput {
	return { ...model };
}

export class StoreService {
	private store: Store<StoreSchema>;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		});

		this.migrateLegacyModelSettings();
		this.normalizeStoredModels();
	}

	// --- Model methods ---

	getModels(): ModelConfig[] {
		return this.store.get('models').map((model, index) => toModelConfig(model, index));
	}

	addModel(model: CreateModelInput): ModelConfig {
		const models = this.store.get('models').map(cloneModel);
		const newModel: CreateModelInput = {
			provider: model.provider,
			apikey: model.apikey,
			baseurl: model.baseurl,
		};
		models.push(newModel);
		this.store.set('models', models);
		return toModelConfig(newModel, models.length - 1);
	}

	deleteModel(id: string): void {
		const models = this.store
			.get('models')
			.filter((model, index) => createModelId(model, index) !== id);
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

	private get rawStore(): RawStore {
		return this.store as unknown as RawStore;
	}

	private migrateLegacyModelSettings(): void {
		const legacyModels = this.rawStore.get('modelSettings');
		if (legacyModels === undefined) {
			return;
		}

		const migrated = normalizeModels(legacyModels);
		if (migrated.length > 0) {
			this.store.set('models', migrated);
		}

		this.rawStore.delete('modelSettings');
	}

	private normalizeStoredModels(): void {
		const normalized = normalizeModels(this.rawStore.get('models'));
		if (normalized.length === 0) {
			this.store.set('models', DEFAULTS.models.map(cloneModel));
			return;
		}

		const current = this.store.get('models');
		const needsRewrite =
			current.length !== normalized.length ||
			current.some((model, index) => JSON.stringify(model) !== JSON.stringify(normalized[index]));

		if (needsRewrite) {
			this.store.set('models', normalized);
		}
	}
}
