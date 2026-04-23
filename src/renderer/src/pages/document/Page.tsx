import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/Badge';
import type {
	ExtensionDocumentContextSnapshot,
	ExtensionDocPanelInfo,
	TaskEvent,
	TaskState,
} from '../../../../shared/types';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderItems, PageHeaderTitle } from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import type { AssistantAction } from '@/components/app/editor/context/context';
import { PromptSubmitPayload } from '@shared/index';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;
const TASK_TYPE = 'demo';

const STATUS_LABELS: Record<TaskState, string> = {
	queued: 'Queued',
	started: 'Started',
	running: 'Running',
	finished: 'Finished',
	cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<TaskState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	queued: 'secondary',
	started: 'secondary',
	running: 'default',
	finished: 'default',
	cancelled: 'outline',
};

interface TaskStatusBarProps {
	readonly taskId: string | null;
}

function TaskStatusBar({ taskId }: TaskStatusBarProps): ReactElement | null {
	const [state, setState] = useState<{ status: TaskState; message: string } | null>(null);

	useEffect(() => {
		if (!taskId) {
			setState(null);
			return;
		}
		if (typeof window.task?.onEvent !== 'function') return;

		setState({ status: 'queued', message: '' });

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== taskId) return;
			setState({ status: event.state, message: event.data });
		});
	}, [taskId]);

	if (!state) return null;

	const { status, message } = state;

	return (
		<div className="flex items-center gap-3 border-b px-6 py-2 bg-muted/20">
			<Badge variant={STATUS_VARIANT[status]} className="shrink-0">
				{STATUS_LABELS[status]}
			</Badge>
			<p className="flex-1 min-w-0 truncate text-[11px] text-muted-foreground">{message}</p>
		</div>
	);
}

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
					window.workspace.updateDocument(id, { config: { title: currentTitle } });
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
					window.workspace.updateDocument(id, { content: contentRef.current });
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
				debouncedContentSave.flush();
			}
			debouncedMetadataSave.cancel();
			debouncedContentSave.cancel();
		};
	}, [debouncedMetadataSave, debouncedContentSave]);

	const editorActions = useEditor(editorRef);

	const editorInsert = useEditorStreamInsert();

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	const assistantIsRunning = activeTaskId !== null;

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
			editorActions.clearPromptInput();
			if (!id || !editor || editor.isDestroyed) return;
			const fullMarkdown = editor.getMarkdown();
			setContent(fullMarkdown);
			dispatch({ type: 'CONTENT_CHANGED', value: fullMarkdown });
			debouncedContentSave.cancel();
			window.workspace.updateDocument(id, { content: fullMarkdown }).catch(() => {
				// document may have been deleted mid-run; ignore
			});
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					editorActions.insertPromptView();
				});
			});
		},
		[editorInsert, editorActions, id, dispatch, debouncedContentSave, editor]
	);

	const handleCancelOrError = useCallback(() => {
		editorInsert.revert();
		setPhaseLabel(null);
		editorActions.hideLoading();
		editorActions.enable();
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

			const { from, to } = editor.state.selection;

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
		canUndo,
		canRedo,
		undo: handleUndo,
		redo: handleRedo,
		restoreEntry: handleRestoreHistoryEntry,
	} = useDocumentHistory({
		documentId: id,
		content,
		title,
		loaded,
		onRestore: handleHistoryRestore,
	});

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
			<PageBody>
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
								</PageHeaderTitle>
								<PageHeaderItems>
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
									/>
									<DocumentInfoPopover documentId={id ?? null} title={title} content={content} />
								</PageHeaderItems>
							</PageHeader>
							<TaskStatusBar taskId={activeTaskId} />
							<div className="flex min-h-0 flex-1 flex-col">
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
										onUndo={handleUndo}
										onRedo={handleRedo}
									/>
								)}
							</div>
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
			</PageBody>
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
