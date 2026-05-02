import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState as useReactState, useCallback, useMemo, useEffect, useRef, } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2, Loader2, X, Check, Plus, Download, Search, Sparkles } from 'lucide-react';
import { Slice } from '@tiptap/pm/model';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger, } from '@/components/ui/Popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/InputGroup';
import HistoryMenu from './components/HistoryMenu';
import DocumentSettings from './components/DocumentSettings';
import { useDispatch, useHistory, useState, useEditorInstance, useEditor, useContentReviewerTask, useContentWriterTask, } from './hooks';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderTitle, PageHeaderDescription, } from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import { Editor } from '@/components/app/editor/Editor';
import { ErrorDialog } from '@/components/app/dialogs';
const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;
function PageContent() {
    const { documentId: id } = useState();
    const dispatch = useDispatch();
    const appDispatch = useAppDispatch();
    const navigate = useNavigate();
    const { editor, setEditor } = useEditorInstance();
    const [title, setTitle] = useReactState('');
    const [content, setContent] = useReactState('');
    const [contentVersion, setContentVersion] = useReactState(0);
    const [loaded, setLoaded] = useReactState(false);
    const [documentBasePath, setDocumentBasePath] = useReactState(null);
    const { t } = useTranslation();
    const editorRef = useRef(null);
    const stateRef = useRef({ title });
    stateRef.current = { title };
    const contentRef = useRef(content);
    contentRef.current = content;
    const loadedRef = useRef(loaded);
    loadedRef.current = loaded;
    const documentDeletedRef = useRef(false);
    useEffect(() => {
        if (!id)
            return;
        let cancelled = false;
        documentDeletedRef.current = false;
        setLoaded(false);
        setTitle('');
        setContent('');
        setDocumentBasePath(null);
        dispatch({ type: 'METADATA_UPDATED', metadata: null });
        async function load() {
            try {
                const [loadedContent, config, docPath] = await Promise.all([
                    window.workspace.getDocumentContent(id),
                    window.workspace.getDocumentConfig(id),
                    window.workspace.getDocumentPath(id),
                ]);
                if (cancelled)
                    return;
                setTitle(config.title || '');
                setContent(loadedContent);
                setDocumentBasePath(docPath);
                setLoaded(true);
            }
            catch {
                if (!cancelled) {
                    documentDeletedRef.current = true;
                    setLoaded(true);
                    navigate('/home', { replace: true });
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id, dispatch, navigate]);
    useEffect(() => {
        if (!id)
            return;
        const unsubscribe = window.workspace.onOutputFileChange((event) => {
            if (event.outputType !== 'documents' || event.fileId !== id)
                return;
            if (event.type === 'removed') {
                documentDeletedRef.current = true;
                navigate('/home', { replace: true });
            }
        });
        return unsubscribe;
    }, [id, navigate]);
    const debouncedMetadataSave = useMemo(() => debounce(() => {
        if (!id || !loadedRef.current || documentDeletedRef.current)
            return;
        const { title: currentTitle } = stateRef.current;
        window.workspace.updateDocumentConfig(id, { title: currentTitle });
    }, METADATA_SAVE_DEBOUNCE_MS, { leading: false, trailing: true }), [id]);
    const debouncedContentSave = useMemo(() => debounce(() => {
        if (!id || !loadedRef.current || documentDeletedRef.current)
            return;
        window.workspace.updateDocumentContent(id, contentRef.current);
    }, CONTENT_SAVE_DEBOUNCE_MS, { leading: false, trailing: true }), [id]);
    useEffect(() => {
        return () => {
            if (!documentDeletedRef.current) {
                debouncedMetadataSave.flush();
                if (!aiTasksRunningRef.current) {
                    debouncedContentSave.flush();
                }
            }
            debouncedMetadataSave.cancel();
            debouncedContentSave.cancel();
        };
    }, [debouncedMetadataSave, debouncedContentSave]);
    const editorActions = useEditor(editorRef);
    const editorActionsRef = useRef(editorActions);
    editorActionsRef.current = editorActions;
    const [documentHasActiveTask, setDocumentHasActiveTask] = useReactState(false);
    const [preexistingTaskActive, setPreexistingTaskActive] = useReactState(false);
    const [documentTaskState, setDocumentTaskState] = useReactState(null);
    const [preexistingTaskContent, setPreexistingTaskContent] = useReactState(null);
    const [preexistingTaskSelection, setPreexistingTaskSelection] = useReactState(null);
    const preexistingTaskActiveRef = useRef(false);
    preexistingTaskActiveRef.current = preexistingTaskActive;
    const handleMarkdownChanged = useCallback((markdown) => {
        setContent(markdown);
        dispatch({ type: 'CONTENT_CHANGED', value: markdown });
        debouncedContentSave.cancel();
        if (id)
            window.workspace.updateDocumentContent(id, markdown);
    }, [dispatch, debouncedContentSave, id]);
    const reviewTask = useContentReviewerTask({
        documentId: id ?? null,
        editor,
        onMarkdownChanged: handleMarkdownChanged,
    });
    const writeTask = useContentWriterTask({
        documentId: id ?? null,
        editor,
        onMarkdownChanged: handleMarkdownChanged,
    });
    const aiTasksRunningRef = useRef(reviewTask.isRunning || writeTask.isRunning);
    aiTasksRunningRef.current = reviewTask.isRunning || writeTask.isRunning;
    const assistantIsRunning = reviewTask.isRunning || writeTask.isRunning || documentHasActiveTask || preexistingTaskActive;
    useEffect(() => {
        if (!id) {
            setDocumentHasActiveTask(false);
            setPreexistingTaskActive(false);
            setDocumentTaskState(null);
            setPreexistingTaskContent(null);
            setPreexistingTaskSelection(null);
            return;
        }
        if (typeof window.task?.list !== 'function')
            return;
        let cancelled = false;
        setDocumentHasActiveTask(false);
        setPreexistingTaskActive(false);
        setDocumentTaskState(null);
        setPreexistingTaskContent(null);
        setPreexistingTaskSelection(null);
        window.task.list().then((res) => {
            if (cancelled || !res.success)
                return;
            const activeTask = res.data.find((t) => t.metadata?.documentId === id &&
                (t.status === 'queued' || t.status === 'started' || t.status === 'running'));
            const finishedTask = activeTask
                ? undefined
                : res.data.find((t) => t.metadata?.documentId === id && t.status === 'finished');
            const displayTask = activeTask ?? finishedTask;
            setDocumentHasActiveTask(!!activeTask);
            setPreexistingTaskActive(!!displayTask);
            setDocumentTaskState(displayTask?.status ?? null);
            setPreexistingTaskContent(finishedTask?.data ?? null);
            setPreexistingTaskSelection(extractTaskSelection(displayTask?.metadata?.selection));
        });
        return () => {
            cancelled = true;
        };
    }, [id]);
    useEffect(() => {
        if (!id)
            return;
        if (typeof window.task?.onEvent !== 'function')
            return;
        return window.task.onEvent((event) => {
            if (event.metadata.documentId !== id)
                return;
            if (event.state === 'queued' || event.state === 'started' || event.state === 'running') {
                setDocumentHasActiveTask(true);
                if (preexistingTaskActiveRef.current) {
                    setDocumentTaskState(event.state);
                }
            }
            else if (event.state === 'cancelled') {
                setDocumentHasActiveTask(false);
                setPreexistingTaskActive(false);
                setDocumentTaskState(null);
                setPreexistingTaskContent(null);
                setPreexistingTaskSelection(null);
            }
            else if (event.state === 'finished') {
                if (preexistingTaskActiveRef.current) {
                    setDocumentTaskState('finished');
                    setPreexistingTaskContent(event.data.success ? event.data.data : null);
                    setPreexistingTaskSelection(extractTaskSelection(event.metadata?.selection));
                }
                if (typeof window.task?.list !== 'function') {
                    setDocumentHasActiveTask(false);
                    return;
                }
                window.task.list().then((res) => {
                    if (!res.success) {
                        setDocumentHasActiveTask(false);
                        return;
                    }
                    const stillActiveTask = res.data.find((t) => t.metadata?.documentId === id &&
                        (t.status === 'queued' || t.status === 'started' || t.status === 'running'));
                    setDocumentHasActiveTask(!!stillActiveTask);
                });
            }
        });
    }, [id]);
    const handleHistoryRestore = useCallback((restoredContent, restoredTitle) => {
        setContent(restoredContent);
        setContentVersion((v) => v + 1);
        dispatch({ type: 'CONTENT_CHANGED', value: restoredContent });
        debouncedContentSave();
        setTitle(restoredTitle);
        debouncedMetadataSave();
    }, [dispatch, debouncedContentSave, debouncedMetadataSave]);
    const { entries: historyEntries, currentEntryId: currentHistoryEntryId, canUndo, canRedo, undo: handleUndo, redo: handleRedo, restoreEntry: handleRestoreHistoryEntry, returnToLive: handleReturnToLive, } = useHistory({
        documentId: id,
        content,
        title,
        loaded,
        onRestore: handleHistoryRestore,
    });
    const handleTitleChange = useCallback((value) => {
        setTitle(value);
        debouncedMetadataSave();
    }, [debouncedMetadataSave]);
    useEffect(() => {
        if (!id || !loaded)
            return;
        appDispatch(documentMetadataPatched({ id, title, updatedAt: Date.now() }));
    }, [id, title, loaded, appDispatch]);
    const handleContentChange = useCallback((newContent) => {
        setContent(newContent);
        dispatch({ type: 'CONTENT_CHANGED', value: newContent });
        if (aiTasksRunningRef.current)
            return;
        debouncedContentSave();
    }, [dispatch, debouncedContentSave]);
    const handleSelectionChange = useCallback((selection) => {
        dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
    }, [dispatch]);
    const handleEditorReady = useCallback((editor) => {
        setEditor(editor);
    }, [setEditor]);
    const handleReviewPromptSubmit = useCallback((payload) => {
        void reviewTask.submit(payload);
    }, [reviewTask]);
    const handleWritePromptSubmit = useCallback((payload) => {
        void writeTask.submit(payload);
    }, [writeTask]);
    const handleCancelPreexistingTask = useCallback(async () => {
        if (!id)
            return;
        if (typeof window.task?.list !== 'function')
            return;
        if (typeof window.task?.cancel !== 'function')
            return;
        const listRes = await window.task.list();
        const task = listRes.success
            ? listRes.data.find((t) => t.metadata?.documentId === id)
            : undefined;
        if (task) {
            await window.task.cancel(task.taskId);
        }
        setDocumentHasActiveTask(false);
        setPreexistingTaskActive(false);
        setDocumentTaskState(null);
        setPreexistingTaskContent(null);
        setPreexistingTaskSelection(null);
    }, [id]);
    const handleInsertTaskContent = useCallback(async () => {
        if (!preexistingTaskContent)
            return;
        if (!editor || editor.isDestroyed)
            return;
        const json = editor.markdown?.parse(preexistingTaskContent);
        const docSize = editor.state.doc.content.size;
        const fallbackFrom = editor.state.selection.from;
        const fallbackTo = editor.state.selection.to;
        const from = Math.min(preexistingTaskSelection?.from ?? fallbackFrom, docSize);
        const to = Math.min(preexistingTaskSelection?.to ?? fallbackTo, docSize);
        if (json) {
            const node = editor.schema.nodeFromJSON(json);
            const slice = new Slice(node.content, 0, 0);
            const tr = editor.state.tr.replaceRange(from, to, slice);
            editor.view.dispatch(tr);
            editor.view.focus();
        }
        else {
            const chain = editor.chain().focus();
            if (preexistingTaskSelection) {
                chain.insertContentAt({ from, to }, preexistingTaskContent);
            }
            else {
                chain.insertContent(preexistingTaskContent);
            }
            chain.run();
        }
        await handleCancelPreexistingTask();
    }, [preexistingTaskContent, preexistingTaskSelection, editor, handleCancelPreexistingTask]);
    return (_jsxs(PageContainer, { children: [_jsxs(PageHeader, { children: [_jsxs(PageHeaderTitle, { children: [_jsx(Input, { type: "text", value: title, onChange: (e) => handleTitleChange(e.target.value), placeholder: t('writing.titlePlaceholder'), className: "text-md! font-medium border-0 bg-transparent dark:bg-transparent rounded-none p-0 tracking-tight focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", title: "Undo", "aria-label": "Undo", onClick: handleUndo, disabled: !canUndo, children: _jsx(Undo2, { "aria-hidden": "true" }) }), _jsx(Button, { variant: "ghost", size: "icon", title: "Redo", "aria-label": "Redo", onClick: handleRedo, disabled: !canRedo, children: _jsx(Redo2, { "aria-hidden": "true" }) }), _jsx(HistoryMenu, { entries: historyEntries, currentEntryId: currentHistoryEntryId, onRestoreEntry: handleRestoreHistoryEntry, onReturnToLive: handleReturnToLive }), _jsx(Separator, { orientation: "vertical", className: "mx-1 h-5 self-center" }), _jsx(Button, { variant: "ghost", size: "icon", title: "Download", "aria-label": "Download", children: _jsx(Download, { "aria-hidden": "true" }) }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", title: "Search", "aria-label": "Search", children: _jsx(Search, { "aria-hidden": "true" }) }) }), _jsxs(PopoverContent, { align: "end", className: "w-80 p-0", children: [_jsx(PopoverHeader, { className: "px-4 py-3 border-b", children: _jsx(PopoverTitle, { children: "Search" }) }), _jsx("div", { className: "p-4", children: _jsxs(InputGroup, { children: [_jsx(InputGroupAddon, { children: _jsx(Search, { "aria-hidden": "true" }) }), _jsx(InputGroupInput, { placeholder: "Search in document..." })] }) }), _jsx("div", { className: "flex items-center justify-end gap-2 border-t bg-muted/50 px-4 py-2 rounded-b-md", children: _jsx("span", { className: "text-xs text-muted-foreground", children: "0 results" }) })] })] }), _jsx(Button, { variant: "ghost", size: "icon", title: "Sparkles", "aria-label": "Sparkles", children: _jsx(Sparkles, { "aria-hidden": "true" }) }), _jsx(DocumentSettings, { documentId: id ?? null, title: title, content: content })] })] }), preexistingTaskActive && (_jsxs(PageHeaderDescription, { children: [documentTaskState === 'finished' ? (_jsx(Check, { className: "size-4", "aria-hidden": "true" })) : (_jsx(Loader2, { className: "size-4 animate-spin", "aria-hidden": "true" })), _jsx("span", { children: documentTaskState === 'queued'
                                    ? 'Task queued, waiting to start…'
                                    : documentTaskState === 'started'
                                        ? 'Task started, preparing…'
                                        : documentTaskState === 'running'
                                            ? 'Task running, generating content…'
                                            : documentTaskState === 'finished'
                                                ? 'Task finished.'
                                                : 'Task in progress…' }), documentTaskState && (_jsx("span", { className: "text-xs uppercase tracking-wide opacity-70", children: documentTaskState })), _jsxs(Button, { title: "Insert", "aria-label": "Insert", onClick: handleInsertTaskContent, disabled: documentTaskState !== 'finished' || !preexistingTaskContent, children: [_jsx(Plus, { "aria-hidden": "true" }), "Insert"] }), _jsxs(Button, { title: "Cancel task", "aria-label": "Cancel task", onClick: handleCancelPreexistingTask, children: [_jsx(X, { "aria-hidden": "true" }), "Cancel"] })] }))] }), _jsx(PageBody, { className: "p-0", children: loaded && (_jsx(Editor, { disabled: assistantIsRunning, ref: editorRef, value: content, externalValueVersion: contentVersion, onChange: handleContentChange, onSelectionChange: handleSelectionChange, onReviewPromptSubmit: handleReviewPromptSubmit, onWritePromptSubmit: handleWritePromptSubmit, onUndo: handleUndo, onRedo: handleRedo, onEditorReady: handleEditorReady, documentBasePath: documentBasePath }, id)) }), _jsx(ErrorDialog, { open: reviewTask.taskError !== null || writeTask.taskError !== null, onOpenChange: (open) => {
                    if (!open) {
                        reviewTask.dismissTaskError();
                        writeTask.dismissTaskError();
                    }
                }, description: reviewTask.taskError ?? writeTask.taskError ?? '' })] }));
}
function extractTaskSelection(value) {
    if (!value || typeof value !== 'object')
        return null;
    const v = value;
    if (typeof v.from !== 'number' || typeof v.to !== 'number')
        return null;
    return { from: v.from, to: v.to };
}
export default function Page() {
    return (_jsx(Layout, { children: _jsx(PageContent, {}) }));
}
