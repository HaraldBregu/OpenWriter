import { useCallback } from 'react';
import { useContext } from './use-context';
export function useDelete({ activeFile, onDeleted }) {
    const { removeEntry } = useContext();
    return useCallback(async () => {
        if (!activeFile)
            return;
        try {
            await window.workspace.deleteImage(activeFile.id);
            removeEntry(activeFile.id);
            onDeleted();
        }
        catch {
            /* delete failed */
        }
    }, [activeFile, removeEntry, onDeleted]);
}
