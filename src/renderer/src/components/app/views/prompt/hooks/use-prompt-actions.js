import { useCallback, useMemo } from 'react';
import { TextSelection } from '@tiptap/pm/state';
function readFileAsDataUri(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`FileReader failed for ${file.name}`));
        reader.readAsDataURL(file);
    });
}
export function usePromptActions({ dispatch, editor, node, getPos, options, updateAttributes, prompt, fileInputRef, }) {
    const handlePromptChange = useCallback((value) => {
        dispatch({ type: 'SET_PROMPT', payload: value });
        if (node.attrs.prompt !== value) {
            updateAttributes({ prompt: value });
        }
    }, [dispatch, node.attrs.prompt, updateAttributes]);
    const addFile = useCallback((newFile) => {
        dispatch({ type: 'ADD_FILE', payload: newFile });
        readFileAsDataUri(newFile)
            .then((result) => {
            dispatch({ type: 'ADD_PREVIEW_URL', payload: result });
        })
            .catch(() => { });
    }, [dispatch]);
    const removeFile = useCallback((index) => {
        dispatch({ type: 'REMOVE_FILE', payload: index });
    }, [dispatch]);
    const handleFilesChange = useCallback((files) => {
        dispatch({ type: 'SET_FILES', payload: files });
    }, [dispatch]);
    const handleFileInputChange = useCallback((e) => {
        const selected = e.target.files;
        if (!selected)
            return;
        for (const file of Array.from(selected)) {
            if (file.type.startsWith('image/')) {
                addFile(file);
            }
        }
        e.target.value = '';
    }, [addFile]);
    const handleOpenFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef]);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_OVER', payload: true });
    }, [dispatch]);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_OVER', payload: false });
    }, [dispatch]);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_OVER', payload: false });
        for (const file of Array.from(e.dataTransfer.files)) {
            if (file.type.startsWith('image/')) {
                addFile(file);
            }
        }
    }, [addFile, dispatch]);
    const deleteNode = useCallback(() => {
        const pos = getPos();
        if (typeof pos !== 'number')
            return;
        const paragraph = editor.state.schema.nodes.paragraph;
        if (!paragraph) {
            editor
                .chain()
                .focus()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .run();
            return;
        }
        const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, Math.min(pos + 1, tr.doc.content.size)));
        editor.view.dispatch(tr.scrollIntoView());
        editor.view.focus();
    }, [editor, getPos, node.nodeSize]);
    const submit = useCallback(() => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            deleteNode();
            return;
        }
        updateAttributes({ loading: true });
        const { from, to } = editor.state.selection;
        const selectedText = from === to
            ? ''
            : (editor.markdown?.serialize(editor.state.doc.cut(from, to).toJSON()) ??
                editor.state.doc.textBetween(from, to, '\n\n'));
        options.onPromptSubmit({ prompt: trimmedPrompt, selectedText, files: [], editor });
    }, [editor, prompt, deleteNode, options, updateAttributes]);
    return useMemo(() => ({
        handlePromptChange,
        addFile,
        removeFile,
        handleFilesChange,
        handleFileInputChange,
        handleOpenFilePicker,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        deleteNode,
        submit,
    }), [
        handlePromptChange,
        addFile,
        removeFile,
        handleFilesChange,
        handleFileInputChange,
        handleOpenFilePicker,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        deleteNode,
        submit,
    ]);
}
