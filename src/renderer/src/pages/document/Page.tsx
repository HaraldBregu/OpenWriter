import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Bot, Undo2, Redo2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import EditorContent, { type EditorContentElement } from './EditorContent';
import PanelsContent from './PanelsContent';
import HistoryMenu from './components/HistoryMenu';
import { useSidebarVisibility } from './providers';
import { useDocumentDispatch, useDocumentHistory, useDocumentState } from './hooks';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/documents/actions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer } from '@/components/app';

const METADATA_SAVE_DEBOUNCE_MS = 1500;

function PageContent(): ReactElement {
	const { documentId: id } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();

	const [title, setTitle] = useState('');
	const [emoji, setEmoji] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);

	const { activeSidebar, toggleSidebar } = useSidebarVisibility();
	const { t } = useTranslation();

	const editorContentRef = useRef<EditorContentElement>(null);
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

	const loadedRef = useRef(false);
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
		dispatch({ type: 'METADATA_UPDATED', metadata: null });

		async function load() {
			try {
				const config = await window.workspace.getDocumentConfig(id!);

				if (cancelled) return;

				setTitle(config.title || '');
				setEmoji(config.emoji || '');
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

	// Load images
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

	// File-watcher: sync metadata + images
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

	// Image-watcher: refresh images on add/change/remove events
	useEffect(() => {
		if (!id) return;

		const unsubscribe = window.workspace.onDocumentImageChange((event) => {
			if (event.documentId !== id) return;
			loadImages();
		});

		return unsubscribe;
	}, [id, loadImages]);

	// Debounced metadata save (title, emoji only — content is saved by EditorContent)
	const debouncedMetadataSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					const { title: t, emoji: e } = stateRef.current;
					window.workspace.updateDocumentConfig(id, { title: t, emoji: e });
				},
				METADATA_SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[id]
	);

	useEffect(() => {
		return () => {
			if (!documentDeletedRef.current) {
				debouncedMetadataSave.flush();
			}
			debouncedMetadataSave.cancel();
		};
	}, [debouncedMetadataSave]);

	const handleHistoryRestore = useCallback(
		(restoredContent: string, restoredTitle: string) => {
			editorContentRef.current?.setContent(restoredContent);
			setContent(restoredContent);
			setTitle(restoredTitle);
			debouncedMetadataSave();
		},
		[debouncedMetadataSave]
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

	const handleEmojiChange = useCallback(
		(value: string) => {
			setEmoji(value);
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

	const handleContentChange = useCallback((newContent: string) => {
		setContent(newContent);
	}, []);

	return (
		<PageContainer>
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<EmojiPicker value={emoji} onSelect={handleEmojiChange} />
					<Input
						type="text"
						value={title}
						onChange={(e) => handleTitleChange(e.target.value)}
						placeholder={t('writing.titlePlaceholder')}
						className="h-auto w-full min-w-0 border-0 bg-transparent px-0 py-0 !text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>
				<div className="flex items-center gap-0 ml-3 shrink-0">
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
				</div>
			</div>

			{/* Editor + Right Sidebar */}
			<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
				<ResizablePanel defaultSize="70%" minSize="40%">
					<EditorContent
						key={id}
						ref={editorContentRef}
						documentId={id}
						onContentChange={handleContentChange}
						onUndo={handleUndo}
						onRedo={handleRedo}
					/>
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
