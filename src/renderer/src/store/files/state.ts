/** Files slice state type and initial state. */
import type { FileEntry } from '../../../../shared/types';

export type FilesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FilesState {
  /** File entries from resources/files/ */
  entries: FileEntry[];
  /** Loading status */
  status: FilesStatus;
  /** Error message, if any */
  error: string | null;
  /** Whether an import (insert) operation is in progress */
  inserting: boolean;
}

export const initialFilesState: FilesState = {
  entries: [],
  status: 'idle',
  error: null,
  inserting: false,
};
