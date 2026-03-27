/** Chat slice type definitions — session shape and state. */
import type { DocumentChatMessage } from '../../pages/document/context/state';

export type { DocumentChatMessage };

export interface ChatSession {
	messages: DocumentChatMessage[];
	activeTaskId: string | null;
	activeMessageId: string | null;
}

export interface ChatState {
	sessions: Record<string, ChatSession>; // keyed by documentId
}
