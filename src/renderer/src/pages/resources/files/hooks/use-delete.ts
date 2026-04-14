import { useCallback } from 'react';
import type { FileEntry } from '../context/types';
import { useContext } from './use-context';

interface UseDeleteParams {
	activeFile: FileEntry | null;
	onDeleted: () => void;
}

export function useDelete({ activeFile, onDeleted }: UseDeleteParams) {
	const { removeEntry } = useContext();

	return useCallback(async () => {
		if (!activeFile) return;
		try {
			await window.workspace.deleteResourcesFileEntry(activeFile.id);
			removeEntry(activeFile.id);
			onDeleted();
		} catch {
			/* delete failed */
		}
	}, [activeFile, removeEntry, onDeleted]);
}
