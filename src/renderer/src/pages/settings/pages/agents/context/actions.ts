import type { AgentSettings, ProviderModelInfo } from '../../../../../../../shared/types';
import type { LoadStatus } from './state';

export type AgentsAction =
	| { type: 'SET_AGENTS'; payload: Record<string, AgentSettings> }
	| { type: 'PATCH_AGENT'; payload: AgentSettings }
	| { type: 'SET_LOAD_STATUS'; payload: LoadStatus }
	| { type: 'SET_SAVING'; agentId: string; payload: boolean }
	| { type: 'SET_SAVED'; agentId: string; payload: boolean }
	| { type: 'SET_MODELS'; providerId: string; payload: ProviderModelInfo[] }
	| { type: 'SET_LOADING_PROVIDER'; providerId: string; payload: boolean }
	| { type: 'SET_PROVIDER_ERROR'; providerId: string; payload: string | null };
