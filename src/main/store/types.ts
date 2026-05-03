import type { AgentSettings, Channel, Provider, UserProfile } from '../../shared/types';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	providers: Provider[];
	agents: AgentSettings[];
	channels: Channel[];
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
	startupCount: number;
	isInitialized: boolean;
	profile: UserProfile | null;
}

export const DEFAULTS: StoreSchema = {
	providers: [],
	agents: [],
	channels: [],
	currentWorkspace: null,
	recentWorkspaces: [],
	startupCount: 0,
	isInitialized: false,
	profile: null,
};

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
