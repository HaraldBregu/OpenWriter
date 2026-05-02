import type { OutputFileMetadata } from '../../../../../shared/types';
export interface DocumentSelection {
    readonly from: number;
    readonly to: number;
}
export interface DocumentState {
    readonly documentId: string | undefined;
    readonly title: string;
    readonly content: string;
    readonly selection: DocumentSelection | null;
    readonly metadata: OutputFileMetadata | null;
    readonly loaded: boolean;
    readonly isTrashing: boolean;
    readonly sidebarOpen: boolean;
    readonly agenticSidebarOpen: boolean;
}
export declare const INITIAL_DOCUMENT_STATE: DocumentState;
