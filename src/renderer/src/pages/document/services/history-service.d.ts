export declare const HISTORY_DIR_NAME = "history";
export declare const MAX_HISTORY_ENTRIES = 30;
export interface HistoryEntry {
    id: string;
    title: string;
    savedAt: string;
}
export declare function historyDir(docPath: string): string;
export declare function isHistoryEntryFilePath(filePath: string): boolean;
export declare function saveHistorySnapshot(docPath: string, content: string, title: string): Promise<HistoryEntry>;
export declare function deleteHistoryEntries(docPath: string, ids: string[]): Promise<void>;
export declare function listHistoryEntries(docPath: string): Promise<HistoryEntry[]>;
export declare function loadHistoryEntry(docPath: string, entryId: string): Promise<{
    content: string;
    title: string;
}>;
export declare function readLatestHistoryEntry(docPath: string): Promise<{
    id: string;
    content: string;
    title: string;
} | null>;
