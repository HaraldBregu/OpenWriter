import { useCallback, useEffect, useRef } from 'react';
export function useTextareaSetup({ textareaRef, onSubmit, onDelete }) {
    const submitRef = useRef(onSubmit);
    submitRef.current = onSubmit;
    const deleteRef = useRef(onDelete);
    deleteRef.current = onDelete;
    const resizeTextarea = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea)
            return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [textareaRef]);
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea)
            return;
        requestAnimationFrame(() => {
            textarea.focus();
            resizeTextarea();
        });
        const handleKeyDown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitRef.current?.();
            }
            else if (e.key === 'Escape') {
                deleteRef.current();
            }
        };
        const stopClipboard = (e) => {
            e.stopPropagation();
        };
        textarea.addEventListener('keydown', handleKeyDown);
        textarea.addEventListener('copy', stopClipboard);
        textarea.addEventListener('cut', stopClipboard);
        textarea.addEventListener('paste', stopClipboard);
        return () => {
            textarea.removeEventListener('keydown', handleKeyDown);
            textarea.removeEventListener('copy', stopClipboard);
            textarea.removeEventListener('cut', stopClipboard);
            textarea.removeEventListener('paste', stopClipboard);
        };
    }, [resizeTextarea, textareaRef]);
    return { submitRef, resizeTextarea };
}
