import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import {
	toProviderConfig,
	type ServiceProvider,
	type ProviderConfig,
} from '../../shared/model-defaults';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	providers: ServiceProvider[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
}

const DEFAULTS: StoreSchema = {
	providers: [],
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

function normalizeProviderInput(value: unknown): ServiceProvider | null {
	if (!isRecord(value)) {
		return null;
	}

	const name =
		typeof value.name === 'string'
			? value.name.trim()
			: typeof value.provider === 'string'
				? value.provider.trim()
				: '';
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
	if (name.length === 0) {
		return null;
	}

	return { name, apikey, baseurl };
}

function normalizeProviders(value: unknown): ServiceProvider[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized: ServiceProvider[] = [];

	value.forEach((entry) => {
		const provider = normalizeProviderInput(entry);
		if (!provider) {
			return;
		}
		normalized.push(provider);
	});

	return normalized;
}

function cloneProvider(provider: ServiceProvider): ServiceProvider {
	return { ...provider };
}

export class StoreService {
	private store: Store<StoreSchema>;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		});

		this.migrateLegacyProviderSettings();
		this.normalizeStoredProviders();
	}

	// --- Model methods ---

	getModels(): ProviderConfig[] {
		return this.store.get('providers').map((provider, index) => toProviderConfig(provider, index));
	}

	addModel(provider: ServiceProvider): ProviderConfig {
		const providers = this.store.get('providers').map(cloneProvider);
		const newProvider: ServiceProvider = {
			name: provider.name.trim(),
			apikey: provider.apikey,
			baseurl: provider.baseurl,
		};
		providers.push(newProvider);
		this.store.set('providers', providers);
		return toProviderConfig(newProvider, providers.length - 1);
	}

	deleteModel(id: string): void {
		const providers = this.store
			.get('providers')
			.filter((provider, index) => toProviderConfig(provider, index).id !== id);
		this.store.set('providers', providers);
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

	private migrateLegacyProviderSettings(): void {
		const legacyModels = this.rawStore.get('modelSettings');
		if (legacyModels !== undefined) {
			const migratedFromModelSettings = normalizeProviders(legacyModels);
			if (migratedFromModelSettings.length > 0) {
				this.store.set('providers', migratedFromModelSettings);
			}
			this.rawStore.delete('modelSettings');
		}

		const legacyModelsKey = this.rawStore.get('models');
		if (legacyModelsKey !== undefined && this.rawStore.get('providers') === undefined) {
			const migratedFromModelsKey = normalizeProviders(legacyModelsKey);
			if (migratedFromModelsKey.length > 0) {
				this.store.set('providers', migratedFromModelsKey);
			}
		}
		this.rawStore.delete('models');
	}

	private normalizeStoredProviders(): void {
		const normalized = normalizeProviders(this.rawStore.get('providers'));
		const current = this.store.get('providers');
		const needsRewrite =
			current.length !== normalized.length ||
			current.some(
				(provider, index) => JSON.stringify(provider) !== JSON.stringify(normalized[index])
			);

		if (needsRewrite) {
			this.store.set('providers', normalized);
		}
	}
}
