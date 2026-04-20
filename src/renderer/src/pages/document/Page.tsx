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
	initTaskMetadata,
	subscribeToTask,
	type TaskSnapshot,
} from '../../services/task-event-bus';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderItems, PageHeaderTitle } from '@/components/app';
import type { ModelInfo } from '../../../../shared/types';
import { findModelById } from '../../../../shared/models';
import { PageBody } from '@/components/app/base/Page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import { PromptSubmitPayload } from '@shared/index';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;

interface SavedImage {
	readonly fileName: string;
	readonly filePath: string;
}

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

async function saveReferenceImages(documentId: string, files: File[]): Promise<SavedImage[]> {
	const saved: SavedImage[] = [];
	for (const file of files) {
		const dataUri = await readFileAsDataUri(file);
		const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
		if (!match) continue;
		const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
		const base64 = match[2];
		const fileName = `${crypto.randomUUID()}.${ext}`;
		const result = await window.workspace.saveDocumentImage({ documentId, fileName, base64 });
		saved.push(result);
	}
	return saved;
}

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
	const [defaultTextModel, setDefaultTextModel] = useState<ModelInfo | undefined>(undefined);
	const [defaultImageModel, setDefaultImageModel] = useState<ModelInfo | undefined>(undefined);

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
		setDefaultTextModel(undefined);
		setDefaultImageModel(undefined);
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

				const textModel = findModelById(config.textModel);
				if (textModel) setDefaultTextModel(textModel);
				const imageModel = findModelById(config.imageModel);
				if (imageModel) setDefaultImageModel(imageModel);

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

	const updateDocumentConfig = useCallback(
		async (update: { textModel?: string; imageModel?: string }) => {
			if (!id) return;
			try {
				await window.workspace.updateDocumentConfig(id, update);
			} catch {
				// silently ignore write errors
			}
		},
		[id]
	);

	const handleTextModelChange = useCallback(
		(model: ModelInfo) => {
			setDefaultTextModel(model);
			updateDocumentConfig({ textModel: model.modelId });
		},
		[updateDocumentConfig]
	);

	const handleImageModelChange = useCallback(
		(model: ModelInfo) => {
			setDefaultImageModel(model);
			updateDocumentConfig({ imageModel: model.modelId });
		},
		[updateDocumentConfig]
	);

	const editorActions = useEditor(editorRef);

	const textSessionIdRef = useRef<string | null>(null);
	const imageSessionIdRef = useRef<string | null>(null);

	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const [assistantActiveAgentId, setAssistantActiveAgentId] = useState<'text' | 'image'>('text');
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
				const isImageAgent = assistantActiveAgentId === 'image';
				if (completed && isImageAgent) {
					editorActions.insertMarkdownText(streamContent, { preventEditorUpdate: !completed });
				} else {
					editorActions.insertText(streamContent, { preventEditorUpdate: !completed });
				}
			}

			if (completed || snap.status === 'error' || snap.status === 'cancelled') {
				// editorActions.closePrompt();
				editorActions.hideLoading();
				editorActions.enable();
				editorActions.clearPromptInput();
				setAssistantActiveTaskId(null);
			}
		});
	}, [assistantActiveAgentId, assistantActiveTaskId, editorActions]);

	const handlePromptSubmit = useCallback(
		async (payload: PromptSubmitPayload) => {
			if (!id || assistantIsRunning || typeof window.task?.submit !== 'function') {
				editorActions.hideLoading();
				editorActions.enable();
				return;
			}

			editorActions.showLoading();
			editorActions.disable();

			try {
				const isImage = payload.files.length > 0;
				const agentId = isImage ? 'image' : 'text';
				const sessionRef = isImage ? imageSessionIdRef : textSessionIdRef;
				const resolvedSessionId = sessionRef.current ?? uuidv7();
				sessionRef.current = resolvedSessionId;

				const metadata = {
					agentId,
					documentId: id,
					chatId: resolvedSessionId,
				};

				const ipcResult = await window.task.submit({
					type: 'demo',
					input: { prompt: payload.prompt },
					metadata,
				});
				if (!ipcResult.success) {
					editorActions.hideLoading();
					editorActions.enable();
					return;
				}

				const taskId = ipcResult.data.taskId;
				initTaskMetadata(taskId, metadata);
				setAssistantActiveAgentId(agentId);
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
								documentId={id}
								defaultTextModel={defaultTextModel}
								defaultImageModel={defaultImageModel}
								onTextModelChange={handleTextModelChange}
								onImageModelChange={handleImageModelChange}
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
