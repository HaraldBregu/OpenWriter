// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
export const initialState = {
    currentPath: null,
    projectName: null,
    projectDescription: null,
    workspaces: [],
    status: 'idle',
    error: null,
    deletionReason: null,
    resources: [],
    resourcesStatus: 'idle',
    resourcesError: null,
    importing: false,
    indexingInfo: null,
    documentItems: [],
    selectedDocumentId: null,
    documentsStatus: 'idle',
    documentsError: null,
};
