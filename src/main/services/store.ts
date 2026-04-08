import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import { PROVIDER_IDS, toProviderConfig } from '../../shared/providers';
import type { ProviderId, ServiceProvider } from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	providers: ServiceProvider[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
	startupCount: number;
	isInitialized: boolean;
}

const DEFAULTS: StoreSchema = {
	providers: [],
	currentWorkspace: null,
	recentWorkspaces: [],
	startupCount: 0,
	isInitialized: false,
};

type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
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

function isDefaultProviderName(name: string): name is ProviderId {
	return (PROVIDER_IDS as readonly string[]).includes(name);
}

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;

		this.migrateLegacyProviderSettings();
		this.normalizeStoredProviders();
		this.reconcileStartupState();
		this.incrementStartupCount();
	}

	// --- Provider methods ---

	getProviders(): Array<ServiceProvider & { id: string }> {
		return this.store.get('providers').map((provider, index) => toProviderConfig(provider, index));
	}

	getProviderByName(name: string): (ServiceProvider & { id: string }) | undefined {
		const normalizedName = name.trim();
		return this.getProviders().find((provider) => provider.name === normalizedName);
	}

	getFirstProvider(): (ServiceProvider & { id: string }) | undefined {
		return this.getProviders()[0];
	}

	addProvider(provider: ServiceProvider): ServiceProvider & { id: string } {
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

	deleteProvider(id: string): void {
		const providers = this.store
			.get('providers')
			.filter((provider, index) => toProviderConfig(provider, index).id !== id);
		this.store.set('providers', providers);
	}

	getStartupInfo(): AppStartupInfo {
		const startupCount = this.store.get('startupCount');
		return {
			startupCount,
			isFirstRun: startupCount === 1,
			isInitialized: this.store.get('isInitialized'),
		};
	}

	completeFirstRunConfiguration(providers: ServiceProvider[]): AppStartupInfo {
		const preservedCustomProviders = this.store
			.get('providers')
			.filter((provider) => !isDefaultProviderName(provider.name))
			.map(cloneProvider);
		const configuredDefaultProviders = normalizeProviders(providers)
			.map((provider) => ({
				name: provider.name.trim(),
				apikey: provider.apikey.trim(),
				baseurl: provider.baseurl.trim(),
			}))
			.filter((provider) => provider.apikey.length > 0);

		this.store.set('providers', [...preservedCustomProviders, ...configuredDefaultProviders]);
		this.store.set('isInitialized', true);

		return this.getStartupInfo();
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

	private get rawStore(): SettingsStore {
		return this.store;
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

	private reconcileStartupState(): void {
		if (this.store.get('startupCount') > 0 || this.store.get('isInitialized')) {
			return;
		}

		const hasProviders = this.store.get('providers').length > 0;
		const hasWorkspaceHistory =
			this.store.get('currentWorkspace') !== null || this.store.get('recentWorkspaces').length > 0;

		if (!hasProviders && !hasWorkspaceHistory) {
			return;
		}

		this.store.set('startupCount', 1);
		this.store.set('isInitialized', true);
	}

	private incrementStartupCount(): void {
		const startupCount = this.store.get('startupCount');
		this.store.set('startupCount', startupCount + 1);
	}
}
