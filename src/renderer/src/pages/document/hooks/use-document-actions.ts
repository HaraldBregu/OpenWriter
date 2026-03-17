import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentState } from './use-document-state';
import { useDocumentDispatch } from './use-document-dispatch';

interface DocumentActions {
	readonly handleTitleChange: (value: string) => void;
	readonly handleContentChange: (value: string) => void;
	readonly handleMoveToTrash: () => Promise<void>;
	readonly handleOpenFolder: () => void;
}

export function useDocumentActions(triggerSave: () => void): DocumentActions {
	const { documentId, isTrashing } = useDocumentState();
	const dispatch = useDocumentDispatch();
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
			navigate('/home');
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
