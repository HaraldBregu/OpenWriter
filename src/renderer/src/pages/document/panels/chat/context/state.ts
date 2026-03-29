export interface ChatMessagesFile {
	readonly version: 1;
	readonly messages: DocumentChatMessage[];
}

export interface ChatSession {
	readonly sessionId: string | null;
	readonly messages: DocumentChatMessage[];
	readonly activeTaskId: string | null;
	readonly activeMessageId: string | null;
}

export interface ChatSessionFile {
	readonly version: 2;
	readonly sessionId: string;
	readonly createdAt: string;
	readonly messages: DocumentChatMessage[];
}

export interface DocumentChatMessage {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant' | 'system';
	readonly timestamp: string;
	readonly taskId: string | null;
	readonly status: 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
}

export interface ChatSessionListItem {
	readonly id: string;
	readonly title: string;
	readonly ageLabel: string;
	readonly createdAt: string;
}

export const INITIAL_CHAT_STATE: ChatSession = {
	sessionId: null,
	messages: [],
	activeTaskId: null,
	activeMessageId: null,
};
