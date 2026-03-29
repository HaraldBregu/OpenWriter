import type { OutputFileMetadata, DocumentImageInfo } from '../../../../../shared/types';

export interface ChatMessagesFile {
	readonly version: 1;
	readonly messages: DocumentChatMessage[];
}

export interface ChatSessionFile {
	readonly version: 2;
	readonly sessionId: string;
	readonly createdAt: string; // ISO-8601
	readonly messages: DocumentChatMessage[];
}

export interface DocumentChatMessage {
	readonly id: string;
	readonly content: string;
	readonly stateMessage?: string;
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

export interface DocumentState {
	readonly documentId: string | undefined;
	readonly title: string;
	readonly content: string;
	readonly metadata: OutputFileMetadata | null;
	readonly images: DocumentImageInfo[];
	readonly loaded: boolean;
	readonly isTrashing: boolean;
	readonly sidebarOpen: boolean;
	readonly agenticSidebarOpen: boolean;
	readonly chatSessions: ChatSessionListItem[];
}

export const INITIAL_DOCUMENT_STATE: DocumentState = {
	documentId: undefined,
	title: '',
	content: '',
	metadata: null,
	images: [],
	loaded: false,
	isTrashing: false,
	sidebarOpen: true,
	agenticSidebarOpen: false,
	chatSessions: [],
};
