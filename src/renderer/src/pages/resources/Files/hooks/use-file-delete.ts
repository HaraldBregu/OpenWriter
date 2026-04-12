import { useCallback } from 'react';
import type { FileEntry } from '../context/types';

interface UseFileDeleteParams {
	activeFile: FileEntry | null;
	onDeleted: () => void;
}

export function useFileDelete({ activeFile, onDeleted }: UseFileDeleteParams) {
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
