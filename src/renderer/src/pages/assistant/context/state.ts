export interface AssistantMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly content: string;
}

export interface AssistantState {
	readonly messages: readonly AssistantMessage[];
	readonly input: string;
	readonly isRunning: boolean;
}

export const INITIAL_ASSISTANT_STATE: AssistantState = {
	messages: [],
	input: '',
	isRunning: false,
};
