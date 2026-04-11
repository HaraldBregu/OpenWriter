import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import { getProvider, isKnownProvider, toServiceConfig } from '../../shared/providers';
import type { Provider, Service } from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	services: Service[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
	startupCount: number;
	isInitialized: boolean;
}

const DEFAULTS: StoreSchema = {
	services: [],
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

function resolveProvider(value: unknown): Provider | null {
	if (isRecord(value) && typeof value.id === 'string') {
		const known = getProvider(value.id);
		if (known) return known;
		if (typeof value.name === 'string' && value.name.trim().length > 0) {
			return { id: value.id, name: value.name };
		}
	}
	if (typeof value === 'string') {
		return getProvider(value.trim().toLowerCase()) ?? null;
	}
	return null;
}

function normalizeServiceInput(value: unknown): Service | null {
	if (!isRecord(value)) {
		return null;
	}

	const provider = resolveProvider(value.provider) ?? resolveProvider(value.name);
	if (!provider) {
		return null;
	}

	const apiKey =
		typeof value.apiKey === 'string'
			? value.apiKey
			: typeof value.apikey === 'string'
				? value.apikey
				: '';

	return { provider, apiKey };
}

function normalizeServices(value: unknown): Service[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized: Service[] = [];

	value.forEach((entry) => {
		const service = normalizeServiceInput(entry);
		if (!service) {
			return;
		}
		normalized.push(service);
	});

	return normalized;
}

function cloneService(service: Service): Service {
	return { provider: { ...service.provider }, apiKey: service.apiKey };
}

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;

		this.migrateLegacyServiceSettings();
		this.normalizeStoredServices();
		this.reconcileStartupState();
		this.incrementStartupCount();
	}

	// --- Service methods ---

	getServices(): Array<Service & { id: string }> {
		return this.store.get('services').map((service, index) => toServiceConfig(service, index));
	}

	getServiceByProviderId(providerId: string): (Service & { id: string }) | undefined {
		const normalized = providerId.trim();
		return this.getServices().find((service) => service.provider.id === normalized);
	}

	getFirstService(): (Service & { id: string }) | undefined {
		return this.getServices()[0];
	}

	addService(service: Service): Service & { id: string } {
		const services = this.store.get('services').map(cloneService);
		const newService: Service = {
			provider: service.provider,
			apiKey: service.apiKey,
		};
		services.push(newService);
		this.store.set('services', services);
		return toServiceConfig(newService, services.length - 1);
	}

	deleteService(id: string): void {
		const services = this.store
			.get('services')
			.filter((service, index) => toServiceConfig(service, index).id !== id);
		this.store.set('services', services);
	}

	getStartupInfo(): AppStartupInfo {
		const startupCount = this.store.get('startupCount');
		return {
			startupCount,
			isFirstRun: startupCount === 1,
			isInitialized: this.store.get('isInitialized'),
		};
	}

	completeFirstRunConfiguration(services: Service[]): AppStartupInfo {
		const preservedCustomServices = this.store
			.get('services')
			.filter((service) => !isKnownProvider(service.provider.id))
			.map(cloneService);
		const configuredDefaultServices = normalizeServices(services)
			.map((service) => ({
				provider: service.provider,
				apiKey: service.apiKey.trim(),
			}))
			.filter((service) => service.apiKey.length > 0);

		this.store.set('services', [...preservedCustomServices, ...configuredDefaultServices]);
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

	private migrateLegacyServiceSettings(): void {
		const legacyModels = this.rawStore.get('modelSettings');
		if (legacyModels !== undefined) {
			const migrated = normalizeServices(legacyModels);
			if (migrated.length > 0) {
				this.store.set('services', migrated);
			}
			this.rawStore.delete('modelSettings');
		}

		const legacyModelsKey = this.rawStore.get('models');
		if (legacyModelsKey !== undefined && this.rawStore.get('services') === undefined) {
			const migrated = normalizeServices(legacyModelsKey);
			if (migrated.length > 0) {
				this.store.set('services', migrated);
			}
		}
		this.rawStore.delete('models');

		const legacyProviders = this.rawStore.get('providers');
		if (legacyProviders !== undefined) {
			const current = this.rawStore.get('services');
			if (current === undefined || (Array.isArray(current) && current.length === 0)) {
				const migrated = normalizeServices(legacyProviders);
				if (migrated.length > 0) {
					this.store.set('services', migrated);
				}
			}
			this.rawStore.delete('providers');
		}
	}

	private normalizeStoredServices(): void {
		const normalized = normalizeServices(this.rawStore.get('services'));
		const current = this.store.get('services');
		const needsRewrite =
			current.length !== normalized.length ||
			current.some(
				(service, index) => JSON.stringify(service) !== JSON.stringify(normalized[index])
			);

		if (needsRewrite) {
			this.store.set('services', normalized);
		}
	}

	private reconcileStartupState(): void {
		if (this.store.get('startupCount') > 0 || this.store.get('isInitialized')) {
			return;
		}

		const hasServices = this.store.get('services').length > 0;
		const hasWorkspaceHistory =
			this.store.get('currentWorkspace') !== null || this.store.get('recentWorkspaces').length > 0;

		if (!hasServices && !hasWorkspaceHistory) {
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
