import { useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import { useDocumentState } from './use-document-state';
import { useDocumentDispatch } from './use-document-dispatch';

const SAVE_DEBOUNCE_MS = 1500;

export function useDocumentPersistence(): () => void {
	const { documentId, title, content, loaded } = useDocumentState();
	const dispatch = useDocumentDispatch();

	const stateRef = useRef({ title, content });
	stateRef.current = { title, content };

	const loadedRef = useRef(loaded);
	loadedRef.current = loaded;

	// Load document when ID changes
	useEffect(() => {
		if (!documentId) return;
		let cancelled = false;

		dispatch({ type: 'LOAD_STARTED' });

		async function load(): Promise<void> {
			try {
				const output = await window.workspace.loadOutput({
					type: 'documents',
					id: documentId!,
				});

				if (cancelled) return;

				if (!output) {
					dispatch({ type: 'LOAD_FAILED' });
					return;
				}

				dispatch({
					type: 'LOAD_SUCCEEDED',
					title: output.metadata.title ?? '',
					content: output.content ?? '',
					metadata: output.metadata,
				});
			} catch {
				if (!cancelled) dispatch({ type: 'LOAD_FAILED' });
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [documentId, dispatch]);

	// File-watcher subscription for metadata updates
	useEffect(() => {
		if (!documentId) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== documentId) return;
			if (event.type !== 'changed') return;

			window.workspace
				.loadOutput({ type: 'documents', id: documentId })
				.then((output) => {
					if (output) dispatch({ type: 'METADATA_UPDATED', metadata: output.metadata });
				})
				.catch(() => {});
		});

		return unsubscribe;
	}, [documentId, dispatch]);

	// Debounced save
	const debouncedSave = useMemo(
		() =>
			debounce(
				() => {
					if (!documentId || !loadedRef.current) return;
					const { title: t, content: c } = stateRef.current;
					window.workspace.updateOutput({
						type: 'documents',
						id: documentId,
						content: c,
						metadata: { title: t },
					});
				},
				SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[documentId]
	);

	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	return debouncedSave;
}
