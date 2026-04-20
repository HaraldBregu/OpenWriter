import type { ChatMessage } from '../../shared/ai-types';

export interface TextAgentInput {
	messages: ChatMessage[];
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	streaming?: boolean;
}

export interface TextAgentOutput {
	content: string;
	tokensStreamed: number;
}
