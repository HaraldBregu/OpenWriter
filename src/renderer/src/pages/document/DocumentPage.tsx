import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';
import DocumentHeader from './DocumentHeader';
import ConfigSidebar from './ConfigSidebar';

type TextCompleterTaskData = {
	prompt: string;
};

type TextEnhanceTaskData = {
	prompt: string;
};

type TextWriterTaskData = {
	prompt: string;
};

const DocumentPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);

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

	useEffect(() => {
		if (!textWriterTask.taskId) return;
		const unsub = subscribeToTask(textWriterTask.taskId, (snap: TaskSnapshot) => {
			if (snap.status === 'started') {
				editorRef.current?.setImagePlaceholderLoading(true);
			}
			const completed = snap.status === 'completed';
			editorRef.current?.insertText(snap.streamedContent, {
				preventEditorUpdate: !completed,
			});
			if (completed) {
				editorRef.current?.removeImagePlaceholder();
			}
		});
		return unsub;
	}, [textWriterTask.taskId]);

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

	const onAgentPromptSubmit = useCallback(
		(_before: string, _after: string, _cursorPos: number, _prompt: string) => {
			editorRef.current?.setAgentPromptLoading(true);
			editorRef.current?.setAgentPromptEnable(false);
			setTimeout(() => {
				editorRef.current?.insertText("[Agent's response will appear here]");
			}, 250);
		},
		[]
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
				sidebarOpen={sidebarOpen}
				onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
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
									disabled={textCompleterTask.isRunning || textEnhanceTask.isRunning}
									ref={editorRef}
									key={id}
									value={content}
									onChange={handleContentChange}
									onContinueWithAssistant={onContinueWithAssistant}
									onEnhanceWithAssistant={onEnhanceWithAssistant}
									onAgentPromptSubmit={onAgentPromptSubmit}
								/>
							)}
						</div>
					</div>
				</div>

				<ConfigSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			</div>
		</div>
	);
};

export default DocumentPage;
