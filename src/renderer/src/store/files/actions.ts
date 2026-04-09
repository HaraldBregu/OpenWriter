/** Files async thunks — IPC calls for loading, inserting, and deleting workspace files. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { FileEntry } from '../../../../shared/types';

/**
 * Load all files from the workspace resources/files/ directory.
 */
export const loadFiles = createAsyncThunk<FileEntry[]>('files/loadAll', async () => {
  return window.workspace.getFiles();
});

/**
 * Delete files by their IDs, then reload the full list.
 */
export const removeFiles = createAsyncThunk<FileEntry[], string[]>(
  'files/remove',
  async (ids) => {
    await Promise.all(ids.map((id) => window.workspace.deleteFileEntry(id)));
    return window.workspace.getFiles();
  }
);
