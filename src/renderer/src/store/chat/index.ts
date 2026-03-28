/** Chat slice public barrel — re-exports types, state, reducer, and selectors. */

// Types
export type { DocumentChatMessage, ChatSession, ChatState } from './types';

// State
export { initialState } from './state';

// Reducer, slice, and synchronous actions
export {
	chatSlice,
	chatMessageAdded,
	chatMessageUpdated,
	chatActiveTaskSet,
	chatActiveMessageSet,
	chatMessagesLoaded,
	chatReset,
	chatSessionStarted,
} from './reducer';
export { default } from './reducer';

// Selectors
export {
	selectChatSession,
	selectChatMessages,
	selectActiveChatTaskId,
	selectActiveChatMessageId,
	selectAllActiveChatSessions,
} from './selectors';
