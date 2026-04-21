import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Bot, Undo2, Redo2, Info } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import InfoPanel from './panels/info/Panel';
import Chat from './panels/chat/Panel';
import HistoryMenu from './components/HistoryMenu';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useSidebarVisibility,
	useEditorInstance,
	useEditor,
} from './hooks';
import { v7 as uuidv7 } from 'uuid';
import {
	subscribeToTask,
	type TaskSnapshot,
} from '../../services/task-event-bus';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderItems, PageHeaderTitle } from '@/components/app';
import { PageBody } from '@/components/app/base/Page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import type { AssistantAction } from '@/components/app/editor/context/context';
import { PromptSubmitPayload } from '@shared/index';


const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;

function PageContent(): ReactElement {
	const { documentId: id } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { setEditor } = useEditorInstance();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [contentVersion, setContentVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);

	const { activeSidebar, setActiveSidebar, toggleSidebar } = useSidebarVisibility();
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
				dispatch({ type: 'CONTENT_CHANGED', value: loadedContent });

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
		if (!id) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== id) return;

			if (event.type === 'removed') {
				documentDeletedRef.current = true;
				navigate('/home', { replace: true });
				return;
			}

			if (event.type === 'changed' || event.type === 'added') {
				loadImages();
			}
		});

		return unsubscribe;
	}, [id, loadImages, navigate]);

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
				debouncedContentSave.flush();
			}
			debouncedMetadataSave.cancel();
			debouncedContentSave.cancel();
		};
	}, [debouncedMetadataSave, debouncedContentSave]);

	const editorActions = useEditor(editorRef);

	const sessionIdRef = useRef<string | null>(null);

	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const assistantIsRunning = assistantActiveTaskId !== null;

	useEffect(() => {
		if (!assistantActiveTaskId) return;

		return subscribeToTask(assistantActiveTaskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorActions.showLoading();
				return;
			}

			const completed = snap.status === 'completed';
			const output = snap.result as { content?: string } | undefined;
			const streamContent = output?.content ?? snap.streamedContent ?? '';

			if (streamContent) {
				editorActions.insertText(streamContent, { preventEditorUpdate: !completed });
			}

			if (completed || snap.status === 'error' || snap.status === 'cancelled') {
				editorActions.hideLoading();
				editorActions.enable();
				editorActions.clearPromptInput();
				setAssistantActiveTaskId(null);
			}
		});
	}, [assistantActiveTaskId, editorActions]);

	const handlePromptSubmit = useCallback(
		async (payload: PromptSubmitPayload, editor: TiptapEditor) => {
			const { from, to } = editor.state.selection;
			const doc = editor.state.doc;
			const textBefore = editor.markdown?.serialize(doc.cut(0, from).toJSON()) ?? '';
			const textAfter =
				editor.markdown?.serialize(doc.cut(to, doc.content.size).toJSON()) ?? '';

			const composedPrompt = [
				'Text before cursor:',
				textBefore,
				'',
				'Instruction:',
				payload.prompt,
				'',
				'Text after cursor:',
				textAfter,
			].join('\n');

			if (!id || assistantIsRunning || typeof window.task?.submit !== 'function') {
				editorActions.hideLoading();
				editorActions.enable();
				return;
			}

			editorActions.showLoading();
			editorActions.disable();

			try {
				const resolvedSessionId = sessionIdRef.current ?? uuidv7();
				sessionIdRef.current = resolvedSessionId;

				const agentInput = {
					prompt: composedPrompt,
					files: payload.files.map((f) => ({
						name: f.name,
						mimeType: f.type || undefined,
					})),
				};

				const ipcResult = await window.task.submit({
					type: 'agent',
					input: { agentType: 'assistant', input: agentInput },
					metadata: { sessionId: resolvedSessionId, documentId: id },
				});

				if (!ipcResult.success) {
					editorActions.hideLoading();
					editorActions.enable();
					return;
				}

				const taskId = ipcResult.data.taskId;
				setAssistantActiveTaskId(taskId);
			} catch {
				editorActions.hideLoading();
				editorActions.enable();
			}
		},
		[assistantIsRunning, id, editorActions]
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

	useEffect(() => {
		if (!id || typeof window.task?.onEvent !== 'function') return;

		window.task.list().then((res) => {
			if (!res.success) return;
			const docTasks = res.data.filter((t) => t.metadata?.documentId === id);
			docTasks.forEach((t) => {
				console.log('[document task]', t.taskId, t.status, t);
			});
		});

		return window.task.onEvent((event) => {
			if (event.metadata?.documentId !== id) return;
			console.log('[document task progress]', event.taskId, event.state, event);
		});
	}, [id]);

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
			const { from, to } = editor.state.selection;
			const selectedText =
				from === to
					? ''
					: (editor.markdown?.serialize(editor.state.doc.cut(from, to).toJSON()) ?? '');

			const instructionByAction: Record<AssistantAction, string> = {
				improve: 'Improve the writing of the following text while preserving its meaning.',
				'fix-grammar': 'Fix grammar and spelling mistakes in the following text.',
				summarize: 'Summarize the following text concisely.',
				translate: 'Translate the following text to English.',
				'continue-writing': 'Continue writing from where the text ends, matching tone and style.',
			};

			void handlePromptSubmit(
				{
					prompt: `${instructionByAction[action]}\n\n${selectedText}`.trim(),
					files: [],
					editor,
				},
				editor
			);
		},
		[handlePromptSubmit]
	);

	const handleInsertContent = useCallback(() => {
		openInsertContentDialog();
	}, [openInsertContentDialog]);

	const handleOpenChat = useCallback(() => {
		setActiveSidebar('agentic');
		requestAnimationFrame(() => {
			const el = document.querySelector<HTMLTextAreaElement>('[data-chat-input]');
			el?.focus();
		});
	}, [setActiveSidebar]);

	const handleOpenFolder = useCallback(() => {
		if (!id) return;
		window.workspace.openDocumentFolder(id);
	}, [id]);

	return (
		<PageContainer>
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
					<Separator orientation="vertical" className="mx-2 h-5" />
					<Button
						variant="ghost"
						size="icon"
						title={t('titleBar.toggleAgenticSidebar')}
						aria-label={t('titleBar.toggleAgenticSidebar')}
						aria-expanded={activeSidebar === 'agentic'}
						onClick={() => toggleSidebar('agentic')}
					>
						<Bot aria-hidden="true" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title={t('titleBar.toggleSidebar')}
						aria-label={t('titleBar.toggleSidebar')}
						aria-expanded={activeSidebar === 'config'}
						onClick={() => toggleSidebar('config')}
					>
						<Info aria-hidden="true" />
					</Button>
				</PageHeaderItems>
			</PageHeader>
			<PageBody>
				<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
					<ResizablePanel defaultSize="70%" minSize="40%">
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
								onOpenChat={handleOpenChat}
								onAssistantAction={handleAssistantAction}
								documentId={id}
								onEditorReady={handleEditorReady}
								onUndo={handleUndo}
								onRedo={handleRedo}
							/>
						)}
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
						<div className="h-full">
							{activeSidebar === 'config' && <InfoPanel onOpenFolder={handleOpenFolder} />}
							{activeSidebar === 'agentic' && <Chat />}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</PageBody>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
