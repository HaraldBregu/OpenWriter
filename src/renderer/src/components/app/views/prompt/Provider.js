import { jsx as _jsx } from "react/jsx-runtime";
import { useReducer, useRef, useMemo, useCallback, useEffect } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { contentGeneratorReducer } from './context/reducer';
import { usePromptActions, useTextareaSetup } from './hooks';
const DEFAULT_IMAGE_MODEL = {
    providerId: 'openai',
    modelId: 'gpt-image-1',
    name: 'GPT Image 1',
    type: 'image',
    contextWindow: null,
    maxOutputTokens: null,
};
const DEFAULT_TEXT_MODEL = {
    providerId: 'openai',
    modelId: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    type: 'multimodal',
    contextWindow: 400000,
    maxOutputTokens: 128000,
};
import { Context } from './context';
export function Provider({ nodeViewProps, children }) {
    const { editor, node, getPos, extension, updateAttributes } = nodeViewProps;
    const loading = node.attrs.loading;
    const enable = node.attrs.enable;
    const statusBarVisible = node.attrs.statusBarVisible ?? false;
    const statusBarMessage = node.attrs.statusBarMessage ?? '';
    const options = extension.options;
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [state, dispatch] = useReducer(contentGeneratorReducer, undefined, () => ({
        prompt: node.attrs.prompt ?? '',
        files: node.attrs.files ?? [],
        previewUrls: [],
        isDragOver: false,
        selectedImageModel: DEFAULT_IMAGE_MODEL,
        selectedTextModel: DEFAULT_TEXT_MODEL,
        selection: '',
    }));
    const nodeFiles = node.attrs.files ?? null;
    useEffect(() => {
        if (nodeFiles !== state.files) {
            updateAttributes({ files: state.files });
        }
    }, [state.files, nodeFiles, updateAttributes]);
    const setSelection = useCallback((value) => {
        dispatch({ type: 'SET_SELECTION', payload: value });
    }, []);
    const clearSelection = useCallback(() => {
        if (editor.isDestroyed)
            return;
        const { from, to } = editor.state.selection;
        if (from === to)
            return;
        const docSize = editor.state.doc.content.size;
        const collapsePos = Math.max(0, Math.min(to, docSize));
        const nextSelection = TextSelection.near(editor.state.doc.resolve(collapsePos), -1);
        const tr = editor.state.tr.setSelection(nextSelection);
        editor.view.dispatch(tr);
    }, [editor]);
    const nodePrompt = node.attrs.prompt ?? '';
    useEffect(() => {
        if (state.prompt !== nodePrompt) {
            dispatch({ type: 'SET_PROMPT', payload: nodePrompt });
        }
    }, [nodePrompt, state.prompt]);
    useEffect(() => {
        const emit = () => {
            const { from, to } = editor.state.selection;
            const text = from === to ? '' : editor.state.doc.textBetween(from, to, ' ');
            setSelection(text);
        };
        emit();
        editor.on('selectionUpdate', emit);
        return () => {
            editor.off('selectionUpdate', emit);
        };
    }, [editor, setSelection]);
    const actions = usePromptActions({
        dispatch,
        editor,
        node,
        getPos,
        options,
        updateAttributes,
        prompt: state.prompt,
        fileInputRef,
    });
    const { submitRef, resizeTextarea } = useTextareaSetup({
        textareaRef,
        onSubmit: actions.submit,
        onDelete: actions.deleteNode,
    });
    const isSubmitDisabled = !enable || loading || !state.prompt.trim();
    const value = useMemo(() => ({
        state,
        loading,
        enable,
        statusBarVisible,
        statusBarMessage,
        isSubmitDisabled,
        textareaRef,
        fileInputRef,
        submitRef,
        ...actions,
        setSelection,
        clearSelection,
        resizeTextarea,
    }), [
        state,
        loading,
        enable,
        statusBarVisible,
        statusBarMessage,
        isSubmitDisabled,
        submitRef,
        actions,
        setSelection,
        clearSelection,
        resizeTextarea,
    ]);
    return _jsx(Context.Provider, { value: value, children: children });
}
