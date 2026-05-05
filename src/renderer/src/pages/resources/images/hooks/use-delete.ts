import { useCallback } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
import { useContext } from './use-context';

interface UseDeleteParams {
	activeFile: ResourceInfo | null;
	onDeleted: () => void;
}

export function useDelete({ activeFile, onDeleted }: UseDeleteParams) {
	const { removeEntry } = useContext();

	return useCallback(async () => {
		if (!activeFile) return;
		try {
			await window.workspace.deleteResource(activeFile.id);
			removeEntry(activeFile.id);
			onDeleted();
		} catch {
			/* delete failed */
		}
	}, [activeFile, removeEntry, onDeleted]);
}
