import { useEffect } from 'react';
import type { FilesState } from './state';
import type { FilesActions } from './actions';

interface FilesEffectsDeps {
	state: FilesState;
	actions: FilesActions;
}

export function useFilesEffects({ state, actions }: FilesEffectsDeps): void {
	const { mountedRef, entries, setEntries, setSelected, activeFile, setActiveFile, setFileDetailsOpen } = state;
	const { refreshFiles } = actions;

	useEffect(() => {
		const unsubscribeFiles = window.workspace.onResourcesFilesChanged(() => {
			void refreshFiles();
		});

		const unsubscribeWorkspace = window.workspace.onChange((event) => {
			if (event.currentPath) {
				void refreshFiles();
				return;
			}

			setEntries([]);
			setSelected(new Set());
		});

		return () => {
			mountedRef.current = false;
			unsubscribeFiles();
			unsubscribeWorkspace();
		};
	}, [mountedRef, refreshFiles, setSelected, setEntries]);

	useEffect(() => {
		setSelected((current) => {
			const entryIds = new Set(entries.map((entry) => entry.id));
			const nextSelected = new Set([...current].filter((id) => entryIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !entryIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [entries, setSelected]);

	useEffect(() => {
		if (activeFile && !entries.some((entry) => entry.id === activeFile.id)) {
			setActiveFile(null);
			setFileDetailsOpen(false);
		}
	}, [activeFile, entries, setActiveFile, setFileDetailsOpen]);
}
