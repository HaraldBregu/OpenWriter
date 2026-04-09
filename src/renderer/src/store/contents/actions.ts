/** Contents async thunks — IPC calls for loading, inserting, and deleting workspace content files. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ResourceInfo } from '../../../../shared/types';

/**
 * Load all files from the workspace resources/content/ directory.
 */
export const loadContents = createAsyncThunk<ResourceInfo[]>('contents/loadAll', async () => {
	return window.workspace.getContents();
});

/**
 * Delete content files by their IDs, then reload the full list.
 */
export const removeContents = createAsyncThunk<ResourceInfo[], string[]>(
	'contents/remove',
	async (ids) => {
		await Promise.all(ids.map((id) => window.workspace.deleteContent(id)));
		return window.workspace.getContents();
	}
);
