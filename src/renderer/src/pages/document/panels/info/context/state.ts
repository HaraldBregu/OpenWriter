import type { DocumentConfig } from '../../../../../../../shared/types';

export interface InfoPreviewImage {
	readonly src: string;
	readonly alt: string;
}

export interface InfoState {
	readonly documentConfig: DocumentConfig | null;
	readonly confirmDeleteOpen: boolean;
	readonly isDeleting: boolean;
	readonly previewImage: InfoPreviewImage | null;
}

export const INITIAL_INFO_STATE: InfoState = {
	documentConfig: null,
	confirmDeleteOpen: false,
	isDeleting: false,
	previewImage: null,
};
