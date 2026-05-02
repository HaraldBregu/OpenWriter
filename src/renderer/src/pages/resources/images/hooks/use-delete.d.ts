import type { FileEntry } from '../context/types';
interface UseDeleteParams {
    activeFile: FileEntry | null;
    onDeleted: () => void;
}
export declare function useDelete({ activeFile, onDeleted }: UseDeleteParams): () => Promise<void>;
export {};
