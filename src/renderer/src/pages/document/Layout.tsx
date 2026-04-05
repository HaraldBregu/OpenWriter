import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { subscribeToTask, initTaskMetadata } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { v7 as uuidv7 } from 'uuid';
import { debounce } from 'lodash';
import type { AssistantAgentId } from '@/components/editor/extensions/assistant';
import Header from './components/Header';
import ResourcesPanel from './panels/resources/ResourcesPanel';
import Chat from './panels/chat';
import { useEditorInstance, useSidebarVisibility } from './providers';
import { useDocumentDispatch, useDocumentHistory } from './hooks';
import { buildTaskPrompt, normalizeTaskPromptContext } from './shared';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';

interface LayoutProps {
	documentId: string | undefined;
}

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

async function saveAssistantReferenceImages(
	documentId: string,
	files: File[]
): Promise<Array<{ fileName: string; filePath: string }>> {
	const saved: Array<{ fileName: string; filePath: string }> = [];

	for (const file of files) {
		const dataUri = await readFileAsDataUri(file);
		const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
		if (!match) continue;

		const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
		const base64 = match[2];
		const fileName = `${crypto.randomUUID()}.${ext}`;
		const result = await window.workspace.saveDocumentImage({
			documentId,
			fileName,
			base64,
		});
		saved.push(result);
	}

	return saved;
}

const DOCUMENT_AGENT_TASK_TYPES: Record<AssistantAgentId, string> = {
	writer: 'agent-writer',
	painter: 'agent-painter',
};

const Layout: React.FC<LayoutProps> = ({ documentId: id }) => {
	const dispatch = useDocumentDispatch();
	const navigate = useNavigate();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [editorExternalValueVersion, setEditorExternalValueVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);

	const { activeSidebar } = useSidebarVisibility();
	const { setEditor } = useEditorInstance();

	const handleEditorReady = useCallback(
		(editor: Editor | null) => {
			setEditor(editor);
		},
		[setEditor]
	);

	const editorRef = useRef<TextEditorElement>(null);
	const sidebarPanelRef = usePanelRef();

	useEffect(() => {
		if (activeSidebar) {
			sidebarPanelRef.current?.expand();
		} else {
			sidebarPanelRef.current?.collapse();
		}
	}, [activeSidebar, sidebarPanelRef]);

	const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const [assistantActiveAgentId, setAssistantActiveAgentId] = useState<AssistantAgentId>('writer');
	const assistantIsRunning = assistantActiveTaskId !== null;
	const pendingCloseMenuRef = useRef<(() => void) | null>(null);

	const stateRef = useRef({ title, content });
	stateRef.current = { title, content };

	const loadedRef = useRef(false);
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
				setContent(output.content || '');
				dispatch({ type: 'METADATA_UPDATED', metadata: output.metadata });
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
					const { title: t, content: c } = stateRef.current;
					window.workspace.updateOutput({
						type: 'documents',
						id,
						content: c,
						metadata: { title: t },
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

	const handleContentChange = useCallback(
		(newContent: string) => {
			setContent(newContent);
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleSelectionChange = useCallback(
		(selection: { from: number; to: number } | null) => {
			dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
		},
		[dispatch]
	);

	useEffect(() => {
		if (!assistantActiveTaskId) return;

		const unsub = subscribeToTask(assistantActiveTaskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setContentGeneratorLoading(true);
				if (pendingCloseMenuRef.current) {
					pendingCloseMenuRef.current();
					pendingCloseMenuRef.current = null;
				}
				return;
			}

			const completed = snap.status === 'completed';
			const output = snap.result as { content?: string } | undefined;
			const streamContent = output?.content ?? snap.streamedContent ?? '';

			if (streamContent) {
				if (completed && assistantActiveAgentId === 'painter') {
					editorRef.current?.insertMarkdownText(streamContent, {
						preventEditorUpdate: !completed,
					});
				} else {
					editorRef.current?.insertText(streamContent, { preventEditorUpdate: !completed });
				}
			}

			if (completed || snap.status === 'error' || snap.status === 'cancelled') {
				if (pendingCloseMenuRef.current) {
					pendingCloseMenuRef.current();
					pendingCloseMenuRef.current = null;
				}
				editorRef.current?.removeContentGenerator();
				setAssistantActiveTaskId(null);
			}
		});

		return unsub;
	}, [assistantActiveAgentId, assistantActiveTaskId]);

	const handleAssistantSend = useCallback(
		async (
			before: string,
			after: string,
			cursorPos: number,
			input: string,
			agentId: AssistantAgentId = 'writer',
			files: File[] = []
		) => {
			if (!id || assistantIsRunning) return;

			editorRef.current?.setContentGeneratorEnable(false);

			const savedReferenceImages =
				agentId === 'painter' && files.length > 0
					? await saveAssistantReferenceImages(id, files)
					: [];
			const referenceNote =
				agentId === 'painter' && savedReferenceImages.length > 0
					? `\n\nReference images saved in the document:\n${savedReferenceImages
							.map((image) => `- images/${image.fileName}`)
							.join('\n')}`
					: '';
			const prompt = buildTaskPrompt(before, after, `${input}${referenceNote}`);

			const resolvedSessionId = assistantSessionId ?? uuidv7();
			if (!assistantSessionId) {
				setAssistantSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') return;

			try {
				const taskType = DOCUMENT_AGENT_TASK_TYPES[agentId];
				const taskInput = { prompt };
				const metadata = {
					agentId,
					documentId: id,
					chatId: resolvedSessionId,
					before,
					after,
					cursorPos,
					referenceImages: savedReferenceImages,
				};

				const ipcResult = await window.task.submit(taskType, taskInput, metadata);
				if (!ipcResult.success) return;

				const resolvedTaskId = ipcResult.data.taskId;
				initTaskMetadata(resolvedTaskId, metadata);
				setAssistantActiveAgentId(agentId);
				setAssistantActiveTaskId(resolvedTaskId);
			} catch {
				// submission failed
			}
		},
		[assistantIsRunning, assistantSessionId, id]
	);

	const onContinueWithAssistant = useCallback(
		(before: string, after: string, cursorPos: number, closeMenu: () => void) => {
			if (assistantIsRunning) {
				closeMenu();
				return;
			}
			const { before: cleanBefore, after: cleanAfter } = normalizeTaskPromptContext(before, after);
			pendingCloseMenuRef.current = closeMenu;
			handleAssistantSend(
				cleanBefore,
				cleanAfter,
				cursorPos,
				'CONTINUE WRITING HERE WITH 15 WORDS MAX',
				'writer'
			).catch(() => {
				pendingCloseMenuRef.current = null;
				closeMenu();
			});
		},
		[assistantIsRunning, handleAssistantSend]
	);

	const handleOpenFolder = useCallback(() => {
		if (!id) return;
		window.workspace.openDocumentFolder(id);
	}, [id]);

	const handleSearch = useCallback((query: string) => {
		editorRef.current?.setSearch(query);
	}, []);

	const handleClearSearch = useCallback(() => {
		editorRef.current?.clearSearch();
	}, []);

	return (
		<div className="h-full flex flex-col">
			<Header
				title={title}
				onTitleChange={handleTitleChange}
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
					<div className="h-full min-w-0 flex flex-col">
						<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
							<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">
								{loaded && (
									<TextEditor
										disabled={assistantIsRunning}
										ref={editorRef}
										key={id}
										value={content}
										onSelectionChange={handleSelectionChange}
										externalValueVersion={editorExternalValueVersion}
										onChange={handleContentChange}
										onContinueWithAssistant={onContinueWithAssistant}
										onTextSubmit={handleAssistantSend}
										documentId={id}
										onEditorReady={handleEditorReady}
										onUndo={handleUndo}
										onRedo={handleRedo}
									/>
								)}
							</div>
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
					<div className="h-full">
						{activeSidebar === 'config' && <ResourcesPanel onOpenFolder={handleOpenFolder} />}
						{activeSidebar === 'agentic' && <Chat />}
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
};

export { Layout };
