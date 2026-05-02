import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Slice } from '@tiptap/pm/model';
import { createExtensions } from './extensions/extensions';
import { BubbleMenu } from './components/BubbleMenu';
import { OptionMenu } from './components/OptionMenu';
import Layout from './Layout';
const Editor = React.memo(React.forwardRef(({ value, onChange, onSelectionChange, externalValueVersion = 0, className, disabled, id, onReviewPromptSubmit, onWritePromptSubmit, onUndo, onRedo, onEditorReady, documentBasePath = null, }, ref) => {
    const onChangeRef = useRef(onChange);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onReviewPromptSubmitRef = useRef(onReviewPromptSubmit);
    const onWritePromptSubmitRef = useRef(onWritePromptSubmit);
    const onUndoRef = useRef(onUndo);
    const onRedoRef = useRef(onRedo);
    const onEditorReadyRef = useRef(onEditorReady);
    useEffect(() => {
        onChangeRef.current = onChange;
        onSelectionChangeRef.current = onSelectionChange;
        onReviewPromptSubmitRef.current = onReviewPromptSubmit;
        onWritePromptSubmitRef.current = onWritePromptSubmit;
        onUndoRef.current = onUndo;
        onRedoRef.current = onRedo;
        onEditorReadyRef.current = onEditorReady;
    });
    const extensions = useMemo(() => createExtensions({
        onPromptSubmit: (payload) => onWritePromptSubmitRef.current?.(payload),
        onImageInsert: () => undefined,
        onUndo: () => onUndoRef.current?.(),
        onRedo: () => onRedoRef.current?.(),
    }), []);
    const lastEmittedRef = useRef('');
    const lastExternalValueVersionRef = useRef(externalValueVersion);
    const emitTimerRef = useRef(null);
    const initialValueRef = useRef(value);
    useEffect(() => {
        return () => {
            if (emitTimerRef.current)
                clearTimeout(emitTimerRef.current);
        };
    }, []);
    const editorOptions = useMemo(() => ({
        extensions,
        content: '',
        immediatelyRender: false,
        onCreate: ({ editor: ed }) => {
            const initial = initialValueRef.current;
            if (!initial)
                return;
            queueMicrotask(() => {
                if (ed.isDestroyed)
                    return;
                ed.commands.setContent(initial, {
                    emitUpdate: false,
                    contentType: 'markdown',
                });
            });
        },
        onUpdate: ({ editor: ed, transaction, }) => {
            if (transaction.getMeta('preventEditorUpdate'))
                return;
            if (emitTimerRef.current)
                clearTimeout(emitTimerRef.current);
            emitTimerRef.current = setTimeout(() => {
                if (ed.isDestroyed)
                    return;
                const md = ed.getMarkdown();
                lastEmittedRef.current = md;
                onChangeRef.current(md);
            }, 100);
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words [&_p]:mb-4 [&_p:last-child]:mb-0 [&_hr]:my-4 [&_hr]:border-border',
            },
        },
    }), [extensions]);
    const editor = useEditor(editorOptions, []);
    useEffect(() => {
        if (!editor || editor.isDestroyed)
            return;
        onEditorReadyRef.current?.(editor);
        return () => {
            onEditorReadyRef.current?.(null);
        };
    }, [editor]);
    useEffect(() => {
        if (!editor || editor.isDestroyed)
            return;
        const emitSelection = () => {
            const { from, to } = editor.state.selection;
            onSelectionChangeRef.current?.({ from, to });
        };
        emitSelection();
        editor.on('selectionUpdate', emitSelection);
        return () => {
            editor.off('selectionUpdate', emitSelection);
        };
    }, [editor]);
    const rootRef = useRef(null);
    useImperativeHandle(ref, () => {
        const el = rootRef.current;
        return Object.assign(el, {
            setContent(markdown, options = {
                preventEditorUpdate: false,
            }) {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.setContent(markdown, {
                    emitUpdate: !(options.preventEditorUpdate ?? false),
                    contentType: 'markdown',
                });
            },
            insertText(text, options = {
                preventEditorUpdate: false,
            }) {
                if (!editor || editor.isDestroyed)
                    return;
                const { from } = editor.state.selection;
                const tr = editor.state.tr
                    .insertText(text, from)
                    .setMeta('preventEditorUpdate', options?.preventEditorUpdate);
                editor.view.dispatch(tr);
            },
            deleteText(from, to, options = {}) {
                if (!editor || editor.isDestroyed)
                    return;
                const tr = editor.state.tr
                    .delete(from, to)
                    .setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
                editor.view.dispatch(tr);
            },
            insertMarkdown(markdown, options = {}) {
                if (!editor || editor.isDestroyed)
                    return;
                const from = options.from ?? editor.state.selection.from;
                const to = editor.state.doc.content.size;
                const json = editor.markdown?.parse(markdown);
                if (!json)
                    return;
                const doc = editor.schema.nodeFromJSON(json);
                const slice = new Slice(doc.content, 0, 0);
                const tr = editor.state.tr
                    .replace(from, to, slice)
                    .setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
                editor.view.dispatch(tr);
            },
            insertMarkdownText(markdown, options = {}) {
                if (!editor || editor.isDestroyed)
                    return;
                const from = options.from ?? editor.state.selection.from;
                const to = options.to ?? from;
                const json = editor.markdown?.parse(markdown);
                if (!json)
                    return;
                const doc = editor.schema.nodeFromJSON(json);
                const slice = new Slice(doc.content, 0, 0);
                const tr = editor.state.tr
                    .replaceRange(from, to, slice)
                    .setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
                editor.view.dispatch(tr);
            },
            setSearch(query) {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.setSearch(query);
            },
            clearSearch() {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.clearSearch();
            },
            removeAssistant() {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.removePromptView();
            },
            setAssistantLoading(loading) {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.setPromptViewState({ loading });
            },
            setAssistantEnable(enable) {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.setPromptViewState({ enable });
            },
            insertPromptView() {
                if (!editor || editor.isDestroyed)
                    return;
                const endPos = editor.state.doc.content.size;
                editor.chain().focus(endPos).insertPromptView().run();
            },
            splitBlock() {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.splitBlock();
            },
            setHeading(level) {
                if (!editor || editor.isDestroyed)
                    return;
                editor.commands.setHeading({ level });
            },
            ensureBulletList() {
                if (!editor || editor.isDestroyed)
                    return;
                if (!editor.isActive('bulletList')) {
                    editor.commands.toggleBulletList();
                }
            },
            ensureOrderedList() {
                if (!editor || editor.isDestroyed)
                    return;
                if (!editor.isActive('orderedList')) {
                    editor.commands.toggleOrderedList();
                }
            },
            exitList() {
                if (!editor || editor.isDestroyed)
                    return;
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                    editor.commands.liftListItem('listItem');
                }
            },
        });
    }, [editor]);
    useEffect(() => {
        if (!editor || editor.isDestroyed)
            return;
        const hasExternalValueVersionChanged = lastExternalValueVersionRef.current !== externalValueVersion;
        if (!hasExternalValueVersionChanged && value === lastEmittedRef.current) {
            return;
        }
        lastExternalValueVersionRef.current = externalValueVersion;
        const current = editor.getMarkdown();
        const incoming = value || '';
        if (current !== incoming) {
            queueMicrotask(() => {
                if (editor.isDestroyed)
                    return;
                editor.commands.setContent(incoming, {
                    emitUpdate: false,
                    contentType: 'markdown',
                });
            });
        }
    }, [value, editor, externalValueVersion]);
    useEffect(() => {
        if (!editor || editor.isDestroyed)
            return;
        editor.setEditable(!disabled);
    }, [editor, disabled]);
    useEffect(() => {
        if (!editor || editor.isDestroyed)
            return;
        const storage = editor.storage;
        if (storage.image)
            storage.image.documentBasePath = documentBasePath;
    }, [editor, documentBasePath]);
    const handleAiAction = useCallback((payload) => {
        onReviewPromptSubmitRef.current?.(payload);
    }, []);
    return (_jsxs(Layout, { id: id, className: className, ref: rootRef, editor: editor, children: [editor && (_jsxs(_Fragment, { children: [_jsx(BubbleMenu, { onPromptSubmit: handleAiAction }), _jsx(OptionMenu, {})] })), _jsx(EditorContent, { editor: editor })] }));
}));
Editor.displayName = 'Editor';
export { Editor };
