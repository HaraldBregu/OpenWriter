import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Bot, Undo2, Redo2, Info } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import { EditorContainer } from '@/components/app/base/Editor';
import PanelsContent from './PanelsContent';
import HistoryMenu from './components/HistoryMenu';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useSidebarVisibility,
	useEditorInstance,
	useAssistantTask,
} from './hooks';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/documents/actions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderItems, PageHeaderTitle } from '@/components/app';
import type { ModelInfo } from '../../../../shared/types';
import { findModelById } from '../../../../shared/models';
import { PageBody } from '@/components/app/base/Page';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;

function PageContent(): ReactElement {
	const { documentId: id } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { setEditor } = useEditorInstance();

	const [title, setTitle] = useState('');
	const [emoji, setEmoji] = useState('');
	const [content, setContent] = useState('');
	const [contentVersion, setContentVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [defaultTextModel, setDefaultTextModel] = useState<ModelInfo | undefined>(undefined);
	const [defaultImageModel, setDefaultImageModel] = useState<ModelInfo | undefined>(undefined);

	const { activeSidebar, toggleSidebar } = useSidebarVisibility();
	const { openInsertContentDialog } = useInsertContentDialog();
	const { t } = useTranslation();

	const editorRef = useRef<TextEditorElement>(null);
	const sidebarPanelRef = usePanelRef();

	useEffect(() => {
		if (activeSidebar) {
			sidebarPanelRef.current?.expand();
		} else {
			sidebarPanelRef.current?.collapse();
		}
	}, [activeSidebar, sidebarPanelRef]);

	const stateRef = useRef({ title, emoji });
	stateRef.current = { title, emoji };

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
		setEmoji('');
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
				setEmoji(config.emoji || '');
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
					const { title: currentTitle, emoji: currentEmoji } = stateRef.current;
					window.workspace.updateDocumentConfig(id, { title: currentTitle, emoji: currentEmoji });
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

	const {
		assistantIsRunning,
		handleGenerateTextSubmit,
		handleGenerateImageSubmit,
		handleContinueWithAssistant,
	} = useAssistantTask(id, editorRef);

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
		appDispatch(
			documentMetadataPatched({ id, title, emoji: emoji || undefined, updatedAt: Date.now() })
		);
	}, [id, title, emoji, loaded, appDispatch]);

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
		(editor: Editor | null) => {
			setEditor(editor);
		},
		[setEditor]
	);

	const handleInsertContent = useCallback(() => {
		openInsertContentDialog();
	}, [openInsertContentDialog]);

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Input
						type="text"
						value={title}
						onChange={(e) => handleTitleChange(e.target.value)}
						placeholder={t('writing.titlePlaceholder')}
						className="text-xl! border-0 bg-transparent dark:bg-transparent rounded-none p-0 font-semibold tracking-tight focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</PageHeaderTitle>
				<PageHeaderItems>
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title="Undo"
						aria-label="Undo"
						onClick={handleUndo}
						disabled={!canUndo}
					>
						<Undo2 aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
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
						type="button"
						variant="header-icon"
						size="header-icon-md"
						title={t('titleBar.toggleAgenticSidebar')}
						aria-label={t('titleBar.toggleAgenticSidebar')}
						aria-expanded={activeSidebar === 'agentic'}
						onClick={() => toggleSidebar('agentic')}
					>
						<Bot aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="header-icon"
						size="header-icon-md"
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
						<EditorContainer>
							{loaded && (
								<TextEditor
									key={id}
									disabled={assistantIsRunning}
									ref={editorRef}
									value={content}
									externalValueVersion={contentVersion}
									onChange={handleContentChange}
									onSelectionChange={handleSelectionChange}
									onContinueWithAssistant={handleContinueWithAssistant}
									onGenerateTextSubmit={handleGenerateTextSubmit}
									onGenerateImageSubmit={handleGenerateImageSubmit}
									onInsertContent={handleInsertContent}
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
						</EditorContainer>
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
						<PanelsContent documentId={id} />
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
