import { useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import { useDocumentState } from './use-document-state';
import { useDocumentDispatch } from './use-document-dispatch';
import type { DocumentChatMessage, ChatMessagesFile } from '../context/state';

const SAVE_DEBOUNCE_MS = 500;
const INTERRUPTED_STATUSES = new Set<DocumentChatMessage['status']>(['idle', 'queued', 'running']);

function sanitizeLoadedMessages(messages: DocumentChatMessage[]): DocumentChatMessage[] {
	return messages.map((msg) =>
		INTERRUPTED_STATUSES.has(msg.status)
			? { ...msg, status: 'error' as const, content: msg.content || 'Session interrupted' }
			: msg
	);
}

export function useChatPersistence(documentId: string | undefined): () => void {
	const { chatMessages } = useDocumentState();
	const dispatch = useDocumentDispatch();

	const messagesRef = useRef(chatMessages);
	messagesRef.current = chatMessages;

	// Track the last serialized state that was saved (or loaded) to skip no-op writes.
	const lastSavedRef = useRef('');

	// Track whether a file was found on disk during load.
	const fileLoadedRef = useRef(false);

	// Load messages when documentId changes.
	useEffect(() => {
		if (!documentId) return;

		let cancelled = false;

		// Reset load-tracking for this document.
		lastSavedRef.current = '';
		fileLoadedRef.current = false;

		async function load(): Promise<void> {
			try {
				const docPath = await window.workspace.getDocumentPath(documentId!);
				const filePath = `${docPath}/chat/messages.json`;

				let raw: string;
				try {
					raw = await window.workspace.readFile({ filePath });
				} catch {
					// File does not exist yet — treat as empty history.
					return;
				}

				if (cancelled) return;

				const parsed = JSON.parse(raw) as ChatMessagesFile;
				const sanitized = sanitizeLoadedMessages(parsed.messages ?? []);

				fileLoadedRef.current = true;
				lastSavedRef.current = JSON.stringify(sanitized);

				dispatch({ type: 'CHAT_MESSAGES_LOADED', messages: sanitized });
			} catch {
				// Malformed JSON or unexpected error — treat as empty history.
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [documentId, dispatch]);

	// Debounced save — recreated whenever documentId changes so the closure is
	// always bound to the correct document.
	const debouncedSave = useMemo(
		() =>
			debounce(
				async () => {
					if (!documentId) return;

					const messages = messagesRef.current;

					// Do not create an empty file before load has completed.
					if (messages.length === 0 && lastSavedRef.current === '') return;

					const serialized = JSON.stringify(messages);
					if (serialized === lastSavedRef.current) return;

					const envelope: ChatMessagesFile = { version: 1, messages };
					const content = JSON.stringify(envelope, null, 2);

					try {
						const docPath = await window.workspace.getDocumentPath(documentId);
						const filePath = `${docPath}/chat/messages.json`;

						await window.workspace.writeFile({ path: filePath, content });
						lastSavedRef.current = serialized;
					} catch {
						// Write failure is non-fatal — will retry on next change.
					}
				},
				SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[documentId]
	);

	// Trigger debounced save whenever chatMessages changes.
	useEffect(() => {
		debouncedSave();
	}, [chatMessages, debouncedSave]);

	// Cancel debounce timer on unmount to avoid writes to a stale documentId.
	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	// Expose flush so callers can force an immediate write (e.g., before navigation).
	return debouncedSave.flush;
}
