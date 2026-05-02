import { useCallback, useMemo } from 'react';
export function useEditor(editorRef) {
    const showLoading = useCallback(() => {
        editorRef.current?.setAssistantLoading(true);
    }, [editorRef]);
    const hideLoading = useCallback(() => {
        editorRef.current?.setAssistantLoading(false);
    }, [editorRef]);
    const enable = useCallback(() => {
        editorRef.current?.setAssistantEnable(true);
    }, [editorRef]);
    const disable = useCallback(() => {
        editorRef.current?.setAssistantEnable(false);
    }, [editorRef]);
    const closePrompt = useCallback(() => {
        editorRef.current?.removeAssistant();
    }, [editorRef]);
    const insertPromptView = useCallback(() => {
        editorRef.current?.insertPromptView();
    }, [editorRef]);
    const insertText = useCallback((text, options) => {
        editorRef.current?.insertText(text, options);
    }, [editorRef]);
    const insertMarkdownText = useCallback((text, options) => {
        editorRef.current?.insertMarkdownText(text, options);
    }, [editorRef]);
    return useMemo(() => ({
        showLoading,
        hideLoading,
        enable,
        disable,
        closePrompt,
        insertPromptView,
        insertText,
        insertMarkdownText,
    }), [
        showLoading,
        hideLoading,
        enable,
        disable,
        closePrompt,
        insertPromptView,
        insertText,
        insertMarkdownText,
    ]);
}
