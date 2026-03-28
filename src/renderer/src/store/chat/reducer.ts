/**
 * chatSlice — Redux Toolkit slice for persisted chat session state.
 *
 * Each chat session is keyed by documentId so that messages survive navigation.
 * All actions require a documentId in the payload to scope updates to the
 * correct session.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './state';
import type { ChatState, ChatSession, DocumentChatMessage } from './types';

export type { ChatState };

// ---------------------------------------------------------------------------
// Helpers (run inside Immer-wrapped reducers, so mutations are safe here)
// ---------------------------------------------------------------------------

const EMPTY_SESSION: Readonly<ChatSession> = {
	sessionId: null,
	messages: [],
	activeTaskId: null,
	activeMessageId: null,
};

/**
 * Returns the mutable Immer draft for the given documentId's session,
 * creating it with empty defaults if it does not yet exist.
 */
function getOrCreateSession(state: ChatState, documentId: string): ChatSession {
	if (!state.sessions[documentId]) {
		state.sessions[documentId] = { ...EMPTY_SESSION, messages: [] };
	}
	return state.sessions[documentId];
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const chatSlice = createSlice({
	name: 'chat',
	initialState,
	reducers: {
		/**
		 * Append a new message to the session identified by documentId.
		 * Creates the session if it does not yet exist.
		 */
		chatMessageAdded(
			state,
			action: PayloadAction<{ documentId: string; message: DocumentChatMessage }>
		) {
			const { documentId, message } = action.payload;
			const session = getOrCreateSession(state, documentId);
			session.messages.push(message);
		},

		/**
		 * Apply a partial patch to an existing message by id.
		 * Immutable fields (id, role, timestamp) are excluded from the patch type.
		 * No-ops silently if the message is not found.
		 */
		chatMessageUpdated(
			state,
			action: PayloadAction<{
				documentId: string;
				id: string;
				patch: Partial<Omit<DocumentChatMessage, 'id' | 'role' | 'timestamp'>>;
			}>
		) {
			const { documentId, id, patch } = action.payload;
			const session = getOrCreateSession(state, documentId);
			const index = session.messages.findIndex((m) => m.id === id);
			if (index === -1) return;
			session.messages[index] = { ...session.messages[index], ...patch };
		},

		/**
		 * Set the active task id for a session (null clears it).
		 */
		chatActiveTaskSet(state, action: PayloadAction<{ documentId: string; taskId: string | null }>) {
			const { documentId, taskId } = action.payload;
			const session = getOrCreateSession(state, documentId);
			session.activeTaskId = taskId;
		},

		/**
		 * Set the active message id for a session (null clears it).
		 */
		chatActiveMessageSet(
			state,
			action: PayloadAction<{ documentId: string; messageId: string | null }>
		) {
			const { documentId, messageId } = action.payload;
			const session = getOrCreateSession(state, documentId);
			session.activeMessageId = messageId;
		},

		/**
		 * Replace all messages in a session and clear active tracking ids.
		 * Used when loading a persisted chat history from disk.
		 */
		chatMessagesLoaded(
			state,
			action: PayloadAction<{
				documentId: string;
				messages: DocumentChatMessage[];
				sessionId: string | null;
			}>
		) {
			const { documentId, messages, sessionId } = action.payload;
			state.sessions[documentId] = {
				sessionId,
				messages,
				activeTaskId: null,
				activeMessageId: null,
			};
		},

		/**
		 * Reset a session back to its empty initial state.
		 * An optional sessionId can be provided to atomically assign a new UUID
		 * when the user starts a fresh chat.
		 */
		chatReset(state, action: PayloadAction<{ documentId: string; sessionId?: string }>) {
			const { documentId, sessionId } = action.payload;
			state.sessions[documentId] = {
				sessionId: sessionId ?? null,
				messages: [],
				activeTaskId: null,
				activeMessageId: null,
			};
		},

		/**
		 * Set the session UUID for a document's chat session.
		 * Creates the session if it does not yet exist.
		 * Used by AgenticPanel when the first message is sent with no active session.
		 */
		chatSessionStarted(
			state,
			action: PayloadAction<{ documentId: string; sessionId: string }>
		) {
			const { documentId, sessionId } = action.payload;
			const session = getOrCreateSession(state, documentId);
			session.sessionId = sessionId;
		},
	},
});

export const {
	chatMessageAdded,
	chatMessageUpdated,
	chatActiveTaskSet,
	chatActiveMessageSet,
	chatMessagesLoaded,
	chatReset,
} = chatSlice.actions;

export default chatSlice.reducer;
