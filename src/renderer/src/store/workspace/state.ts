/** Workspace slice initial state and state type definition. */
import type { ResourceInfo, WorkspaceInfo } from '../../../../shared/types';
import type { DocumentItem } from './types';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

export type ResourcesStatus = 'idle' | 'loading' | 'ready' | 'error';
export type DocumentsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkspaceState {
	currentPath: string | null;
	/** Project name from workspace metadata (workspace.json `project` block) */
	projectName: string | null;
	/** Project description from workspace metadata (workspace.json `project` block) */
	projectDescription: string | null;
	/** Editor max-width as a whole-number percentage (1–100). Null until loaded. */
	editorWidth: number | null;
	/** Every managed workspace under `{userData}/workspaces/`. */
	workspaces: WorkspaceInfo[];
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
	/** Document items produced inside the workspace (outputs of type 'documents'). */
	documentItems: DocumentItem[];
	selectedDocumentId: string | null;
	documentsStatus: DocumentsStatus;
	documentsError: string | null;
}

export type { WorkspaceState as WorkspaceStateType };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialState: WorkspaceState = {
	currentPath: null,
	projectName: null,
	projectDescription: null,
	editorWidth: null,
	workspaces: [],
	status: 'idle',
	error: null,
	deletionReason: null,
	resources: [],
	resourcesStatus: 'idle',
	resourcesError: null,
	importing: false,
	documentItems: [],
	selectedDocumentId: null,
	documentsStatus: 'idle',
	documentsError: null,
};
