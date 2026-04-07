import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import Header from './Header';
import EditorPanelContent, { type EditorPanelContentElement } from './EditorPanelContent';
import SidePanelsContent from './SidePanelsContent';
import { useSidebarVisibility } from './providers';
import { useDocumentDispatch, useDocumentHistory } from './hooks';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/documents/actions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';

interface LayoutProps {
	documentId: string | undefined;
}

const Layout: React.FC<LayoutProps> = ({ documentId: id }) => {
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();

	const [title, setTitle] = useState('');
	const [emoji, setEmoji] = useState('');
	const [content, setContent] = useState('');
	const [editorExternalValueVersion, setEditorExternalValueVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);

	const editorPanelContentRef = useRef<EditorPanelContentElement>(null);

	const stateRef = useRef({ title, emoji, content });
	stateRef.current = { title, emoji, content };

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
				const output = await window.workspace.loadOutput({
					type: 'documents',
					id: id!,
				});

				if (cancelled || !output) {
					if (!cancelled) {
						documentDeletedRef.current = true;
						setLoaded(true);
						navigate('/home', { replace: true });
					}
					return;
				}

				setTitle(output.metadata.title || '');
				setEmoji(output.metadata.emoji || '');
				setContent(output.content || '');
				dispatch({ type: 'METADATA_UPDATED', metadata: output.metadata });
				dispatch({ type: 'CONTENT_CHANGED', value: output.content || '' });
				setLoaded(true);
			} catch {
				if (!cancelled) setLoaded(true);
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

			if (event.type === 'changed') {
				window.workspace
					.loadOutput({ type: 'documents', id })
					.then((output) => {
						if (output) {
							dispatch({ type: 'METADATA_UPDATED', metadata: output.metadata });
						}
					})
					.catch(() => {});
			}

			if (event.type === 'changed' || event.type === 'added') {
				loadImages();
			}
		});

		return unsubscribe;
	}, [id, loadImages, dispatch, navigate]);

	// Image-watcher: refresh images on add/change/remove events
	useEffect(() => {
		if (!id) return;

		const unsubscribe = window.workspace.onDocumentImageChange((event) => {
			if (event.documentId !== id) return;
			loadImages();
		});

		return unsubscribe;
	}, [id, loadImages]);

	const debouncedSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					const { title: t, emoji: e, content: c } = stateRef.current;
					window.workspace.updateOutput({
						type: 'documents',
						id,
						content: c,
						metadata: { title: t, emoji: e },
					});
				},
				1500,
				{ leading: false, trailing: true }
			),
		[id]
	);

	useEffect(() => {
		return () => {
			if (!documentDeletedRef.current) {
				debouncedSave.flush();
			}
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	const handleHistoryRestore = useCallback(
		(restoredContent: string, restoredTitle: string) => {
			setEditorExternalValueVersion((currentVersion) => currentVersion + 1);
			setContent(restoredContent);
			setTitle(restoredTitle);
			debouncedSave();
		},
		[debouncedSave]
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
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleEmojiChange = useCallback(
		(value: string) => {
			setEmoji(value);
			debouncedSave();
		},
		[debouncedSave]
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
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleSearch = useCallback((query: string) => {
		editorPanelContentRef.current?.setSearch(query);
	}, []);

	const handleClearSearch = useCallback(() => {
		editorPanelContentRef.current?.clearSearch();
	}, []);

	return (
		<div className="h-full flex flex-col">
			<Header
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
					<EditorPanelContent
						key={id}
						ref={editorPanelContentRef}
						documentId={id}
						loaded={loaded}
						content={content}
						externalValueVersion={editorExternalValueVersion}
						onChange={handleContentChange}
						onUndo={handleUndo}
						onRedo={handleRedo}
					/>
				</ResizablePanel>
				<SidePanelsContent documentId={id} />
			</ResizablePanelGroup>
		</div>
	);
};

export { Layout };
