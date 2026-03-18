import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SaveOutputResult } from '../../../shared/types';

export interface UseCreateChatOptions {
	/** Called immediately after the workspace IPC resolves, before navigation. */
	onCreated?: (result: SaveOutputResult) => void;
}

export interface UseCreateChatResult {
	createChat: () => Promise<void>;
	isCreating: boolean;
	error: string | null;
	clearError: () => void;
}

/**
 * Encapsulates the "New Chat" creation flow:
 *   1. Calls window.workspace.saveOutput to persist the folder on disk.
 *   2. Invokes options.onCreated with the result (if provided) so callers
 *      can optimistically update their UI before the file-watcher fires.
 *   3. Navigates to /chat/:id on success.
 */
export function useCreateChat(options?: UseCreateChatOptions): UseCreateChatResult {
	const navigate = useNavigate();
	const inFlightRef = useRef(false);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const optionsRef = useRef(options);
	optionsRef.current = options;

	const createChat = useCallback(async () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsCreating(true);
		setError(null);

		try {
			const result = await window.workspace.saveOutput({
				type: 'chats',
				content: '',
				metadata: { title: '' },
			});

			optionsRef.current?.onCreated?.(result);

			navigate(`/chat/${result.id}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create chat.';
			setError(message);
		} finally {
			setIsCreating(false);
			inFlightRef.current = false;
		}
	}, [navigate]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return { createChat, isCreating, error, clearError };
}
