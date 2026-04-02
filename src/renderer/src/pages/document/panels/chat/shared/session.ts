import type { ChatMessageStatus, DocumentChatMessage } from './types';

const INTERRUPTED_STATUSES = new Set<ChatMessageStatus>(['idle', 'queued', 'running']);

export function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((message) =>
		INTERRUPTED_STATUSES.has(message.status)
			? { ...message, status: 'error', content: message.content || 'Session interrupted' }
			: message
	);
}

export function createdAtFromSessionId(sessionId: string, fallback: string): string {
	try {
		const msBits = sessionId.replace(/-/g, '').slice(0, 12);
		const ms = parseInt(msBits, 16);
		if (ms > 0) {
			return new Date(ms).toISOString();
		}
	} catch {
		// Ignore malformed IDs and fall back to the provided timestamp.
	}

	return fallback;
}
