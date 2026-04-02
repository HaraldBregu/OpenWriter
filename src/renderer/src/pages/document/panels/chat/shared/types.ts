export type DocumentChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled';

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
	readonly role: DocumentChatMessageRole;
	readonly timestamp: string;
	readonly taskId: string | null;
	readonly status: ChatMessageStatus;
}

export interface ChatSessionListItem {
	readonly id: string;
	readonly title: string;
	readonly ageLabel: string;
	readonly createdAt: string;
}

export interface AssistantTaskData {
	readonly prompt: string;
}
