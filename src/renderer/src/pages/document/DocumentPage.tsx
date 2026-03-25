import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';
import type { OutputFileMetadata } from '../../../../shared/types';
import DocumentHeader from './DocumentHeader';
import ConfigSidebar from './ConfigSidebar';
import AgenticSidebar from './AgenticSidebar';
import EditorSidebar from './EditorSidebar';
import {
	DocumentProvider,
	EditorInstanceProvider,
	SidebarVisibilityProvider,
	useEditorInstance,
	useSidebarVisibility,
} from './context';
import { useDocumentDispatch } from './hooks';

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

const DocumentPageInner: React.FC<{ documentId: string | undefined }> = ({ documentId: id }) => {
	const navigate = useNavigate();
	const dispatch = useDocumentDispatch();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);

	const { activeSidebar, animate } = useSidebarVisibility();
	const { setEditor } = useEditorInstance();

	const handleEditorReady = useCallback(
		(editor: Editor | null) => {
			setEditor(editor);
		},
		[setEditor]
	);

	const editorRef = useRef<TextEditorElement>(null);

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
	}, [id]);

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
			console.error('[DocumentPage] Failed to trash writing:', err);
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
			<DocumentHeader
				title={title}
				onTitleChange={handleTitleChange}
				isTrashing={isTrashing}
				onMoveToTrash={handleMoveToTrash}
				onSearch={handleSearch}
				onClearSearch={handleClearSearch}
				onOpenFolder={handleOpenFolder}
			/>

			{/* Editor + Right Sidebar */}
			<div className="flex-1 flex min-h-0">
				<div className="flex-1 flex flex-col min-w-0">
					<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
						<div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-2">
							{loaded && (
								<TextEditor
									disabled={
										textCompleterTask.isRunning ||
										textEnhanceTask.isRunning ||
										textWriterTask.isRunning ||
										imageGeneratorTask.isRunning
									}
									ref={editorRef}
									key={id}
									value={content}
									onChange={handleContentChange}
									onContinueWithAssistant={onContinueWithAssistant}
									onEnhanceWithAssistant={onEnhanceWithAssistant}
									onTextSubmit={onTextSubmit}
									onImageSubmit={onImageSubmit}
									documentId={id}
									onEditorReady={handleEditorReady}
								/>
							)}
						</div>
					</div>
				</div>

				<EditorSidebar open={activeSidebar === 'editor'} animate={animate} />
				<ConfigSidebar
					open={activeSidebar === 'config'}
					animate={animate}
					onOpenFolder={handleOpenFolder}
				/>
				<AgenticSidebar open={activeSidebar === 'agentic'} animate={animate} />
			</div>
		</div>
	);
};

const DocumentPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();

	return (
		<DocumentProvider documentId={id}>
			<SidebarVisibilityProvider>
				<EditorInstanceProvider>
					<DocumentPageInner documentId={id} />
				</EditorInstanceProvider>
			</SidebarVisibilityProvider>
		</DocumentProvider>
	);
};

export default DocumentPage;
