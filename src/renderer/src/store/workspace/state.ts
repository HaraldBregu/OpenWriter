/** Workspace slice initial state and state type definition. */
import type { DocumentInfo, WorkspaceInfo } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

export type DocumentsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkspaceState {
	currentPath: string | null;
	recentWorkspaces: WorkspaceInfo[];
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
	/** Set when the workspace folder is externally deleted/moved while the app is open */
	deletionReason: string | null;
	/** Documents imported into the workspace */
	documents: DocumentInfo[];
	documentsStatus: DocumentsStatus;
	documentsError: string | null;
	/** Whether a file import operation is in progress */
	importing: boolean;
}

export type { WorkspaceState as WorkspaceStateType };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialState: WorkspaceState = {
	currentPath: null,
	recentWorkspaces: [],
	status: 'idle',
	error: null,
	deletionReason: null,
	documents: [],
	documentsStatus: 'idle',
	documentsError: null,
};
