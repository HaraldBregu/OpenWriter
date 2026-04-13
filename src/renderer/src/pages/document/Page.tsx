import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import HeaderContent from './HeaderContent';
import EditorContent, { type EditorContentElement } from './EditorContent';
import PanelsContent from './PanelsContent';
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

	const { activeSidebar } = useSidebarVisibility();

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

	const { t } = useTranslation();
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const searchInputRef = useRef<HTMLInputElement>(null);

	const handleSearchChange = useCallback(
		(query: string) => {
			setSearchQuery(query);
			editorContentRef.current?.setSearch(query);
		},
		[]
	);

	const closeSearch = useCallback(() => {
		setSearchOpen(false);
		setSearchQuery('');
		editorContentRef.current?.clearSearch();
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				setSearchOpen(true);
				requestAnimationFrame(() => searchInputRef.current?.focus());
			}
			if (e.key === 'Escape' && searchOpen) {
				closeSearch();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [searchOpen, closeSearch]);

	return (
		<PageContainer>
			<HeaderContent
				title={title}
				emoji={emoji}
				onTitleChange={handleTitleChange}
				onEmojiChange={handleEmojiChange}
				historyEntries={historyEntries}
				currentHistoryEntryId={currentHistoryEntryId}
				canUndo={canUndo}
				canRedo={canRedo}
				onUndo={handleUndo}
				onRedo={handleRedo}
				onRestoreHistoryEntry={handleRestoreHistoryEntry}
			/>

			{searchOpen && (
				<div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-muted/50 shrink-0">
					<Search className="h-4 w-4 text-muted-foreground shrink-0" />
					<Input
						ref={searchInputRef}
						type="search"
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={t('common.search')}
						className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={closeSearch}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}

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
