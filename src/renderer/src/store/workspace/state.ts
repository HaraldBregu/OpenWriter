/** Workspace slice initial state and state type definition. */
import type { IndexingInfo, ResourceInfo, WorkspaceInfo } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

export type ResourcesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkspaceState {
	currentPath: string | null;
	recentWorkspaces: WorkspaceInfo[];
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
	/** Set when the workspace folder is externally deleted/moved while the app is open */
	deletionReason: string | null;
	/** Resources imported into the workspace */
	resources: ResourceInfo[];
	resourcesStatus: ResourcesStatus;
	resourcesError: string | null;
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
	resources: [],
	resourcesStatus: 'idle',
	resourcesError: null,
	importing: false,
};
