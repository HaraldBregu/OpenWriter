/** Documents slice type definitions. */

// ---------------------------------------------------------------------------
// Slice-specific types
// ---------------------------------------------------------------------------

export interface DocumentItem {
	id: string;
	title: string;
	path: string;
	createdAt: number;
	updatedAt: number;
}

export interface DocumentsState {
	items: DocumentItem[];
	selectedId: string | null;
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
}
