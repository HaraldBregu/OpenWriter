import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import { getProvider, isKnownProvider, toServiceConfig } from '../../shared/providers';
import type { AgentModel, AgentSettings, Provider, Service } from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	services: Service[];
	agents: AgentSettings[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
	startupCount: number;
	isInitialized: boolean;
}

const DEFAULTS: StoreSchema = {
	services: [],
	agents: [],
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

function cloneAgent(agent: AgentSettings): AgentSettings {
	return {
		id: agent.id,
		name: agent.name,
		models: agent.models.map((m) => ({ ...m })),
	};
}

function normalizeAgentModel(value: unknown): AgentModel | null {
	if (!isRecord(value)) return null;
	const id = typeof value.id === 'string' ? value.id.trim() : '';
	const providerId = typeof value.providerId === 'string' ? value.providerId.trim() : '';
	const modelId = typeof value.modelId === 'string' ? value.modelId.trim() : '';
	if (!id || !providerId || !modelId) return null;
	return { id, providerId, modelId };
}

function normalizeAgentInput(value: unknown): AgentSettings | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = typeof value.id === 'string' ? value.id.trim() : '';
	const name = typeof value.name === 'string' ? value.name.trim() : '';
	if (!id || !name) {
		return null;
	}

	const models = Array.isArray(value.models)
		? value.models
				.map(normalizeAgentModel)
				.filter((m): m is AgentModel => m !== null)
		: [];

	return { id, name, models };
}

function normalizeAgents(value: unknown): AgentSettings[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(normalizeAgentInput)
		.filter((agent): agent is AgentSettings => agent !== null);
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
		this.normalizeStoredAgents();
		this.reconcileStartupState();
		this.incrementStartupCount();
	}

	// --- Service methods ---

	getServices(): Service[] {
		return this.store.get('services').map(cloneService);
	}

	getServiceByProviderId(providerId: string): Service | undefined {
		const normalized = providerId.trim();
		return this.getServices().find((service) => service.provider.id === normalized);
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

	// --- Agent settings ---

	getAgents(): AgentSettings[] {
		return this.store.get('agents').map((agent) => this.enrichAgent(cloneAgent(agent)));
	}

	getAgentById(agentId: string): AgentSettings | undefined {
		const normalized = agentId.trim();
		return this.getAgents().find((agent) => agent.id === normalized);
	}

	updateAgent(agent: AgentSettings): AgentSettings {
		const normalized = normalizeAgentInput(agent);
		if (!normalized) {
			throw new Error('Invalid agent settings');
		}

		const agents = this.store.get('agents').map(cloneAgent);
		const index = agents.findIndex((entry) => entry.id === normalized.id);

		if (index >= 0) {
			agents[index] = normalized;
		} else {
			agents.push(normalized);
		}

		this.store.set('agents', normalizeAgents(agents));
		return this.enrichAgent(cloneAgent(normalized));
	}

	/**
	 * Fill `apiKey` on each AgentModel from the configured Service for its
	 * providerId. Persisted apiKey is ignored — current Services are the truth.
	 */
	private enrichAgent(agent: AgentSettings): AgentSettings {
		return {
			...agent,
			models: agent.models.map((m) => ({
				...m,
				apiKey: this.getServiceByProviderId(m.providerId)?.apiKey ?? '',
			})),
		};
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

	private normalizeStoredAgents(): void {
		const normalized = normalizeAgents(this.rawStore.get('agents'));
		const current = this.store.get('agents');
		const needsRewrite =
			current.length !== normalized.length ||
			current.some((agent, index) => JSON.stringify(agent) !== JSON.stringify(normalized[index]));

		if (needsRewrite) {
			this.store.set('agents', normalized);
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
