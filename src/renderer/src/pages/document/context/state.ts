import type { OutputFileMetadata, DocumentImageInfo } from '../../../../../shared/types';
import type { ChatSession, ChatSessionListItem } from '../panels/chat/shared';
import { INITIAL_CHAT_STATE } from '../panels/chat/context';

export interface DocumentState {
	readonly documentId: string | undefined;
	readonly title: string;
	readonly metadata: OutputFileMetadata | null;
	readonly images: DocumentImageInfo[];
	readonly loaded: boolean;
	readonly isTrashing: boolean;
	readonly sidebarOpen: boolean;
	readonly agenticSidebarOpen: boolean;
	readonly chatSessions: ChatSessionListItem[];
	readonly chat: ChatSession;
}

export const INITIAL_DOCUMENT_STATE: DocumentState = {
	documentId: undefined,
	title: '',
	metadata: null,
	images: [],
	loaded: false,
	isTrashing: false,
	sidebarOpen: true,
	agenticSidebarOpen: true,
	chatSessions: [],
	chat: INITIAL_CHAT_STATE,
};
