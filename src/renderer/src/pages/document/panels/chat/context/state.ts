import type { ChatSession } from '../shared';

export type {
	AssistantTaskData,
	ChatMessageStatus,
	ChatMessagesFile,
	ChatSession,
	ChatSessionFile,
	ChatSessionListItem,
	DocumentChatMessage,
	DocumentChatMessageRole,
} from '../shared';

export const INITIAL_CHAT_STATE: ChatSession = {
	sessionId: null,
	messages: [],
	activeTaskId: null,
	activeMessageId: null,
};
