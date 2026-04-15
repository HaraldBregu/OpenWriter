import { useEffect } from 'react';
import { useDocumentState } from '../../../hooks';
import { useInfoDispatch } from './use-info-dispatch';

export function useDocumentConfig(): void {
	const { documentId } = useDocumentState();
	const dispatch = useInfoDispatch();

	useEffect(() => {
		if (!documentId) {
			dispatch({ type: 'DOCUMENT_CONFIG_LOADED', config: null });
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				const config = await window.workspace.getDocumentConfig(documentId);
				if (!cancelled) {
					dispatch({ type: 'DOCUMENT_CONFIG_LOADED', config });
				}
			} catch {
				// workspace not ready yet
			}
		})();

		const unsubscribe = window.workspace.onDocumentConfigChanges(documentId, (config) => {
			if (!cancelled) {
				dispatch({ type: 'DOCUMENT_CONFIG_LOADED', config });
			}
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [documentId, dispatch]);
}
