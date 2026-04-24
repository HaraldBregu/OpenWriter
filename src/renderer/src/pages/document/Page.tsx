import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2, Loader2, X } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ExtensionPanel from './panels/extension/Panel';
import HistoryMenu from './components/HistoryMenu';
import DocumentInfoPopover from './components/DocumentInfoPopover';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useEditorInstance,
	useEditor,
	useEditorStreamInsert,
} from './hooks';
import { useSidebarVisibility } from '@/hooks/use-sidebar-visibility';
import type {
	ExtensionDocumentContextSnapshot,
	ExtensionDocPanelInfo,
	TaskEvent,
} from '../../../../shared/types';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import {
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
	PageHeaderDescription,
} from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import type { AssistantAction } from '@/components/app/editor/context/context';
import { PromptSubmitPayload } from '@shared/index';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;
const TASK_TYPE = 'demo';

function PageContent(): ReactElement {
	const { documentId: id, selection } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { editor, setEditor } = useEditorInstance();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [contentVersion, setContentVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [extensionDocPanels, setExtensionDocPanels] = useState<ExtensionDocPanelInfo[]>([]);
	const [editorContextVersion, setEditorContextVersion] = useState(0);

	const { activeSidebar, setActiveSidebar } = useSidebarVisibility();
	const { openInsertContentDialog } = useInsertContentDialog();
	const { t } = useTranslation();

	const editorRef = useRef<EditorElement>(null);
	const sidebarPanelRef = usePanelRef();

	useEffect(() => {
		if (activeSidebar) {
			sidebarPanelRef.current?.expand();
		} else {
			sidebarPanelRef.current?.collapse();
		}
	}, [activeSidebar, sidebarPanelRef]);

	const loadExtensionDocPanels = useCallback(async () => {
		if (!id) {
			setExtensionDocPanels([]);
			return;
		}

		try {
			const panels = await window.extensions.getDocPanels(id);
			setExtensionDocPanels(panels);
		} catch {
			setExtensionDocPanels([]);
		}
	}, [id]);

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

	const loadImages = useCallback(async () => {
		if (!id) {
			dispatch({ type: 'IMAGES_UPDATED', images: [] });
			return;
		}
		try {
			const result = await window.workspace.listDocumentImages(id);
			dispatch({ type: 'IMAGES_UPDATED', images: result });
		} catch {
			dispatch({ type: 'IMAGES_UPDATED', images: [] });
		}
	}, [id, dispatch]);

	useEffect(() => {
		loadImages();
	}, [loadImages]);

	useEffect(() => {
		void loadExtensionDocPanels();
	}, [loadExtensionDocPanels]);

	useEffect(() => {
		if (!editor || editor.isDestroyed) return;

		const bump = (): void => {
			setEditorContextVersion((current) => current + 1);
		};

		editor.on('selectionUpdate', bump);
		editor.on('transaction', bump);
		editor.on('focus', bump);
		editor.on('blur', bump);

		return () => {
			editor.off('selectionUpdate', bump);
			editor.off('transaction', bump);
			editor.off('focus', bump);
			editor.off('blur', bump);
		};
	}, [editor]);

	const extensionDocumentContext = useMemo<ExtensionDocumentContextSnapshot | null>(() => {
		if (!id || !editor || editor.isDestroyed) return null;
		return buildExtensionDocumentContext(id, content, selection, editor);
	}, [content, editor, editorContextVersion, id, selection]);

	const lastPublishedExtensionContextRef = useRef<string>('');
	useEffect(() => {
		if (!id || !extensionDocumentContext) return;

		const serialized = JSON.stringify(extensionDocumentContext);
		if (serialized === lastPublishedExtensionContextRef.current) {
			return;
		}

		const timer = window.setTimeout(() => {
			lastPublishedExtensionContextRef.current = serialized;
			void window.extensions.setDocumentContext(id, extensionDocumentContext);
		}, 120);

		return () => {
			window.clearTimeout(timer);
		};
	}, [extensionDocumentContext, id]);

	useEffect(() => {
		const unsubscribeRegistry = window.extensions.onRegistryChanged(() => {
			void loadExtensionDocPanels();
		});
		const unsubscribeDocPanels = window.extensions.onDocPanelsChanged(() => {
			void loadExtensionDocPanels();
		});

		return () => {
			unsubscribeRegistry();
			unsubscribeDocPanels();
		};
	}, [loadExtensionDocPanels]);

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

	useEffect(() => {
		if (!id) return;

		const unsubscribe = window.workspace.onDocumentImageChange((event) => {
			if (event.documentId !== id) return;
			loadImages();
		});

		return unsubscribe;
	}, [id, loadImages]);

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
					console.log('Saving document content');
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
				if (!activeTaskIdRef.current) {
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

	const editorInsert = useEditorStreamInsert();

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	const [documentHasActiveTask, setDocumentHasActiveTask] = useState(false);
	const [preexistingTaskActive, setPreexistingTaskActive] = useState(false);
	const [documentTaskState, setDocumentTaskState] = useState<string | null>(null);
	const [preexistingTaskId, setPreexistingTaskId] = useState<string | null>(null);
	const preexistingTaskActiveRef = useRef(false);
	preexistingTaskActiveRef.current = preexistingTaskActive;

	const assistantIsRunning = activeTaskId !== null || documentHasActiveTask;

	useEffect(() => {
		if (!id) {
			setDocumentHasActiveTask(false);
			setPreexistingTaskActive(false);
			setDocumentTaskState(null);
			setPreexistingTaskId(null);
			return;
		}
		if (typeof window.task?.list !== 'function') return;

		let cancelled = false;
		setDocumentHasActiveTask(false);
		setPreexistingTaskActive(false);
		setDocumentTaskState(null);
		setPreexistingTaskId(null);

		window.task.list().then((res) => {
			if (cancelled || !res.success) return;
			const activeTask = res.data.find(
				(t) =>
					t.metadata?.documentId === id &&
					(t.status === 'queued' || t.status === 'started' || t.status === 'running')
			);
			setDocumentHasActiveTask(!!activeTask);
			setPreexistingTaskActive(!!activeTask);
			setDocumentTaskState(activeTask?.status ?? null);
			setPreexistingTaskId(activeTask?.taskId ?? null);
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
			} else if (event.state === 'finished' || event.state === 'cancelled') {
				if (typeof window.task?.list !== 'function') {
					setDocumentHasActiveTask(false);
					setPreexistingTaskActive(false);
					setDocumentTaskState(null);
					setPreexistingTaskId(null);
					return;
				}
				window.task.list().then((res) => {
					if (!res.success) {
						setDocumentHasActiveTask(false);
						setPreexistingTaskActive(false);
						setDocumentTaskState(null);
						setPreexistingTaskId(null);
						return;
					}
					const stillActiveTask = res.data.find(
						(t) =>
							t.metadata?.documentId === id &&
							(t.status === 'queued' || t.status === 'started' || t.status === 'running')
					);
					setDocumentHasActiveTask(!!stillActiveTask);
					if (!stillActiveTask) {
						setPreexistingTaskActive(false);
						setDocumentTaskState(null);
						setPreexistingTaskId(null);
					} else if (preexistingTaskActiveRef.current) {
						setDocumentTaskState(stillActiveTask.status);
						setPreexistingTaskId(stillActiveTask.taskId);
					}
				});
			}
		});
	}, [id]);

	useEffect(() => {
		if (!id || !activeTaskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.metadata.documentId !== id) return;

			console.log('Received task event', event);
			editorActionsRef.current.showPromptStatusBar(event.data);
			const handlers = taskHandlersRef.current;
			if (event.state === 'running') {
				handlers.handleDelta(event.data);
			} else if (event.state === 'finished') {
				handlers.handleCompleted(event.data);
				setActiveTaskId(null);
			} else if (event.state === 'cancelled') {
				handlers.handleCancelOrError();
				setActiveTaskId(null);
			}
		});
	}, [activeTaskId, id]);

	const handleDelta = useCallback(
		(token: string) => {
			editorInsert.appendDelta(token);
		},
		[editorInsert]
	);

	const handleCompleted = useCallback(
		(completedContent: string) => {
			editorInsert.commitFinal(completedContent);
			editorActions.hideLoading();
			editorActions.enable();
			editorActions.hidePromptStatusBar();
			editorActions.clearPromptInput();
			if (!id || !editor || editor.isDestroyed) return;
			const fullMarkdown = editor.getMarkdown();
			setContent(fullMarkdown);
			dispatch({ type: 'CONTENT_CHANGED', value: fullMarkdown });
			debouncedContentSave.cancel();
			window.workspace.updateDocumentContent(id, fullMarkdown);
		},
		[editorInsert, editorActions, id, dispatch, debouncedContentSave, editor]
	);

	const handleCancelOrError = useCallback(() => {
		editorInsert.revert();
		editorActions.hideLoading();
		editorActions.enable();
		editorActions.hidePromptStatusBar();
	}, [editorInsert, editorActions]);

	const taskHandlersRef = useRef({ handleDelta, handleCompleted, handleCancelOrError });
	taskHandlersRef.current = { handleDelta, handleCompleted, handleCancelOrError };

	const submitAssistantTask = useCallback(
		async (prompt: string): Promise<boolean> => {
			if (!id || activeTaskIdRef.current) return false;
			if (typeof window.task?.submit !== 'function') return false;

			const result = await window.task.submit({
				type: TASK_TYPE,
				input: { prompt },
				metadata: { documentId: id },
			});

			if (!result.success) return false;
			setActiveTaskId(result.data.taskId);
			return true;
		},
		[id]
	);

	const handlePromptSubmit = useCallback(
		async (payload: PromptSubmitPayload, editor: TiptapEditor) => {
			if (!id || assistantIsRunning) return;

			let promptPos: number | null = null;
			editor.state.doc.descendants((node, pos) => {
				if (node.type.name === 'contentGenerator') {
					promptPos = pos;
					return false;
				}
				return true;
			});

			const from = promptPos ?? editor.state.selection.from;
			const to = promptPos ?? editor.state.selection.to;

			editorActions.showLoading();
			editorActions.disable();
			editorInsert.begin(from, to);

			const submitted = await submitAssistantTask(payload.prompt);

			if (!submitted) {
				editorInsert.revert();
				editorActions.hideLoading();
				editorActions.enable();
			}
		},
		[submitAssistantTask, assistantIsRunning, editorActions, editorInsert, id]
	);

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
	const [, forceRender] = useState(0);
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
			if (activeTaskIdRef.current) return;
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

	const handleAssistantAction = useCallback(
		(action: AssistantAction, editor: TiptapEditor) => {
			const instructionByAction: Record<AssistantAction, string> = {
				improve: 'Improve the writing of the selected text while preserving its meaning.',
				'fix-grammar': 'Fix grammar and spelling mistakes in the selected text.',
				summarize: 'Summarize the selected text concisely.',
				translate: 'Translate the selected text to English.',
				'continue-writing':
					'Continue writing from where the text ends, matching tone and style.',
			};

			void handlePromptSubmit(
				{ prompt: instructionByAction[action], files: [], editor },
				editor
			);
		},
		[handlePromptSubmit]
	);

	const handleInsertContent = useCallback(() => {
		openInsertContentDialog();
	}, [openInsertContentDialog]);

	const handleCancelPreexistingTask = useCallback(async () => {
		if (!preexistingTaskId) return;
		if (typeof window.task?.cancel !== 'function') return;
		await window.task.cancel(preexistingTaskId);
	}, [preexistingTaskId]);

	const activeExtensionPanel = useMemo(
		() => extensionDocPanels.find((panel) => panel.id === activeSidebar) ?? null,
		[activeSidebar, extensionDocPanels]
	);

	useEffect(() => {
		if (!activeSidebar) return;
		if (extensionDocPanels.some((panel) => panel.id === activeSidebar)) return;
		setActiveSidebar(null);
	}, [activeSidebar, extensionDocPanels, setActiveSidebar]);

	return (
		<PageContainer>
			<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
				<ResizablePanel defaultSize="70%" minSize="40%">
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
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
									<span>
										{documentTaskState === 'queued'
											? 'Task queued, waiting to start…'
											: documentTaskState === 'started'
												? 'Task started, preparing…'
												: documentTaskState === 'running'
													? 'Task running, generating content…'
													: 'Task in progress…'}
									</span>
									{documentTaskState && (
										<span className="text-xs uppercase tracking-wide opacity-70">
											{documentTaskState}
										</span>
									)}
									<Button
										variant="ghost"
										size="sm"
										title="Cancel task"
										aria-label="Cancel task"
										onClick={handleCancelPreexistingTask}
										disabled={!preexistingTaskId}
										className="h-6 px-2 text-xs"
									>
										<X className="size-3.5" aria-hidden="true" />
										Cancel
									</Button>
								</PageHeaderDescription>
							)}
						</PageHeader>
						<PageBody>
							{loaded && (
								<Editor
									key={id}
									disabled={assistantIsRunning}
									ref={editorRef}
									value={content}
									externalValueVersion={contentVersion}
									onChange={handleContentChange}
									onSelectionChange={handleSelectionChange}
									onPromptSubmit={handlePromptSubmit}
									onInsertContent={handleInsertContent}
									onAssistantAction={handleAssistantAction}
									documentId={id}
									onEditorReady={handleEditorReady}
								/>
							)}
						</PageBody>
					</div>
				</ResizablePanel>
				{activeSidebar && <ResizableHandle />}
				<ResizablePanel
					panelRef={sidebarPanelRef}
					defaultSize="30%"
					minSize="30%"
					maxSize="50%"
					collapsible
					collapsedSize="0%"
				>
					{activeExtensionPanel && id ? (
						<ExtensionPanel panelId={activeExtensionPanel.id} documentId={id} />
					) : null}
				</ResizablePanel>
			</ResizablePanelGroup>
		</PageContainer>
	);
}

function buildExtensionDocumentContext(
	documentId: string,
	markdown: string,
	selection: { from: number; to: number } | null,
	editor: TiptapEditor
): ExtensionDocumentContextSnapshot {
	const selectionSnapshot =
		selection && selection.from !== selection.to
			? {
				from: selection.from,
				to: selection.to,
				text: editor.state.doc.textBetween(selection.from, selection.to, '\n\n'),
			}
			: null;

	const activeMarks = Array.from(
		new Set(editor.state.selection.$from.marks().map((mark) => mark.type.name))
	).sort();

	return {
		documentId,
		markdown,
		selection: selectionSnapshot,
		editorState: {
			isFocused: editor.isFocused,
			isEditable: editor.isEditable,
			isEmpty: editor.isEmpty,
			activeNode: editor.state.selection.$from.parent.type.name,
			activeMarks,
		},
	};
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
