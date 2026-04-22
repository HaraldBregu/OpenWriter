export interface AssistantAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
}

export interface AssistantAgentOutput {
	content: string;
	stoppedReason: 'done';
}
