import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';
import DocumentHeader from './DocumentHeader';
import ConfigSidebar from './ConfigSidebar';

const DocumentPage: React.FC = () => {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const editorRef = useRef<TextEditorElement>(null);

	const task = useTask<{ prompt: string }>('agent-writing-assistant', {
		prompt: '',
	});
	console.log(`[DocumentPage] rendered`);

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

	const { charCount, wordCount } = useMemo(() => {
		const trimmed = content.trim();
		const chars = trimmed.length;
		const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
		return { charCount: chars, wordCount: words };
	}, [content]);

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
		if (!task.taskId) return;
		const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
			const completed = snap.status === 'completed';
			console.log(`[DocumentPage] Received task update:`, snap);
			editorRef.current?.insertText(snap.streamedContent, {
				preventEditorUpdate: !completed,
			});
		});
		return unsub;
	}, [task.taskId]);

	const handleContinueWithAI = useCallback(
		(content: string, positionFrom: number) => {
			task.submit({ prompt: content }, { metadata: { positionFrom } });
		},
		[task.submit]
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
									disabled={task.isRunning}
									ref={editorRef}
									key={id}
									value={content}
									onChange={handleContentChange}
									onContinueWithAI={handleContinueWithAI}
								/>
							)}
						</div>
					</div>

					<div className="shrink-0 flex items-center justify-end px-8 py-2 border-t border-border">
						<span className="text-xs text-muted-foreground">
							{t('writing.charactersAndWords', {
								chars: charCount,
								words: wordCount,
							})}
						</span>
					</div>
				</div>

				<ConfigSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			</div>
		</div>
	);
};

export default DocumentPage;
