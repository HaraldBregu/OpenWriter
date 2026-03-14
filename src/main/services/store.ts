import Store from 'electron-store';
import { MAX_RECENT_WORKSPACES } from '../constants';

export interface WorkspaceInfo {
	path: string;
	lastOpened: number;
}

export interface StoreSchema {
	modelSettings: Record<string, string>;
	agentSettings: Record<string, AgentConfig>;
	currentWorkspace: string | null;
	recentWorkspaces: WorkspaceInfo[];
}

const DEFAULTS: StoreSchema = {
	modelSettings: {},
	agentSettings: {},
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

	// --- Agent config methods ---

	getAgentSettings(): Record<string, AgentConfig> {
		return { ...this.store.get('agentSettings') };
	}

	getAgentConfig(agentId: string): AgentConfig | null {
		const all = this.store.get('agentSettings');
		return all[agentId] ?? null;
	}

	setAgentConfig(agentId: string, config: AgentConfig): void {
		const all = this.store.get('agentSettings');
		all[agentId] = config;
		this.store.set('agentSettings', all);
	}

	// --- API key methods ---

	getApiKey(providerId: string): string | null {
		const all = this.store.get('modelSettings');
		return all[providerId] ?? null;
	}

	getAllApiKeys(): Record<string, string> {
		return { ...this.store.get('modelSettings') };
	}

	setApiKey(providerId: string, apiKey: string): void {
		const all = this.store.get('modelSettings');
		all[providerId] = apiKey;
		this.store.set('modelSettings', all);
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
