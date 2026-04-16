import type { AgentHistoryMessage } from '../core/types';

export type AssistantRouteDecision = 'direct' | 'rag';
export type AssistantRetrievalStatus = 'idle' | 'found' | 'empty' | 'unavailable';

export interface AssistantGraphState {
	prompt: string;
	history: AgentHistoryMessage[];
	normalizedPrompt: string;
	routingFindings: string;
	routeDecision: AssistantRouteDecision;
	retrievalQuery: string;
	retrievedContext: string;
	retrievalStatus: AssistantRetrievalStatus;
	documentsRelevant: boolean;
	gradeFindings: string;
	retryCount: number;
	maxRetries: number;
	phaseLabel: string;
	response: string;
}

export type AssistantGraphUpdate = Partial<AssistantGraphState>;

export function createDefaultAssistantState(): AssistantGraphState {
	return {
		prompt: '',
		history: [],
		normalizedPrompt: '',
		routingFindings: '',
		routeDecision: 'direct',
		retrievalQuery: '',
		retrievedContext: '',
		retrievalStatus: 'idle',
		documentsRelevant: false,
		gradeFindings: '',
		retryCount: 0,
		maxRetries: 2,
		phaseLabel: '',
		response: '',
	};
}
