import type { DocumentConfig } from '../../../../../../../shared/types';

export interface InfoState {
	readonly documentConfig: DocumentConfig | null;
	readonly confirmDeleteOpen: boolean;
	readonly isDeleting: boolean;
}

export const INITIAL_INFO_STATE: InfoState = {
	documentConfig: null,
	confirmDeleteOpen: false,
	isDeleting: false,
};
