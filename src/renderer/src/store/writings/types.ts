/** Writings slice type definitions. */

// ---------------------------------------------------------------------------
// Slice-specific types
// ---------------------------------------------------------------------------

export interface WritingItem {
	id: string;
	title: string;
	path: string;
	createdAt: number;
	updatedAt: number;
}

export interface WritingsState {
	items: WritingItem[];
	selectedId: string | null;
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
}
