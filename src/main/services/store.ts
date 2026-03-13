import Store from 'electron-store';
import {
	ProviderSettings,
	DEFAULT_PROVIDER_INFERENCE,
	InferenceDefaultsUpdate,
} from '../../shared/aiSettings';
import { MAX_RECENT_WORKSPACES } from '../constants';

// Re-export for backward compatibility with files that import ModelSettings from here
export type { ProviderSettings as ModelSettings };
export type { ProviderSettings };

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	modelSettings: Record<string, ProviderSettings>;
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
}

const DEFAULTS: StoreSchema = {
	modelSettings: {},
	currentWorkspace: null,
	recentWorkspaces: [],
};

/**
 * Fills in missing inference fields on an old settings record read from disk.
 * Old records may only have { selectedModel, apiToken }; this adds temperature,
 * maxTokens, and reasoning from DEFAULT_PROVIDER_INFERENCE when absent.
 */
function migrateProviderSettingsRecord(
	record: Partial<ProviderSettings> & { selectedModel?: string; apiToken?: string }
): ProviderSettings {
	return {
		selectedModel: record.selectedModel ?? '',
		apiToken: record.apiToken ?? '',
		temperature: record.temperature ?? DEFAULT_PROVIDER_INFERENCE.temperature,
		maxTokens:
			record.maxTokens !== undefined ? record.maxTokens : DEFAULT_PROVIDER_INFERENCE.maxTokens,
		reasoning: record.reasoning ?? DEFAULT_PROVIDER_INFERENCE.reasoning,
	};
}

export class StoreService {
	private store: Store<StoreSchema>;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
			migrations: {
				'1.0.0': (store) => {
					const raw = (store.get('modelSettings') ?? {}) as Record<string, unknown>;
					const migrated: Record<string, ProviderSettings> = {};
					for (const [id, record] of Object.entries(raw)) {
						migrated[id] = migrateProviderSettingsRecord(
							record as Partial<ProviderSettings>
						);
					}
					store.set('modelSettings', migrated);
				},
			},
		});
	}

	// --- Provider settings methods ---

	getProviderSettings(providerId: string): ProviderSettings | null {
		const all = this.store.get('modelSettings');
		return all[providerId] ?? null;
	}

	getAllProviderSettings(): Record<string, ProviderSettings> {
		return { ...this.store.get('modelSettings') };
	}

	setProviderSettings(providerId: string, settings: ProviderSettings): void {
		const all = this.store.get('modelSettings');
		all[providerId] = { ...settings };
		this.store.set('modelSettings', all);
	}

	setInferenceDefaults(providerId: string, update: InferenceDefaultsUpdate): void {
		const all = this.store.get('modelSettings');
		const existing = all[providerId] ?? migrateProviderSettingsRecord({});
		all[providerId] = {
			...existing,
			...(update.temperature !== undefined && { temperature: update.temperature }),
			...(update.maxTokens !== undefined && { maxTokens: update.maxTokens }),
			...(update.reasoning !== undefined && { reasoning: update.reasoning }),
		};
		this.store.set('modelSettings', all);
	}

	// --- Legacy methods (delegate to new methods for backward compatibility) ---

	getModelSettings(providerId: string): ProviderSettings | null {
		return this.getProviderSettings(providerId);
	}

	getAllModelSettings(): Record<string, ProviderSettings> {
		return this.getAllProviderSettings();
	}

	setSelectedModel(providerId: string, modelId: string): void {
		const all = this.store.get('modelSettings');
		const existing = all[providerId] ?? migrateProviderSettingsRecord({});
		all[providerId] = { ...existing, selectedModel: modelId };
		this.store.set('modelSettings', all);
	}

	setApiToken(providerId: string, token: string): void {
		const all = this.store.get('modelSettings');
		const existing = all[providerId] ?? migrateProviderSettingsRecord({});
		all[providerId] = { ...existing, apiToken: token };
		this.store.set('modelSettings', all);
	}

	setModelSettings(providerId: string, settings: ProviderSettings): void {
		this.setProviderSettings(providerId, settings);
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
		const recent = this.store
			.get('recentWorkspaces')
			.filter((w) => w.path !== workspacePath);

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
		const filtered = this.store
			.get('recentWorkspaces')
			.filter((w) => w.path !== workspacePath);
		this.store.set('recentWorkspaces', filtered);
	}
}
