import { useCallback } from 'react';
import { useDocumentState } from '../../../hooks';
import { useInfoDispatch } from './use-info-dispatch';
import { useInfoState } from './use-info-state';

export function useDeleteDocument(): () => Promise<void> {
	const { documentId } = useDocumentState();
	const { isDeleting } = useInfoState();
	const dispatch = useInfoDispatch();

	return useCallback(async () => {
		if (!documentId || isDeleting) return;

		dispatch({ type: 'DELETE_STARTED' });
		try {
			await window.workspace.deleteOutput({ type: 'documents', id: documentId });
		} finally {
			dispatch({ type: 'DELETE_FINISHED' });
		}
	}, [documentId, isDeleting, dispatch]);
}
