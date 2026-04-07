/** Documents slice synchronous actions — re-exported from the reducer for convenient named imports. */
export {
	documentsLoaded,
	documentAdded,
	documentUpdated,
	documentMetadataPatched,
	documentRemoved,
	documentSelected,
	documentsLoadingStarted,
	documentsLoadingFailed,
} from './reducer';

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import type { DocumentItem } from './types';
import {
	documentsLoadingStarted,
	documentsLoaded,
	documentsLoadingFailed,
	documentUpdated,
} from './reducer';

function toDocumentItem(f: {
	id: string;
	path: string;
	metadata: { title?: string; emoji?: string };
	savedAt: number;
}): DocumentItem {
	return {
		id: f.id,
		title: (f.metadata.title as string) || '',
		emoji: (f.metadata.emoji as string) || undefined,
		path: f.path,
		createdAt: f.savedAt,
		updatedAt: f.savedAt,
	};
}

export const loadDocuments = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
	'documents/load',
	async (_, { dispatch }) => {
		dispatch(documentsLoadingStarted());
		try {
			const files = await window.workspace.loadOutputsByType('documents');
			dispatch(documentsLoaded(files.map(toDocumentItem)));
		} catch (err) {
			dispatch(documentsLoadingFailed(err instanceof Error ? err.message : String(err)));
		}
	}
);

export const refreshDocument = createAsyncThunk<void, string, { dispatch: AppDispatch }>(
	'documents/refresh',
	async (id, { dispatch }) => {
		try {
			const file = await window.workspace.loadOutput({ type: 'documents', id });
			if (file) dispatch(documentUpdated(toDocumentItem(file)));
		} catch {
			// silently ignore — stale state is acceptable for a single refresh
		}
	}
);
