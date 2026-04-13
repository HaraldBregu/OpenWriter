import React, { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
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

	const handleSearch = useCallback((query: string) => {
		editorContentRef.current?.setSearch(query);
	}, []);

	const handleClearSearch = useCallback(() => {
		editorContentRef.current?.clearSearch();
	}, []);

	return (
		<div className="h-full flex flex-col">
			<HeaderContent
				title={title}
				emoji={emoji}
				onTitleChange={handleTitleChange}
				onEmojiChange={handleEmojiChange}
				onSearch={handleSearch}
				onClearSearch={handleClearSearch}
				historyEntries={historyEntries}
				currentHistoryEntryId={currentHistoryEntryId}
				canUndo={canUndo}
				canRedo={canRedo}
				onUndo={handleUndo}
				onRedo={handleRedo}
				onRestoreHistoryEntry={handleRestoreHistoryEntry}
			/>

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
		</div>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
