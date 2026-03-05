/** Workspace slice initial state and state type definition. */
import type { WorkspaceInfo } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

export interface WorkspaceState {
  currentPath: string | null;
  recentWorkspaces: WorkspaceInfo[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Set when the workspace folder is externally deleted/moved while the app is open */
  deletionReason: string | null;
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
};
