import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';
import type {
	AgentSettings,
	Channel,
	ChannelType,
	DiscordChannelProperties,
	Provider,
	TelegramChannelProperties,
	UserProfile,
	WhatsappChannelProperties,
} from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';
import { DEFAULTS, type SettingsStore, type StoreSchema, type WorkspaceInfo } from './types';
import {
	cloneAgent,
	cloneProvider,
	normalizeAgentInput,
	normalizeAgents,
	normalizeProviderInput,
	normalizeProviders,
} from './utils';

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

	// --- Channel methods ---

	getChannel(): Channel | null {
		const channel = this.store.get('channel');
		if (!channel) return null;
		const telegram = channel.telegram ?? { token: '', allowFrom: [] };
		const whatsapp = channel.whatsapp ?? { phoneNumber: '' };
		const discord = channel.discord ?? { token: '', allowFrom: [] };
		return {
			telegram: { ...telegram, allowFrom: [...telegram.allowFrom] },
			whatsapp: { phoneNumber: whatsapp.phoneNumber ?? '' },
			discord: { ...discord, allowFrom: [...discord.allowFrom] },
		};
	}

	setChannelProperties(
		type: ChannelType,
		properties:
			| TelegramChannelProperties
			| WhatsappChannelProperties
			| DiscordChannelProperties
	): Channel {
		const current = this.store.get('channel');
		const baseTelegram = current?.telegram ?? { token: '', allowFrom: [] };
		const baseWhatsapp = current?.whatsapp ?? { phoneNumber: '' };
		const baseDiscord = current?.discord ?? { token: '', allowFrom: [] };
		const base: Channel = {
			telegram: { ...baseTelegram, allowFrom: [...baseTelegram.allowFrom] },
			whatsapp: { phoneNumber: baseWhatsapp.phoneNumber ?? '' },
			discord: { ...baseDiscord, allowFrom: [...baseDiscord.allowFrom] },
		};
		let next: Channel;
		if (type === 'whatsapp') {
			const props = properties as WhatsappChannelProperties;
			next = { ...base, whatsapp: { phoneNumber: props.phoneNumber } };
		} else {
			const props = properties as TelegramChannelProperties | DiscordChannelProperties;
			next = {
				...base,
				[type]: { token: props.token, allowFrom: [...props.allowFrom] },
			};
		}
		this.store.set('channel', next);
		return next;
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
