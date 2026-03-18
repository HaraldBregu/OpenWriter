/** Chats slice public barrel — re-exports types, state, reducer, and selectors. */
// Types
export type { ChatItem, ChatsState } from './types';

// State
export { initialState } from './state';

// Reducer, slice, and synchronous actions
export {
	chatsSlice,
	chatsLoaded,
	chatAdded,
	chatUpdated,
	chatRemoved,
	chatSelected,
	chatsLoadingStarted,
	chatsLoadingFailed,
} from './reducer';
export { default } from './reducer';

// Async actions
export { loadChats, refreshChat } from './actions';

// Selectors
export {
	selectAllChats,
	selectSelectedChat,
	selectSelectedChatId,
	selectChatsStatus,
	selectChatsError,
	selectChatById,
} from './selectors';
