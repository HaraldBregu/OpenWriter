/** Files slice reducer — handles sync actions and async thunk lifecycle cases. */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialFilesState } from './state';
import type { FilesState } from './state';
import { loadFiles, removeFiles } from './actions';

export type { FilesState };

export const filesSlice = createSlice({
  name: 'files',
  initialState: initialFilesState,
  reducers: {
    /**
     * Remove a single file entry from the store (e.g., watcher fires a 'removed' event).
     */
    fileEntryRemoved: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((f) => f.id !== action.payload);
    },

    /**
     * Triggered to start a file insert (import) operation.
     * The listener middleware picks this up and calls the IPC method.
     */
    insertFilesRequested: (state, _action: PayloadAction<string[]>) => {
      state.inserting = true;
    },

    /**
     * Called when the insert operation completes (success or failure).
     */
    insertFilesCompleted: (state) => {
      state.inserting = false;
    },

    /**
     * Reset the files state (e.g., when workspace is cleared).
     */
    resetFiles: (state) => {
      state.entries = [];
      state.status = 'idle';
      state.error = null;
      state.inserting = false;
    },
  },
  extraReducers: (builder) => {
    // loadFiles
    builder
      .addCase(loadFiles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadFiles.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.status = 'ready';
      })
      .addCase(loadFiles.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Failed to load files';
      });

    // removeFiles
    builder
      .addCase(removeFiles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(removeFiles.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.status = 'ready';
      })
      .addCase(removeFiles.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Failed to remove files';
      });
  },
});

export const { fileEntryRemoved, insertFilesRequested, insertFilesCompleted, resetFiles } =
  filesSlice.actions;

export default filesSlice.reducer;
