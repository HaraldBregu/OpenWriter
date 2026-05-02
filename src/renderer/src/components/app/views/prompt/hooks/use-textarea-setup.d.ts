import type React from 'react';
interface UseTextareaSetupParams {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    onSubmit: () => void;
    onDelete: () => void;
}
export declare function useTextareaSetup({ textareaRef, onSubmit, onDelete }: UseTextareaSetupParams): {
    submitRef: React.RefObject<(() => void) | null>;
    resizeTextarea: () => void;
};
export {};
