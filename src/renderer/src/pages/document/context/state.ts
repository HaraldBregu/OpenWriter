import type { OutputFileMetadata, DocumentImageInfo } from '../../../../../shared/types';

export interface DocumentChatMessage {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant';
	readonly timestamp: string;
	readonly taskId: string | null;
	readonly status: 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
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
	readonly chatMessages: DocumentChatMessage[];
	readonly activeChatTaskId: string | null;
	readonly activeChatMessageId: string | null;
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
	chatMessages: [],
	activeChatTaskId: null,
	activeChatMessageId: null,
};
