import { type HistoryEntry } from '../services/history-service';
export type { HistoryEntry };
interface UseDocumentHistoryOptions {
    documentId: string | undefined;
    content: string;
    title: string;
    loaded: boolean;
    onRestore: (content: string, title: string) => void;
}
interface UseDocumentHistoryReturn {
    entries: HistoryEntry[];
    currentEntryId: string | null;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    restoreEntry: (id: string) => Promise<void>;
    returnToLive: () => void;
}
export declare function useHistory({ documentId, content, title, loaded, onRestore, }: UseDocumentHistoryOptions): UseDocumentHistoryReturn;
