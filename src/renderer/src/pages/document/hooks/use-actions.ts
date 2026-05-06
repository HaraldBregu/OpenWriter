import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from './use-state';
import { useDispatch } from './use-dispatch';

interface DocumentActions {
	readonly handleTitleChange: (value: string) => void;
	readonly handleContentChange: (value: string) => void;
	readonly handleMoveToTrash: () => Promise<void>;
	readonly handleOpenFolder: () => void;
}

export function useActions(triggerSave: () => void): DocumentActions {
	const { documentId, isTrashing } = useState();
	const dispatch = useDispatch();
	const navigate = useNavigate();

	const handleTitleChange = useCallback(
		(value: string) => {
			dispatch({ type: 'TITLE_CHANGED', value });
			triggerSave();
		},
		[dispatch, triggerSave]
	);

	const handleContentChange = useCallback(
		(value: string) => {
			dispatch({ type: 'CONTENT_CHANGED', value });
			triggerSave();
		},
		[dispatch, triggerSave]
	);

	const handleMoveToTrash = useCallback(async () => {
		if (!documentId || isTrashing) return;
		dispatch({ type: 'TRASH_STARTED' });
		try {
			await window.workspace.trashOutput({ type: 'documents', id: documentId });
			navigate('/settings/assistant');
		} catch {
			dispatch({ type: 'TRASH_FAILED' });
		}
	}, [documentId, isTrashing, dispatch, navigate]);

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	return { handleTitleChange, handleContentChange, handleMoveToTrash, handleOpenFolder };
}
