/** Chat state selectors. */
import type { RootState } from '../index';
import type { ChatSession } from './types';

/**
 * Returns the full session for a document, or undefined if none exists.
 * Accepts undefined documentId so callers can pass an optional id directly.
 */
export const selectChatSession = (
	state: RootState,
	documentId: string | undefined
): ChatSession | undefined => (documentId ? state.chat.sessions[documentId] : undefined);

/** All messages for a document session (empty array when no session exists). */
export const selectChatMessages = (state: RootState, documentId: string | undefined) =>
	selectChatSession(state, documentId)?.messages ?? [];

/** The session UUID for a document session, or null when no session has started. */
export const selectChatSessionId = (
	state: RootState,
	documentId: string | undefined
): string | null => selectChatSession(state, documentId)?.sessionId ?? null;

/** The active task id for a document session, or null. */
export const selectActiveChatTaskId = (state: RootState, documentId: string | undefined) =>
	selectChatSession(state, documentId)?.activeTaskId ?? null;

/** The active message id for a document session, or null. */
export const selectActiveChatMessageId = (state: RootState, documentId: string | undefined) =>
	selectChatSession(state, documentId)?.activeMessageId ?? null;

/**
 * Returns all sessions that currently have an active (non-null) task.
 * Intended for a global subscriber that monitors in-flight AI tasks across
 * all open documents.
 */
export const selectAllActiveChatSessions = (
	state: RootState
): Array<{ documentId: string; taskId: string; messageId: string | null }> =>
	Object.entries(state.chat.sessions)
		.filter(([, session]) => session.activeTaskId !== null)
		.map(([documentId, session]) => ({
			documentId,
			// Non-null assertion is safe: the filter above guarantees activeTaskId is set.
			taskId: session.activeTaskId as string,
			messageId: session.activeMessageId,
		}));
