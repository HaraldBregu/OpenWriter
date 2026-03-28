import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';
import Header from './Header';
import ResourcesPanel from './ResourcesPanel';
import ChatPanel from './ChatPanel';
import EditorPanel from './EditorPanel';
import { useEditorInstance, useSidebarVisibility, useChatState, useChatDispatch } from './context';
import { useDocumentDispatch, useChatPersistence } from './hooks';
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

type ResearcherTaskData = {
	prompt: string;
};

type ChatAgentId = 'researcher' | 'inventor';

interface LayoutProps {
	documentId: string | undefined;
}

interface ResearcherTaskOutput {
	content: string;
	tokenCount: number;
	agentId: string;
}

const Layout: React.FC<LayoutProps> = ({ documentId: id }) => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const dispatch = useDocumentDispatch();
	useChatPersistence(id);

	const chatDispatch = useChatDispatch();
	const { activeTaskId: chatActiveTaskId, activeMessageId: chatActiveMessageId } = useChatState();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);

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

	useEffect(() => {
		if (!chatActiveTaskId || !chatActiveMessageId) return;

		const taskId = chatActiveTaskId;
		const messageId = chatActiveMessageId;

		const unsubscribe = subscribeToTask(taskId, (snapshot: TaskSnapshot) => {
			const metadataDocumentId = snapshot.metadata?.documentId;
			const targetDocumentId =
				typeof metadataDocumentId === 'string' && metadataDocumentId.length > 0
					? metadataDocumentId
					: id;

			if (targetDocumentId !== id) return;

			switch (snapshot.status) {
				case 'queued':
				case 'started':
					chatDispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content: t('agenticPanel.researcherThinking', 'Researching...'),
							taskId,
							status: 'queued',
						},
					});
					break;
				case 'running':
					if (snapshot.content) {
						chatDispatch({
							type: 'CHAT_MESSAGE_UPDATED',
							id: messageId,
							patch: { content: snapshot.content, taskId, status: 'running' },
						});
					}
					break;
				case 'completed': {
					const output = snapshot.result as ResearcherTaskOutput | undefined;
					chatDispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content:
								output?.content ||
								snapshot.content ||
								t('agenticPanel.emptyResponse', 'No response received.'),
							taskId,
							status: 'completed',
						},
					});
					chatDispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					chatDispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					chatDispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.'),
							taskId,
							status: 'error',
						},
					});
					chatDispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					chatDispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					chatDispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The researcher request was cancelled.'),
							taskId,
							status: 'cancelled',
						},
					});
					chatDispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					chatDispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				default:
					break;
			}
		});

		return unsubscribe;
	}, [chatActiveTaskId, chatActiveMessageId, id, chatDispatch, t]);

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
		'agent-image-generator',
		imageGeneratorTaskData
	);

	const researcherTaskData: ResearcherTaskData = { prompt: '' };
	const researcherTask = useTask<ResearcherTaskData>('agent-researcher', researcherTaskData);
	const inventorTaskData: ResearcherTaskData = { prompt: '' };
	const inventorTask = useTask<ResearcherTaskData>('agent-text-writer', inventorTaskData);

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
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

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

	const handleMoveToTrash = useCallback(async () => {
		if (!id || isTrashing) return;

		setIsTrashing(true);

		debouncedSave.cancel();

		try {
			await window.workspace.trashOutput({ type: 'documents', id });
			navigate('/home');
		} catch (err) {
			console.error('[Layout] Failed to trash writing:', err);
			setIsTrashing(false);
		}
	}, [id, isTrashing, navigate, debouncedSave]);

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

	const onContinueWithAssistant = useCallback(
		(before: string, after: string, _cursorPos: number) => {
			const cleanBefore = before.replaceAll('⬢', '').trimEnd();
			const cleanAfter = after.replaceAll('⬢', '').trimStart();
			const prompt = `
			${cleanBefore}

			⬢ CONTINUE WRITING HERE WITH 15 WORDS MAX ⬢

			${cleanAfter}
			`;

			const data: TextCompleterTaskData = { prompt };
			textCompleterTask.submit(data);
		},
		[textCompleterTask]
	);

	const onEnhanceWithAssistant = useCallback(
		(selectedText: string, from: number, to: number) => {
			const data: TextEnhanceTaskData = { prompt: selectedText };
			const metadata = { type: 'replace_text', from, to };
			textEnhanceTask.submit(data, metadata);
		},
		[textEnhanceTask]
	);

	const onTextSubmit = useCallback(
		(before: string, after: string, cursorPos: number, input: string) => {
			editorRef.current?.setContentGeneratorEnable(false);
			const prompt = `
			${before}

			⬢ ${input} ⬢

			${after}
			`;
			const data: TextWriterTaskData = { prompt };
			const metadata = { before, after, cursorPos };
			textWriterTask.submit(data, metadata);
		},
		[textWriterTask]
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

	const onChatSubmit = useCallback(
		async (prompt: string, agentId: ChatAgentId | string) => {
			const data: ResearcherTaskData = { prompt };
			const metadata = id ? { documentId: id, agentId } : { agentId };
			if (agentId === 'inventor') {
				await inventorTask.submit(data, metadata);
				return;
			}
			await researcherTask.submit(data, metadata);
		},
		[id, inventorTask, researcherTask]
	);

	const activeResearcherTaskId =
		researcherTask.isQueued || researcherTask.isRunning ? researcherTask.taskId : null;
	const activeInventorTaskId =
		inventorTask.isQueued || inventorTask.isRunning ? inventorTask.taskId : null;
	const activeChatTaskId = activeResearcherTaskId ?? activeInventorTaskId ?? null;
	const isChatRunning =
		researcherTask.isQueued ||
		researcherTask.isRunning ||
		inventorTask.isQueued ||
		inventorTask.isRunning;

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
				isTrashing={isTrashing}
				onMoveToTrash={handleMoveToTrash}
				onSearch={handleSearch}
				onClearSearch={handleClearSearch}
				onOpenFolder={handleOpenFolder}
			/>

			{/* Editor + Right Sidebar */}
			<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
				<ResizablePanel defaultSize="70%" minSize="40%">
					<EditorPanel
						documentId={id}
						loaded={loaded}
						content={content}
						disabled={
							textCompleterTask.isRunning ||
							textEnhanceTask.isRunning ||
							textWriterTask.isRunning ||
							imageGeneratorTask.isRunning
						}
						editorRef={editorRef}
						onEditorReady={handleEditorReady}
						onContentChange={handleContentChange}
						onContinueWithAssistant={onContinueWithAssistant}
						onEnhanceWithAssistant={onEnhanceWithAssistant}
						onTextSubmit={onTextSubmit}
						onImageSubmit={onImageSubmit}
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
					<div className="h-full">
						{activeSidebar === 'config' && <ResourcesPanel onOpenFolder={handleOpenFolder} />}
						{activeSidebar === 'agentic' && (
							<ChatPanel
								taskId={activeChatTaskId}
								isRunning={isChatRunning}
								onSend={onChatSubmit}
							/>
						)}
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
};

export { Layout };
