import { useState as useReactState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2, Loader2, X, Check, Plus } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import HistoryMenu from './components/HistoryMenu';
import DocumentInfoPopover from './components/DocumentInfoPopover';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useEditorInstance,
	useEditor,
	useContentReviewerTask,
	useContentWriterTask,
} from './hooks';
import type { TaskEvent } from '../../../../shared/types';
import type { PromptSubmitPayload } from '@/components/app/editor/types';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import Layout from './Layout';
import {
	PageContainer,
	PageHeader,
	PageHeaderTitle,
	PageHeaderDescription,
} from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import { ErrorDialog } from '@/components/app/dialogs';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;

function PageContent(): ReactElement {
	const { documentId: id } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { editor, setEditor } = useEditorInstance();

	const [title, setTitle] = useReactState('');
	const [content, setContent] = useReactState('');
	const [contentVersion, setContentVersion] = useReactState(0);
	const [loaded, setLoaded] = useReactState(false);

	const { openInsertContentDialog } = useInsertContentDialog();
	const { t } = useTranslation();

	const editorRef = useRef<EditorElement>(null);

	const stateRef = useRef({ title });
	stateRef.current = { title };

	const contentRef = useRef(content);
	contentRef.current = content;

	const loadedRef = useRef(loaded);
	loadedRef.current = loaded;

	const documentDeletedRef = useRef(false);

	useEffect(() => {
		if (!id) return;
		let cancelled = false;

		documentDeletedRef.current = false;
		setLoaded(false);
		setTitle('');
		setContent('');
		dispatch({ type: 'METADATA_UPDATED', metadata: null });

		async function load() {
			try {
				const [loadedContent, config] = await Promise.all([
					window.workspace.getDocumentContent(id!),
					window.workspace.getDocumentConfig(id!),
				]);

				if (cancelled) return;

				setTitle(config.title || '');
				setContent(loadedContent);

				setLoaded(true);
			} catch {
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
		if (!id) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== id) return;

			if (event.type === 'removed') {
				documentDeletedRef.current = true;
				navigate('/home', { replace: true });
			}
		});

		return unsubscribe;
	}, [id, navigate]);

	const debouncedMetadataSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					const { title: currentTitle } = stateRef.current;
					window.workspace.updateDocumentConfig(id, { title: currentTitle });
				},
				METADATA_SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[id]
	);

	const debouncedContentSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					window.workspace.updateDocumentContent(id, contentRef.current);
				},
				CONTENT_SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[id]
	);

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
	const [documentTaskState, setDocumentTaskState] = useState<string | null>(null);
	const [preexistingTaskContent, setPreexistingTaskContent] = useState<string | null>(null);
	const [preexistingTaskSelection, setPreexistingTaskSelection] = useState<{
		from: number;
		to: number;
	} | null>(null);
	const preexistingTaskActiveRef = useRef(false);
	preexistingTaskActiveRef.current = preexistingTaskActive;

	const handleMarkdownChanged = useCallback(
		(markdown: string) => {
			setContent(markdown);
			dispatch({ type: 'CONTENT_CHANGED', value: markdown });
			debouncedContentSave.cancel();
			if (id) window.workspace.updateDocumentContent(id, markdown);
		},
		[dispatch, debouncedContentSave, id]
	);

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

	const assistantIsRunning =
		reviewTask.isRunning ||
		writeTask.isRunning ||
		documentHasActiveTask ||
		preexistingTaskActive;

	useEffect(() => {
		if (!id) {
			setDocumentHasActiveTask(false);
			setPreexistingTaskActive(false);
			setDocumentTaskState(null);
			setPreexistingTaskContent(null);
			setPreexistingTaskSelection(null);
			return;
		}
		if (typeof window.task?.list !== 'function') return;

		let cancelled = false;
		setDocumentHasActiveTask(false);
		setPreexistingTaskActive(false);
		setDocumentTaskState(null);
		setPreexistingTaskContent(null);
		setPreexistingTaskSelection(null);

		window.task.list().then((res) => {
			if (cancelled || !res.success) return;

			const activeTask = res.data.find(
				(t) =>
					t.metadata?.documentId === id &&
					(t.status === 'queued' || t.status === 'started' || t.status === 'running')
			);
			const finishedTask = activeTask
				? undefined
				: res.data.find(
					(t) => t.metadata?.documentId === id && t.status === 'finished'
				);
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
		if (!id) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.metadata.documentId !== id) return;
			if (event.state === 'queued' || event.state === 'started' || event.state === 'running') {
				setDocumentHasActiveTask(true);
				if (preexistingTaskActiveRef.current) {
					setDocumentTaskState(event.state);
				}
			} else if (event.state === 'cancelled') {
				setDocumentHasActiveTask(false);
				setPreexistingTaskActive(false);
				setDocumentTaskState(null);
				setPreexistingTaskContent(null);
				setPreexistingTaskSelection(null);
			} else if (event.state === 'finished') {
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
					const stillActiveTask = res.data.find(
						(t) =>
							t.metadata?.documentId === id &&
							(t.status === 'queued' || t.status === 'started' || t.status === 'running')
					);
					setDocumentHasActiveTask(!!stillActiveTask);
				});
			}
		});
	}, [id]);


	const handleHistoryRestore = useCallback(
		(restoredContent: string, restoredTitle: string) => {
			setContent(restoredContent);
			setContentVersion((v) => v + 1);
			dispatch({ type: 'CONTENT_CHANGED', value: restoredContent });
			debouncedContentSave();
			setTitle(restoredTitle);
			debouncedMetadataSave();
		},
		[dispatch, debouncedContentSave, debouncedMetadataSave]
	);

	const {
		entries: historyEntries,
		currentEntryId: currentHistoryEntryId,
		restoreEntry: handleRestoreHistoryEntry,
		returnToLive: handleReturnToLive,
	} = useDocumentHistory({
		documentId: id,
		content,
		title,
		loaded,
		onRestore: handleHistoryRestore,
	});

	const handleUndo = useCallback(() => {
		editor?.chain().focus().undo().run();
	}, [editor]);

	const handleRedo = useCallback(() => {
		editor?.chain().focus().redo().run();
	}, [editor]);

	// TipTap state changes do not trigger React renders on their own; subscribe
	// to transactions so the Undo/Redo disabled states stay in sync.
	const [, forceRender] = useReactState(0);
	useEffect(() => {
		if (!editor) return;
		const bump = (): void => forceRender((n) => (n + 1) % 1_000_000);
		editor.on('transaction', bump);
		return () => {
			editor.off('transaction', bump);
		};
	}, [editor]);

	const canUndo = editor?.can().undo() ?? false;
	const canRedo = editor?.can().redo() ?? false;

	const handleTitleChange = useCallback(
		(value: string) => {
			setTitle(value);
			debouncedMetadataSave();
		},
		[debouncedMetadataSave]
	);

	useEffect(() => {
		if (!id || !loaded) return;
		appDispatch(documentMetadataPatched({ id, title, updatedAt: Date.now() }));
	}, [id, title, loaded, appDispatch]);

	const handleContentChange = useCallback(
		(newContent: string) => {
			setContent(newContent);
			dispatch({ type: 'CONTENT_CHANGED', value: newContent });
			if (aiTasksRunningRef.current) return;
			debouncedContentSave();
		},
		[dispatch, debouncedContentSave]
	);

	const handleSelectionChange = useCallback(
		(selection: { from: number; to: number } | null) => {
			dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
		},
		[dispatch]
	);

	const handleEditorReady = useCallback(
		(editor: TiptapEditor | null) => {
			setEditor(editor);
		},
		[setEditor]
	);

	const handleInsertContent = useCallback(() => {
		openInsertContentDialog();
	}, [openInsertContentDialog]);

	const handleReviewPromptSubmit = useCallback(
		(payload: PromptSubmitPayload) => {
			void reviewTask.submit(payload);
		},
		[reviewTask]
	);

	const handleWritePromptSubmit = useCallback(
		(payload: PromptSubmitPayload) => {
			void writeTask.submit(payload);
		},
		[writeTask]
	);

	const handleCancelPreexistingTask = useCallback(async () => {
		if (!id) return;
		if (typeof window.task?.list !== 'function') return;
		if (typeof window.task?.cancel !== 'function') return;

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
		if (!preexistingTaskContent) return;
		if (!editor || editor.isDestroyed) return;

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
		} else {
			const chain = editor.chain().focus();
			if (preexistingTaskSelection) {
				chain.insertContentAt({ from, to }, preexistingTaskContent);
			} else {
				chain.insertContent(preexistingTaskContent);
			}
			chain.run();
		}

		await handleCancelPreexistingTask();
	}, [preexistingTaskContent, preexistingTaskSelection, editor, handleCancelPreexistingTask]);

	return (
		<PageContainer>
			<div className="flex-1 min-h-0">
				<div className="flex h-full flex-col">
						<PageHeader>
							<PageHeaderTitle>
								<Input
									type="text"
									value={title}
									onChange={(e) => handleTitleChange(e.target.value)}
									placeholder={t('writing.titlePlaceholder')}
									className="text-md! font-medium border-0 bg-transparent dark:bg-transparent rounded-none p-0 tracking-tight focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
								/>
								<Button
									variant="ghost"
									size="icon"
									title="Undo"
									aria-label="Undo"
									onClick={handleUndo}
									disabled={!canUndo}
								>
									<Undo2 aria-hidden="true" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									title="Redo"
									aria-label="Redo"
									onClick={handleRedo}
									disabled={!canRedo}
								>
									<Redo2 aria-hidden="true" />
								</Button>
								<HistoryMenu
									entries={historyEntries}
									currentEntryId={currentHistoryEntryId}
									onRestoreEntry={handleRestoreHistoryEntry}
									onReturnToLive={handleReturnToLive}
								/>
								<DocumentInfoPopover documentId={id ?? null} title={title} content={content} />
							</PageHeaderTitle>
							{preexistingTaskActive && (
								<PageHeaderDescription>
									{documentTaskState === 'finished' ? (
										<Check className="size-4" aria-hidden="true" />
									) : (
										<Loader2 className="size-4 animate-spin" aria-hidden="true" />
									)}
									<span>
										{documentTaskState === 'queued'
											? 'Task queued, waiting to start…'
											: documentTaskState === 'started'
												? 'Task started, preparing…'
												: documentTaskState === 'running'
													? 'Task running, generating content…'
													: documentTaskState === 'finished'
														? 'Task finished.'
														: 'Task in progress…'}
									</span>
									{documentTaskState && (
										<span className="text-xs uppercase tracking-wide opacity-70">
											{documentTaskState}
										</span>
									)}
									<Button
										title="Insert"
										aria-label="Insert"
										onClick={handleInsertTaskContent}
										disabled={documentTaskState !== 'finished' || !preexistingTaskContent}
									>
										<Plus aria-hidden="true" />
										Insert
									</Button>
									<Button
										title="Cancel task"
										aria-label="Cancel task"
										onClick={handleCancelPreexistingTask}
									>
										<X aria-hidden="true" />
										Cancel
									</Button>
								</PageHeaderDescription>
							)}
						</PageHeader>
						<PageBody className="p-0">
							{loaded && (
								<Editor
									key={id}
									disabled={assistantIsRunning}
									ref={editorRef}
									value={content}
									externalValueVersion={contentVersion}
									onChange={handleContentChange}
									onSelectionChange={handleSelectionChange}
									onReviewPromptSubmit={handleReviewPromptSubmit}
									onWritePromptSubmit={handleWritePromptSubmit}
									onInsertContent={handleInsertContent}
									onEditorReady={handleEditorReady}
								/>
							)}
						</PageBody>
				</div>
			</div>
			<ErrorDialog
				open={reviewTask.taskError !== null || writeTask.taskError !== null}
				onOpenChange={(open) => {
					if (!open) {
						reviewTask.dismissTaskError();
						writeTask.dismissTaskError();
					}
				}}
				description={reviewTask.taskError ?? writeTask.taskError ?? ''}
			/>
		</PageContainer>
	);
}

function extractTaskSelection(value: unknown): { from: number; to: number } | null {
	if (!value || typeof value !== 'object') return null;
	const v = value as { from?: unknown; to?: unknown };
	if (typeof v.from !== 'number' || typeof v.to !== 'number') return null;
	return { from: v.from, to: v.to };
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
