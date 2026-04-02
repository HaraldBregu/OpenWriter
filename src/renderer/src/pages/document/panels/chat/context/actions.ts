import type { DocumentChatMessage } from '../shared';

export type ChatAction =
	| { type: 'CHAT_MESSAGE_ADDED'; message: DocumentChatMessage }
	| { type: 'CHAT_MESSAGE_INSERTED_BEFORE'; beforeId: string; message: DocumentChatMessage }
	| {
			type: 'CHAT_MESSAGE_UPDATED';
			id: string;
			patch: Partial<Omit<DocumentChatMessage, 'id' | 'role' | 'timestamp'>>;
	  }
	| { type: 'CHAT_ACTIVE_TASK_SET'; taskId: string | null }
	| { type: 'CHAT_ACTIVE_MESSAGE_SET'; messageId: string | null }
	| { type: 'CHAT_MESSAGES_LOADED'; messages: DocumentChatMessage[]; sessionId: string | null }
	| { type: 'CHAT_RESET'; sessionId?: string }
	| { type: 'CHAT_SESSION_STARTED'; sessionId: string };
