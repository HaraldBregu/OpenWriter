import { useCallback, useMemo } from 'react';
export function useImageActions({ dispatch, editor, node, getPos }) {
    const handleError = useCallback(() => {
        dispatch({ type: 'IMAGE_ERROR' });
    }, [dispatch]);
    const handleLoad = useCallback(() => {
        dispatch({ type: 'IMAGE_LOADED' });
    }, [dispatch]);
    const handleDelete = useCallback(() => {
        const pos = getPos();
        if (typeof pos !== 'number')
            return;
        editor
            .chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
    }, [editor, getPos, node.nodeSize]);
    const handleAskAI = useCallback(() => {
        dispatch({ type: 'START_AI_EDIT' });
    }, [dispatch]);
    const handleEdit = useCallback(() => {
        dispatch({ type: 'START_EDIT' });
    }, [dispatch]);
    const handleImageClick = useCallback(() => {
        dispatch({ type: 'SET_PREVIEWING', payload: true });
    }, [dispatch]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dispatch({ type: 'SET_PREVIEWING', payload: true });
        }
    }, [dispatch]);
    const handleEditorSave = useCallback(async (dataUri) => {
        const pos = getPos();
        if (typeof pos !== 'number')
            return;
        const imgStorage = editor.storage;
        const saveHandler = imgStorage.image?.onImageEditSave;
        const finalSrc = saveHandler ? await saveHandler(dataUri) : dataUri;
        if (editor.isDestroyed)
            return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            src: finalSrc,
        }));
        dispatch({ type: 'FINISH_EDIT' });
    }, [dispatch, editor, getPos, node.attrs]);
    const handleEditorCancel = useCallback(() => {
        dispatch({ type: 'FINISH_EDIT' });
    }, [dispatch]);
    const setHovered = useCallback((value) => dispatch({ type: 'SET_HOVERED', payload: value }), [dispatch]);
    const setFocused = useCallback((value) => dispatch({ type: 'SET_FOCUSED', payload: value }), [dispatch]);
    const setPreviewing = useCallback((value) => dispatch({ type: 'SET_PREVIEWING', payload: value }), [dispatch]);
    return useMemo(() => ({
        handleError,
        handleLoad,
        handleDelete,
        handleAskAI,
        handleEdit,
        handleImageClick,
        handleKeyDown,
        handleEditorSave,
        handleEditorCancel,
        setHovered,
        setFocused,
        setPreviewing,
    }), [
        handleError,
        handleLoad,
        handleDelete,
        handleAskAI,
        handleEdit,
        handleImageClick,
        handleKeyDown,
        handleEditorSave,
        handleEditorCancel,
        setHovered,
        setFocused,
        setPreviewing,
    ]);
}
