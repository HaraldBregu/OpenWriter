import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { subscribeToTask, initTaskMetadata } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { v7 as uuidv7 } from 'uuid';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';
import Header from './components/Header';
import ResourcesPanel from './panels/resources/ResourcesPanel';
import Chat from './panels/chat';
import { useEditorInstance, useSidebarVisibility } from './providers';
import { useDocumentDispatch, useDocumentHistory } from './hooks';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';

type TextCompleterTaskData = {
	prompt: string;
};

type TextEnhanceTaskData = {
	prompt: string;
};

type TextWriterTaskData = {
	prompt: string;
};

type ImageGeneratorTaskData = {
	prompt: string;
};

interface LayoutProps {
	documentId: string | undefined;
}

const Layout: React.FC<LayoutProps> = ({ documentId: id }) => {
	const dispatch = useDocumentDispatch();

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

	const textCompleterTaskData: TextCompleterTaskData = { prompt: '' };
	const textCompleterTask = useTask<TextCompleterTaskData>(
		'agent-text-completer',
		textCompleterTaskData
	);

	const textEnhanceTaskData: TextEnhanceTaskData = { prompt: '' };
	const textEnhanceTask = useTask<TextEnhanceTaskData>('agent-text-enhance', textEnhanceTaskData);

	const textWriterTaskData: TextWriterTaskData = { prompt: '' };
	const textWriterTask = useTask<TextWriterTaskData>('agent-text-writer', textWriterTaskData);

	const imageGeneratorTaskData: ImageGeneratorTaskData = { prompt: '' };
	const imageGeneratorTask = useTask<ImageGeneratorTaskData>(
		'agent-painter',
		imageGeneratorTaskData
	);

	const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
	const [assistantActiveTaskId, setAssistantActiveTaskId] = useState<string | null>(null);
	const assistantIsRunning = assistantActiveTaskId !== null;

	const stateRef = useRef({ title, content });
	stateRef.current = { title, content };

	const loadedRef = useRef(false);
	loadedRef.current = loaded;

	useEffect(() => {
		if (!id) return;
		let cancelled = false;

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
					if (!cancelled) setLoaded(true);
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
	}, [id, dispatch]);

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
	}, [id, loadImages, dispatch]);

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
					if (!id || !loadedRef.current) return;
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
			debouncedSave.flush();
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
		if (!textCompleterTask.taskId) return;
		const unsub = subscribeToTask(textCompleterTask.taskId, (snap: TaskSnapshot) => {
			const completed = snap.status === 'completed';
			editorRef.current?.insertText(snap.streamedContent, {
				preventEditorUpdate: !completed,
			});
		});
		return unsub;
	}, [textCompleterTask.taskId]);

	useEffect(() => {
		if (!textEnhanceTask.taskId) return;
		const unsub = subscribeToTask(textEnhanceTask.taskId, (snap: TaskSnapshot) => {
			if (snap.status == 'started') {
				const metadata = snap.metadata;
				const from = metadata?.from as number;
				const to = metadata?.to as number;
				editorRef.current?.deleteText(from, to);
			}
			const completed = snap.status === 'completed';
			editorRef.current?.insertText(snap.streamedContent, {
				preventEditorUpdate: !completed,
			});
		});
		return unsub;
	}, [textEnhanceTask.taskId]);

	const streamBufferRef = useRef('');
	const atBlockStartRef = useRef(true);

	useEffect(() => {
		if (!textWriterTask.taskId) return;
		streamBufferRef.current = '';
		atBlockStartRef.current = true;

		const PARTIAL_MARKER_RE = /^(#{1,6}|[-*]|\d+\.?)$/;
		const HEADING_RE = /^(#{1,6}) /;
		const BULLET_RE = /^[-*] /;
		const ORDERED_RE = /^\d+\. /;

		function processBuffer(completed: boolean): void {
			while (streamBufferRef.current.length > 0) {
				const buf = streamBufferRef.current;

				if (buf[0] === '\n') {
					if (buf[1] === '\n') {
						editorRef.current?.splitBlock();
						editorRef.current?.exitList();
						streamBufferRef.current = buf.slice(2);
						atBlockStartRef.current = true;
						continue;
					}
					if (buf.length === 1 && !completed) {
						break;
					}
					editorRef.current?.splitBlock();
					streamBufferRef.current = buf.slice(1);
					atBlockStartRef.current = true;
					continue;
				}

				if (atBlockStartRef.current) {
					const headingMatch = buf.match(HEADING_RE);
					if (headingMatch) {
						editorRef.current?.setHeading(headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6);
						streamBufferRef.current = buf.slice(headingMatch[0].length);
						atBlockStartRef.current = false;
						continue;
					}

					const bulletMatch = buf.match(BULLET_RE);
					if (bulletMatch) {
						editorRef.current?.ensureBulletList();
						streamBufferRef.current = buf.slice(bulletMatch[0].length);
						atBlockStartRef.current = false;
						continue;
					}

					const orderedMatch = buf.match(ORDERED_RE);
					if (orderedMatch) {
						editorRef.current?.ensureOrderedList();
						streamBufferRef.current = buf.slice(orderedMatch[0].length);
						atBlockStartRef.current = false;
						continue;
					}

					if (!completed && PARTIAL_MARKER_RE.test(buf)) {
						break;
					}

					atBlockStartRef.current = false;
				}

				const nextNewline = buf.indexOf('\n');
				if (nextNewline > 0) {
					editorRef.current?.insertText(buf.slice(0, nextNewline), {
						preventEditorUpdate: !completed,
					});
					streamBufferRef.current = buf.slice(nextNewline);
					continue;
				}

				editorRef.current?.insertText(buf, { preventEditorUpdate: !completed });
				streamBufferRef.current = '';
				break;
			}
		}

		const unsub = subscribeToTask(textWriterTask.taskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setContentGeneratorLoading(true);
				return;
			}

			const completed = snap.status === 'completed';

			if (snap.streamedContent) {
				streamBufferRef.current += snap.streamedContent;
			}

			processBuffer(completed);

			if (completed) {
				editorRef.current?.removeContentGenerator();
			}
		});
		return unsub;
	}, [textWriterTask.taskId]);

	useEffect(() => {
		if (!imageGeneratorTask.taskId) return;

		const unsub = subscribeToTask(imageGeneratorTask.taskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setContentGeneratorLoading(true);
				return;
			}

			if (snap.status === 'completed' && snap.result) {
				try {
					const agentOutput = snap.result as { content: string };
					const parsed = JSON.parse(agentOutput.content) as {
						imageUrl: string;
						revisedPrompt: string;
					};
					editorRef.current?.insertImage({
						src: parsed.imageUrl,
						alt: parsed.revisedPrompt,
					});
				} catch {
					// Result wasn't valid JSON - ignore
				}
				editorRef.current?.removeContentGenerator();
			}
		});
		return unsub;
	}, [imageGeneratorTask.taskId]);

	useEffect(() => {
		if (!assistantActiveTaskId) return;

		const unsub = subscribeToTask(assistantActiveTaskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setContentGeneratorLoading(true);
				return;
			}

			const completed = snap.status === 'completed';
			const output = snap.result as { content?: string } | undefined;
			const streamContent = output?.content ?? snap.streamedContent ?? '';

			if (streamContent) {
				editorRef.current?.insertText(streamContent, { preventEditorUpdate: !completed });
			}

			if (completed || snap.status === 'error' || snap.status === 'cancelled') {
				editorRef.current?.removeContentGenerator();
				setAssistantActiveTaskId(null);
			}
		});

		return unsub;
	}, [assistantActiveTaskId]);

	const handleAssistantSend = useCallback(
		async (before: string, after: string, cursorPos: number, input: string) => {
			if (!id || assistantIsRunning) return;

			editorRef.current?.setContentGeneratorEnable(false);

			const prompt = `
			${before}

			⬢ ${input} ⬢

			${after}
			`;

			const resolvedSessionId = assistantSessionId ?? uuidv7();
			if (!assistantSessionId) {
				setAssistantSessionId(resolvedSessionId);
			}

			if (typeof window.task?.submit !== 'function') return;

			try {
				const taskType = 'agent-assistant';
				const taskInput = { prompt };
				const metadata = {
					agentId: 'assistant',
					documentId: id,
					chatId: resolvedSessionId,
					before,
					after,
					cursorPos,
				};

				const ipcResult = await window.task.submit(taskType, taskInput, metadata);
				if (!ipcResult.success) return;

				const resolvedTaskId = ipcResult.data.taskId;
				initTaskMetadata(resolvedTaskId, metadata);
				setAssistantActiveTaskId(resolvedTaskId);
			} catch {
				// submission failed
			}
		},
		[assistantIsRunning, assistantSessionId, id]
	);

	const onContinueWithAssistant = useCallback(
		(before: string, after: string, cursorPos: number) => {
			const cleanBefore = before.replaceAll('⬢', '').trimEnd();
			const cleanAfter = after.replaceAll('⬢', '').trimStart();

			handleAssistantSend(cleanBefore, cleanAfter, cursorPos, 'CONTINUE WRITING HERE WITH 15 WORDS MAX');

			// const prompt = `
			// ${cleanBefore}
			//
			// ⬢ CONTINUE WRITING HERE WITH 15 WORDS MAX ⬢
			//
			// ${cleanAfter}
			// `;
			// const data: TextCompleterTaskData = { prompt };
			// textCompleterTask.submit(data);
		},
		[handleAssistantSend]
	);

	const onImageSubmit = useCallback(
		async (prompt: string) => {
			if (!id) return;
			editorRef.current?.setContentGeneratorEnable(false);
			const documentPath = await window.workspace.getDocumentPath(id);
			const data: ImageGeneratorTaskData = { prompt };
			const metadata = { documentPath };
			imageGeneratorTask.submit(data, metadata);
		},
		[imageGeneratorTask, id]
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
										disabled={
											textCompleterTask.isRunning ||
											textEnhanceTask.isRunning ||
											textWriterTask.isRunning ||
											imageGeneratorTask.isRunning ||
											assistantIsRunning
										}
										ref={editorRef}
										key={id}
										value={content}
										onSelectionChange={handleSelectionChange}
										externalValueVersion={editorExternalValueVersion}
										onChange={handleContentChange}
										onContinueWithAssistant={onContinueWithAssistant}
										onTextSubmit={handleAssistantSend}
										onImageSubmit={onImageSubmit}
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
