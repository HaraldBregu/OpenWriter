import type { SaveOutputResult } from '../../../shared/types';
export interface UseCreateWritingOptions {
    /** Called immediately after the workspace IPC resolves, before navigation. */
    onCreated?: (result: SaveOutputResult) => void;
}
export interface UseCreateWritingResult {
    createWriting: () => Promise<void>;
    isCreating: boolean;
    error: string | null;
    clearError: () => void;
}
/**
 * Encapsulates the "New Writing" creation flow:
 *   1. Calls window.workspace.saveOutput to persist the folder on disk.
 *   2. Invokes options.onCreated with the result (if provided) so callers
 *      can optimistically update their UI before the file-watcher fires.
 *   3. Navigates to /content/:id on success.
 *
 * Uses a ref-based in-flight guard so rapid successive clicks are ignored
 * without requiring the caller to track the loading state in their own
 * dependency array.
 */
export declare function useCreateWriting(options?: UseCreateWritingOptions): UseCreateWritingResult;
