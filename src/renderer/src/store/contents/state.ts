/** Contents slice state type and initial state. */
import type { ResourceInfo } from '../../../../shared/types';

export type ContentsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ContentsState {
	/** Content entries from resources/content/ */
	entries: ResourceInfo[];
	/** Loading status */
	status: ContentsStatus;
	/** Error message, if any */
	error: string | null;
	/** Whether an import (insert) operation is in progress */
	inserting: boolean;
}

export const initialContentsState: ContentsState = {
	entries: [],
	status: 'idle',
	error: null,
	inserting: false,
};
