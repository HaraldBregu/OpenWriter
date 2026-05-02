import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import { getProvider } from '../../shared/providers';
import type { AgentModel, AgentSettings, Provider, UserProfile } from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	providers: Provider[];
	agents: AgentSettings[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
	startupCount: number;
	isInitialized: boolean;
	profile: UserProfile | null;
}

const DEFAULTS: StoreSchema = {
	providers: [],
	agents: [],
	currentWorkspace: null,
	recentWorkspaces: [],
	startupCount: 0,
	isInitialized: false,
	profile: null,
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

/**
 * Parse a Provider entry from arbitrary input. Accepts both the new flat shape
 * `{ id, name, apiKey }` and the legacy `{ provider: { id, name }, apiKey }`
 * shape so existing settings files migrate cleanly.
 */
function normalizeProviderInput(value: unknown): Provider | null {
	if (!isRecord(value)) return null;

	let id: string | undefined;
	let name: string | undefined;

	if (typeof value.id === 'string' && value.id.trim().length > 0) {
		id = value.id.trim();
		if (typeof value.name === 'string' && value.name.trim().length > 0) {
			name = value.name.trim();
		}
	} else if (isRecord(value.provider) && typeof value.provider.id === 'string') {
		id = value.provider.id.trim();
		if (typeof value.provider.name === 'string' && value.provider.name.trim().length > 0) {
			name = value.provider.name.trim();
		}
	}

	if (!id) return null;

	const known = getProvider(id);
	const resolvedName = name ?? known?.name ?? id;

	const apiKey =
		typeof value.apiKey === 'string'
			? value.apiKey
			: typeof value.apikey === 'string'
				? value.apikey
				: '';

	return { id, name: resolvedName, apiKey };
}

function normalizeProviders(value: unknown): Provider[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const out: Provider[] = [];
	for (const entry of value) {
		const provider = normalizeProviderInput(entry);
		if (!provider || seen.has(provider.id)) continue;
		seen.add(provider.id);
		out.push(provider);
	}
	return out;
}

function cloneProvider(provider: Provider): Provider {
	return { id: provider.id, name: provider.name, apiKey: provider.apiKey };
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
		? value.models.map(normalizeAgentModel).filter((m): m is AgentModel => m !== null)
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

		this.migrateLegacyProviderSettings();
		this.normalizeStoredProviders();
		this.normalizeStoredAgents();
		this.reconcileStartupState();
		this.incrementStartupCount();
	}

	// --- Provider methods ---

	getProviders(): Provider[] {
		return this.store.get('providers').map(cloneProvider);
	}

	getProviderById(providerId: string): Provider | undefined {
		const normalized = providerId.trim();
		return this.getProviders().find((p) => p.id === normalized);
	}

	/**
	 * Upsert a provider entry by its `id` (one entry per providerId).
	 */
	addProvider(provider: Provider): Provider {
		const incoming = normalizeProviderInput(provider);
		if (!incoming) {
			throw new Error('Invalid provider');
		}
		const providers = this.store.get('providers').map(cloneProvider);
		const index = providers.findIndex((p) => p.id === incoming.id);
		if (index >= 0) {
			providers[index] = incoming;
		} else {
			providers.push(incoming);
		}
		this.store.set('providers', providers);
		return cloneProvider(incoming);
	}

	deleteProvider(providerId: string): void {
		const normalized = providerId.trim();
		const providers = this.store.get('providers').filter((p) => p.id !== normalized);
		this.store.set('providers', providers);
	}

	getProfile(): UserProfile | null {
		const profile = this.store.get('profile');
		if (!profile) return null;
		return { firstName: profile.firstName, lastName: profile.lastName };
	}

	setProfile(profile: UserProfile): UserProfile {
		const next: UserProfile = {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		};
		this.store.set('profile', next);
		return next;
	}

	getStartupInfo(): AppStartupInfo {
		const startupCount = this.store.get('startupCount');
		return {
			startupCount,
			isFirstRun: startupCount === 1,
			isInitialized: this.store.get('isInitialized'),
		};
	}

	completeFirstRunConfiguration(profile: UserProfile, providers: Provider[]): AppStartupInfo {
		const incoming = normalizeProviders(providers).filter((p) => p.apiKey.trim().length > 0);
		const incomingIds = new Set(incoming.map((p) => p.id));
		const preserved = this.store
			.get('providers')
			.filter((p) => !incomingIds.has(p.id))
			.map(cloneProvider);

		this.store.set('providers', [...preserved, ...incoming]);
		this.store.set('profile', {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		});
		this.store.set('isInitialized', true);

		return this.getStartupInfo();
	}

	// --- Agent settings ---

	getAgents(): AgentSettings[] {
		return this.store.get('agents').map(cloneAgent);
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
		return cloneAgent(normalized);
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

	/**
	 * Migrate legacy keys (`modelSettings`, `models`, `services`) into the
	 * current `providers` array, flattening `{ provider: {...}, apiKey }`
	 * entries into the new `{ id, name, apiKey }` shape.
	 */
	private migrateLegacyProviderSettings(): void {
		const legacyKeys = ['modelSettings', 'models', 'services'] as const;
		for (const key of legacyKeys) {
			const raw = this.rawStore.get(key);
			if (raw === undefined) continue;
			const current = this.rawStore.get('providers');
			const isEmpty =
				current === undefined || (Array.isArray(current) && current.length === 0);
			if (isEmpty) {
				const migrated = normalizeProviders(raw);
				if (migrated.length > 0) {
					this.store.set('providers', migrated);
				}
			}
			this.rawStore.delete(key);
		}
	}

	private normalizeStoredProviders(): void {
		const normalized = normalizeProviders(this.rawStore.get('providers'));
		const current = this.store.get('providers');
		const needsRewrite =
			current.length !== normalized.length ||
			current.some((p, i) => JSON.stringify(p) !== JSON.stringify(normalized[i]));
		if (needsRewrite) {
			this.store.set('providers', normalized);
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

		const hasProviders = this.store.get('providers').length > 0;
		const hasWorkspaceHistory =
			this.store.get('currentWorkspace') !== null ||
			this.store.get('recentWorkspaces').length > 0;

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
