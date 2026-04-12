import { useCallback } from 'react';
import type { FileEntry } from '../context/types';

interface UseDeleteParams {
	activeFile: FileEntry | null;
	onDeleted: () => void;
}

export function useDelete({ activeFile, onDeleted }: UseDeleteParams) {
	return useCallback(async () => {
		if (!activeFile) return;
		try {
			await window.workspace.deleteResourcesFileEntry(activeFile.id);
			onDeleted();
		} catch {
			/* delete failed */
		}
	}, [activeFile, onDeleted]);
}
