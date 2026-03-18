/** Chats slice type definitions. */

// ---------------------------------------------------------------------------
// Slice-specific types
// ---------------------------------------------------------------------------

export interface ChatItem {
	id: string;
	title: string;
	path: string;
	createdAt: number;
	updatedAt: number;
}

export interface ChatsState {
	items: ChatItem[];
	selectedId: string | null;
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
}
