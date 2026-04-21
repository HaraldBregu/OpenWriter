export interface AssistantFile {
	name: string;
	mimeType?: string;
	path?: string;
	dataUrl?: string;
}

export interface AssistantAgentInput {
	prompt: string;
	files?: AssistantFile[];
	providerId: string;
	apiKey: string;
	modelName: string;
	documentId: string;
	documentPath: string;
	imageProviderId?: string;
	imageApiKey?: string;
	imageModelName?: string;
	temperature?: number;
	maxTokens?: number;
	maxIterations?: number;
}

export interface AssistantToolCallRecord {
	name: string;
	argumentsRaw: string;
	output: string;
	error?: string;
}

export interface AssistantAgentOutput {
	content: string;
	toolCalls: AssistantToolCallRecord[];
	iterations: number;
}
