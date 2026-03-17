import type { OutputFileMetadata } from '../../../../../shared/types';

export interface DocumentState {
	readonly documentId: string | undefined;
	readonly title: string;
	readonly content: string;
	readonly metadata: OutputFileMetadata | null;
	readonly loaded: boolean;
	readonly isTrashing: boolean;
	readonly sidebarOpen: boolean;
	readonly agenticSidebarOpen: boolean;
}

export const INITIAL_DOCUMENT_STATE: DocumentState = {
	documentId: undefined,
	title: '',
	content: '',
	metadata: null,
	loaded: false,
	isTrashing: false,
	sidebarOpen: true,
	agenticSidebarOpen: false,
};
