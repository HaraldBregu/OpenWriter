import type { Editor as TiptapEditor } from '@tiptap/core';
import type { PromptSubmitPayload } from '@/components/app/editor/types';
export interface UseContentReviewerTaskOptions {
    documentId: string | null;
    editor: TiptapEditor | null;
    onMarkdownChanged: (markdown: string) => void;
}
export interface UseContentReviewerTask {
    isRunning: boolean;
    taskError: string | null;
    dismissTaskError: () => void;
    submit: (payload: PromptSubmitPayload) => Promise<void>;
}
export declare function useContentReviewerTask(opts: UseContentReviewerTaskOptions): UseContentReviewerTask;
