import type { PayloadAction } from '@reduxjs/toolkit';
import type { WorkspaceState } from './state';
import type { DocumentItem } from './types';
export type { WorkspaceState };
export declare const workspaceSlice: import("@reduxjs/toolkit").Slice<WorkspaceState, {
    /**
     * Handle workspace change events from the main process.
     * Called when window.workspace.onChange() fires.
     */
    handleWorkspaceChanged: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<{
        currentPath: string | null;
        previousPath: string | null;
    }>) => void;
    /**
     * Handle workspace folder deletion detected by the main process.
     * Clears the workspace and records the reason so the UI can display
     * an appropriate message to the user.
     */
    handleWorkspaceDeleted: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<{
        deletedPath: string;
        reason: string;
    }>) => void;
    /**
     * Clear the deletion reason (e.g., after the user has acknowledged the message).
     */
    clearDeletionReason: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }) => void;
    /**
     * Remove a single resource from the store (e.g., when the watcher fires a 'removed' event).
     */
    resourceRemoved: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<string>) => void;
    /**
     * Triggered to start a file import operation.
     * The listener middleware picks this up and calls the IPC method.
     */
    importResourcesRequested: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, _action: PayloadAction<string[]>) => void;
    /**
     * Called when the import operation completes (success or failure).
     */
    importResourcesCompleted: (state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }) => void;
    /** Replace the full list of document items (e.g. after loading from disk). */
    documentsLoaded(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<DocumentItem[]>): void;
    /** Add a new document item to the list. */
    documentAdded(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<DocumentItem>): void;
    /** Update an existing document item by id. */
    documentUpdated(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<DocumentItem>): void;
    /** Patch only title and updatedAt for an existing document. */
    documentMetadataPatched(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<{
        id: string;
        title: string;
        updatedAt: number;
    }>): void;
    /** Remove a document item by id. */
    documentRemoved(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<string>): void;
    /** Set the currently selected document item. */
    documentSelected(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<string | null>): void;
    /** Set documents loading status and clear any previous error. */
    documentsLoadingStarted(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }): void;
    /** Set documents error status with a message. */
    documentsLoadingFailed(state: {
        currentPath: string | null;
        projectName: string | null;
        projectDescription: string | null;
        workspaces: {
            id: string;
            path: string;
            lastOpened: number;
            name: string | null;
            description: string | null;
        }[];
        status: "idle" | "loading" | "ready" | "error";
        error: string | null;
        deletionReason: string | null;
        resources: {
            id: string;
            name: string;
            path: string;
            size: number;
            mimeType: string;
            importedAt: number;
            lastModified: number;
        }[];
        resourcesStatus: import("./state").ResourcesStatus;
        resourcesError: string | null;
        importing: boolean;
        indexingInfo: {
            lastIndexedAt: number;
            indexedCount: number;
            failedCount: number;
            totalChunks: number;
        } | null;
        documentItems: {
            id: string;
            title: string;
            path: string;
            createdAt: number;
            updatedAt: number;
        }[];
        selectedDocumentId: string | null;
        documentsStatus: import("./state").DocumentsStatus;
        documentsError: string | null;
    }, action: PayloadAction<string>): void;
}, "workspace", "workspace", import("@reduxjs/toolkit").SliceSelectors<WorkspaceState>>;
export declare const handleWorkspaceChanged: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    currentPath: string | null;
    previousPath: string | null;
}, "workspace/handleWorkspaceChanged">, handleWorkspaceDeleted: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    deletedPath: string;
    reason: string;
}, "workspace/handleWorkspaceDeleted">, clearDeletionReason: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workspace/clearDeletionReason">, resourceRemoved: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workspace/resourceRemoved">, importResourcesRequested: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "workspace/importResourcesRequested">, importResourcesCompleted: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workspace/importResourcesCompleted">, documentsLoaded: import("@reduxjs/toolkit").ActionCreatorWithPayload<DocumentItem[], "workspace/documentsLoaded">, documentAdded: import("@reduxjs/toolkit").ActionCreatorWithPayload<DocumentItem, "workspace/documentAdded">, documentUpdated: import("@reduxjs/toolkit").ActionCreatorWithPayload<DocumentItem, "workspace/documentUpdated">, documentMetadataPatched: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    title: string;
    updatedAt: number;
}, "workspace/documentMetadataPatched">, documentRemoved: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workspace/documentRemoved">, documentSelected: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "workspace/documentSelected">, documentsLoadingStarted: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workspace/documentsLoadingStarted">, documentsLoadingFailed: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workspace/documentsLoadingFailed">;
declare const _default: import("redux").Reducer<WorkspaceState>;
export default _default;
