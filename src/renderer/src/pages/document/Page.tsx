import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2 } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ExtensionPanel from './panels/extension/Panel';
import HistoryMenu from './components/HistoryMenu';
import DocumentInfoPopover from './components/DocumentInfoPopover';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useEditorInstance,
	useEditor,
	useEditorStreamInsert,
} from './hooks';
import { useSidebarVisibility } from '@/hooks/use-sidebar-visibility';
import type {
	AgentCompletedOutput,
	AgentDeltaPayload,
	AgentPhase,
	AgentPhasePayload,
	AssistantTaskMetadata,
	ExtensionDocumentContextSnapshot,
	ExtensionDocPanelInfo,
	TaskEvent,
} from '../../../../shared/types';
import { TaskStatusBar } from './components/TaskStatusBar';
import { useAppDispatch } from '../../store';
import { documentMetadataPatched } from '../../store/workspace';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/Resizable';
import { usePanelRef } from 'react-resizable-panels';
import Layout from './Layout';
import { PageContainer, PageHeader, PageHeaderItems, PageHeaderTitle } from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import { Editor, EditorElement } from '@/components/app/editor/Editor';
import type { AssistantAction } from '@/components/app/editor/context/context';
import { PromptSubmitPayload } from '@shared/index';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;
const AGENT_TYPE = 'writer';

function PageContent(): ReactElement {
	const { documentId: id, selection } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { editor, setEditor } = useEditorInstance();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [contentVersion, setContentVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [extensionDocPanels, setExtensionDocPanels] = useState<ExtensionDocPanelInfo[]>([]);
	const [editorContextVersion, setEditorContextVersion] = useState(0);

	const { activeSidebar, setActiveSidebar } = useSidebarVisibility();
	const { openInsertContentDialog } = useInsertContentDialog();
	const { t } = useTranslation();

	const editorRef = useRef<EditorElement>(null);
	const sidebarPanelRef = usePanelRef();

	useEffect(() => {
		if (activeSidebar) {
			sidebarPanelRef.current?.expand();
		} else {
			sidebarPanelRef.current?.collapse();
		}
	}, [activeSidebar, sidebarPanelRef]);

	const loadExtensionDocPanels = useCallback(async () => {
		if (!id) {
			setExtensionDocPanels([]);
			return;
		}

		try {
			const panels = await window.extensions.getDocPanels(id);
			setExtensionDocPanels(panels);
		} catch {
			setExtensionDocPanels([]);
		}
	}, [id]);

	const stateRef = useRef({ title });
	stateRef.current = { title };

	const contentRef = useRef(content);
	contentRef.current = content;

	const loadedRef = useRef(loaded);
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
				const [loadedContent, config] = await Promise.all([
					window.workspace.getDocumentContent(id!),
					window.workspace.getDocumentConfig(id!),
				]);

				if (cancelled) return;

				setTitle(config.title || '');
				setContent(loadedContent);

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

	useEffect(() => {
		void loadExtensionDocPanels();
	}, [loadExtensionDocPanels]);

	useEffect(() => {
		if (!editor || editor.isDestroyed) return;

		const bump = (): void => {
			setEditorContextVersion((current) => current + 1);
		};

		editor.on('selectionUpdate', bump);
		editor.on('transaction', bump);
		editor.on('focus', bump);
		editor.on('blur', bump);

		return () => {
			editor.off('selectionUpdate', bump);
			editor.off('transaction', bump);
			editor.off('focus', bump);
			editor.off('blur', bump);
		};
	}, [editor]);

	const extensionDocumentContext = useMemo<ExtensionDocumentContextSnapshot | null>(() => {
		if (!id || !editor || editor.isDestroyed) return null;
		return buildExtensionDocumentContext(id, content, selection, editor);
	}, [content, editor, editorContextVersion, id, selection]);

	const lastPublishedExtensionContextRef = useRef<string>('');
	useEffect(() => {
		if (!id || !extensionDocumentContext) return;

		const serialized = JSON.stringify(extensionDocumentContext);
		if (serialized === lastPublishedExtensionContextRef.current) {
			return;
		}

		const timer = window.setTimeout(() => {
			lastPublishedExtensionContextRef.current = serialized;
			void window.extensions.setDocumentContext(id, extensionDocumentContext);
		}, 120);

		return () => {
			window.clearTimeout(timer);
		};
	}, [extensionDocumentContext, id]);

	useEffect(() => {
		const unsubscribeRegistry = window.extensions.onRegistryChanged(() => {
			void loadExtensionDocPanels();
		});
		const unsubscribeDocPanels = window.extensions.onDocPanelsChanged(() => {
			void loadExtensionDocPanels();
		});

		return () => {
			unsubscribeRegistry();
			unsubscribeDocPanels();
		};
	}, [loadExtensionDocPanels]);

	useEffect(() => {
		if (!id) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== id) return;

			if (event.type === 'removed') {
				documentDeletedRef.current = true;
				navigate('/home', { replace: true });
			}
		});

		return unsubscribe;
	}, [id, navigate]);

	useEffect(() => {
		if (!id) return;

		const unsubscribe = window.workspace.onDocumentImageChange((event) => {
			if (event.documentId !== id) return;
			loadImages();
		});

		return unsubscribe;
	}, [id, loadImages]);

	const debouncedMetadataSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					const { title: currentTitle } = stateRef.current;
					window.workspace.updateDocument(id, { config: { title: currentTitle } });
				},
				METADATA_SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[id]
	);

	const debouncedContentSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current || documentDeletedRef.current) return;
					window.workspace.updateDocument(id, { content: contentRef.current });
				},
				CONTENT_SAVE_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[id]
	);

	useEffect(() => {
		return () => {
			if (!documentDeletedRef.current) {
				debouncedMetadataSave.flush();
				debouncedContentSave.flush();
			}
			debouncedMetadataSave.cancel();
			debouncedContentSave.cancel();
		};
	}, [debouncedMetadataSave, debouncedContentSave]);

	const editorActions = useEditor(editorRef);

	const sessionIdRef = useRef<string | null>(null);
	const [phaseLabel, setPhaseLabel] = useState<string | null>(null);

	const editorInsert = useEditorStreamInsert();

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	const assistantIsRunning = activeTaskId !== null;

	const handleDelta = useCallback(
		(token: string) => {
			editorInsert.appendDelta(token);
		},
		[editorInsert]
	);

	const handleRecovery = useCallback(
		(fullContent: string, metadata: AssistantTaskMetadata) => {
			editorActions.showLoading();
			editorActions.disable();
			editorInsert.begin(metadata.posFrom, metadata.posTo);
			if (fullContent) editorInsert.appendDelta(fullContent);
		},
		[editorInsert, editorActions]
	);

	const handleCompleted = useCallback(
		(completedContent: string) => {
			editorInsert.commitFinal(completedContent);
			setPhaseLabel(null);
			editorActions.hideLoading();
			editorActions.enable();
			editorActions.clearPromptInput();
			if (!id || !editor || editor.isDestroyed) return;
			const fullMarkdown = editor.getMarkdown();
			setContent(fullMarkdown);
			dispatch({ type: 'CONTENT_CHANGED', value: fullMarkdown });
			debouncedContentSave.cancel();
			window.workspace.updateDocument(id, { content: fullMarkdown }).catch(() => {
				// document may have been deleted mid-run; ignore
			});
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					editorActions.insertPromptView();
				});
			});
		},
		[editorInsert, editorActions, id, dispatch, debouncedContentSave, editor]
	);

	const handleCancelOrError = useCallback(() => {
		editorInsert.revert();
		setPhaseLabel(null);
		editorActions.hideLoading();
		editorActions.enable();
	}, [editorInsert, editorActions]);

	const taskHandlersRef = useRef({ handleDelta, handleRecovery, handleCompleted, handleCancelOrError });
	taskHandlersRef.current = { handleDelta, handleRecovery, handleCompleted, handleCancelOrError };

	// Subscribe once to task events; route to the active task via refs.
	useEffect(() => {
		if (typeof window.task?.onEvent !== 'function') return;
		return window.task.onEvent((event: TaskEvent) => {
			const currentId = activeTaskIdRef.current;
			if (!currentId || event.taskId !== currentId) return;
			const h = taskHandlersRef.current;

			if (event.state === 'running') {
				const inner = readInnerEvent(event.data);
				if (!inner) return;
				if (inner.kind === 'phase') {
					const payload = inner.payload as AgentPhasePayload;
					if (payload?.phase) setPhaseLabel(payload.label);
				} else if (inner.kind === 'delta') {
					const payload = inner.payload as AgentDeltaPayload;
					if (typeof payload?.token === 'string' && typeof payload?.fullContent === 'string') {
						h.handleDelta(payload.token);
					}
				} else if (inner.kind === 'intent') {
					const payload = inner.payload as { intent?: string; summary?: string } | null;
					if (payload?.intent) setPhaseLabel(`Intent: ${payload.intent}`);
				} else if (inner.kind === 'decision') {
					const payload = inner.payload as { action?: string } | null;
					if (payload?.action === 'text') setPhaseLabel('Writing…');
					else if (payload?.action === 'skill') setPhaseLabel('Selecting skill…');
					else if (payload?.action === 'done') setPhaseLabel('Finishing…');
				} else if (inner.kind === 'skill:selected') {
					const payload = inner.payload as { skillName?: string } | null;
					if (payload?.skillName) setPhaseLabel(`Skill selected: ${payload.skillName}`);
				}
				return;
			}

			if (event.state === 'completed') {
				const result = readCompletedResult(event.data);
				if (result) {
					h.handleCompleted(result.content);
					markTaskApplied(event.taskId);
				}
				setActiveTaskId(null);
				return;
			}

			if (event.state === 'cancelled' || event.state === 'error') {
				h.handleCancelOrError();
				setActiveTaskId(null);
			}
		});
	}, []);

	// Mount-time recovery: find any existing task tied to this document.
	const ready = loaded && editor != null;
	useEffect(() => {
		if (!id || !ready) return;
		if (typeof window.task?.findForDocument !== 'function') return;
		let cancelled = false;

		(async () => {
			const lookup = await window.task.findForDocument(id);
			if (cancelled || !lookup.success || !lookup.data) return;
			const found = lookup.data;
			const h = taskHandlersRef.current;

			if (isActiveTaskState(found.state)) {
				setActiveTaskId(found.taskId);
				if (typeof window.task.getSnapshot === 'function') {
					const snap = await window.task.getSnapshot(found.taskId);
					if (cancelled) return;
					if (snap.success && snap.data) {
						h.handleRecovery(snap.data.fullContent, snap.data.metadata);
						setPhaseLabel(labelForPhase(snap.data.phase));
					}
				}
				return;
			}

			if (found.state === 'completed' && found.result) {
				if (isTaskApplied(found.taskId)) return;
				h.handleRecovery('', found.metadata);
				h.handleCompleted(found.result.content);
				markTaskApplied(found.taskId);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [id, ready]);

	const submitAssistantTask = useCallback(
		async (args: {
			prompt: string;
			files: { name: string; mimeType?: string }[];
			posFrom: number;
			posTo: number;
		}): Promise<boolean> => {
			if (!id || activeTaskIdRef.current) return false;
			if (typeof window.task?.submit !== 'function') return false;

			const sessionId = sessionIdRef.current ?? uuidv7();
			sessionIdRef.current = sessionId;

			const metadata: AssistantTaskMetadata = {
				sessionId,
				documentId: id,
				posFrom: args.posFrom,
				posTo: args.posTo,
			};

			const result = await window.task.submit({
				type: 'agent',
				input: {
					agentType: AGENT_TYPE,
					input: {
						prompt: args.prompt,
						files: args.files.map((f) => ({ name: f.name, mimeType: f.mimeType })),
					},
				},
				metadata: metadata as unknown as Record<string, unknown>,
			});

			if (!result.success) return false;
			setActiveTaskId(result.data.taskId);
			return true;
		},
		[id]
	);

	const handlePromptSubmit = useCallback(
		async (payload: PromptSubmitPayload, editor: TiptapEditor) => {
			if (!id || assistantIsRunning) return;

			const { from, to } = editor.state.selection;
			const doc = editor.state.doc;
			const textBefore = editor.markdown?.serialize(doc.cut(0, from).toJSON()) ?? '';
			const textAfter = editor.markdown?.serialize(doc.cut(to, doc.content.size).toJSON()) ?? '';

			const composedPrompt = [
				'Text before cursor:',
				textBefore,
				'',
				'Instruction:',
				payload.prompt,
				'',
				'Text after cursor:',
				textAfter,
			].join('\n');

			editorActions.showLoading();
			editorActions.disable();
			editorInsert.begin(from, to);

			const submitted = await submitAssistantTask({
				prompt: composedPrompt,
				files: payload.files.map((f) => ({ name: f.name, mimeType: f.type || undefined })),
				posFrom: from,
				posTo: to,
			});

			if (!submitted) {
				editorInsert.revert();
				editorActions.hideLoading();
				editorActions.enable();
			}
		},
		[submitAssistantTask, assistantIsRunning, editorActions, editorInsert, id]
	);

	const handleHistoryRestore = useCallback(
		(restoredContent: string, restoredTitle: string) => {
			setContent(restoredContent);
			setContentVersion((v) => v + 1);
			dispatch({ type: 'CONTENT_CHANGED', value: restoredContent });
			debouncedContentSave();
			setTitle(restoredTitle);
			debouncedMetadataSave();
		},
		[dispatch, debouncedContentSave, debouncedMetadataSave]
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

	useEffect(() => {
		if (!id || !loaded) return;
		appDispatch(documentMetadataPatched({ id, title, updatedAt: Date.now() }));
	}, [id, title, loaded, appDispatch]);

	const handleContentChange = useCallback(
		(newContent: string) => {
			setContent(newContent);
			dispatch({ type: 'CONTENT_CHANGED', value: newContent });
			debouncedContentSave();
		},
		[dispatch, debouncedContentSave]
	);

	const handleSelectionChange = useCallback(
		(selection: { from: number; to: number } | null) => {
			dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
		},
		[dispatch]
	);

	const handleEditorReady = useCallback(
		(editor: TiptapEditor | null) => {
			setEditor(editor);
		},
		[setEditor]
	);

	const handleAssistantAction = useCallback(
		(action: AssistantAction, editor: TiptapEditor) => {
			const { from, to } = editor.state.selection;
			const selectedText =
				from === to
					? ''
					: (editor.markdown?.serialize(editor.state.doc.cut(from, to).toJSON()) ?? '');

			const instructionByAction: Record<AssistantAction, string> = {
				improve: 'Improve the writing of the following text while preserving its meaning.',
				'fix-grammar': 'Fix grammar and spelling mistakes in the following text.',
				summarize: 'Summarize the following text concisely.',
				translate: 'Translate the following text to English.',
				'continue-writing': 'Continue writing from where the text ends, matching tone and style.',
			};

			void handlePromptSubmit(
				{
					prompt: `${instructionByAction[action]}\n\n${selectedText}`.trim(),
					files: [],
					editor,
				},
				editor
			);
		},
		[handlePromptSubmit]
	);

	const handleInsertContent = useCallback(() => {
		openInsertContentDialog();
	}, [openInsertContentDialog]);

	const activeExtensionPanel = useMemo(
		() => extensionDocPanels.find((panel) => panel.id === activeSidebar) ?? null,
		[activeSidebar, extensionDocPanels]
	);

	useEffect(() => {
		if (!activeSidebar) return;
		if (extensionDocPanels.some((panel) => panel.id === activeSidebar)) return;
		setActiveSidebar(null);
	}, [activeSidebar, extensionDocPanels, setActiveSidebar]);

	return (
		<PageContainer>
			<PageBody>
				<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
					<ResizablePanel defaultSize="70%" minSize="40%">
						<div className="flex h-full flex-col">
							<PageHeader>
								<PageHeaderTitle>
									<Input
										type="text"
										value={title}
										onChange={(e) => handleTitleChange(e.target.value)}
										placeholder={t('writing.titlePlaceholder')}
										className="text-md! font-medium border-0 bg-transparent dark:bg-transparent rounded-none p-0 tracking-tight focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
									/>
								</PageHeaderTitle>
								<PageHeaderItems>
									<Button
										variant="ghost"
										size="icon"
										title="Undo"
										aria-label="Undo"
										onClick={handleUndo}
										disabled={!canUndo}
									>
										<Undo2 aria-hidden="true" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
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
									<DocumentInfoPopover documentId={id ?? null} title={title} content={content} />
								</PageHeaderItems>
							</PageHeader>
							<TaskStatusBar taskId={activeTaskId} phaseLabel={phaseLabel} />
							<div className="flex min-h-0 flex-1 flex-col">
								{loaded && (
									<Editor
										key={id}
										disabled={assistantIsRunning}
										ref={editorRef}
										value={content}
										externalValueVersion={contentVersion}
										onChange={handleContentChange}
										onSelectionChange={handleSelectionChange}
										onPromptSubmit={handlePromptSubmit}
										onInsertContent={handleInsertContent}
										onAssistantAction={handleAssistantAction}
										documentId={id}
										onEditorReady={handleEditorReady}
										onUndo={handleUndo}
										onRedo={handleRedo}
									/>
								)}
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
						{activeExtensionPanel && id ? (
							<ExtensionPanel panelId={activeExtensionPanel.id} documentId={id} />
						) : null}
					</ResizablePanel>
				</ResizablePanelGroup>
			</PageBody>
		</PageContainer>
	);
}

function isActiveTaskState(state: string): boolean {
	return state === 'queued' || state === 'started' || state === 'running';
}

// Tracks which agent task results have already been applied to the editor in
// this window session. Prevents re-application when the document is remounted
// and `findForDocument` returns a task that's still within the executor's TTL.
const APPLIED_TASKS_STORAGE_KEY = 'document.appliedTaskIds';

function readAppliedTaskIds(): Set<string> {
	try {
		const raw = window.sessionStorage.getItem(APPLIED_TASKS_STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? new Set(parsed) : new Set();
	} catch {
		return new Set();
	}
}

function isTaskApplied(taskId: string): boolean {
	return readAppliedTaskIds().has(taskId);
}

function markTaskApplied(taskId: string): void {
	try {
		const set = readAppliedTaskIds();
		set.add(taskId);
		window.sessionStorage.setItem(APPLIED_TASKS_STORAGE_KEY, JSON.stringify([...set]));
	} catch {
		// sessionStorage unavailable; recovery may re-apply but no other harm.
	}
}

function labelForPhase(phase: AgentPhase): string {
	switch (phase) {
		case 'thinking':
			return 'Thinking';
		case 'writing':
			return 'Writing';
		case 'generating-image':
			return 'Generating image';
		case 'completed':
			return 'Done';
		case 'error':
			return 'Error';
		case 'cancelled':
			return 'Cancelled';
		default:
			return 'Queued';
	}
}

function readInnerEvent(data: unknown): { kind: string; payload: unknown } | null {
	if (!data || typeof data !== 'object') return null;
	const event = (data as { event?: unknown }).event;
	if (!event || typeof event !== 'object') return null;
	const { kind, payload } = event as { kind?: unknown; payload?: unknown };
	if (typeof kind !== 'string') return null;
	return { kind, payload };
}

function readCompletedResult(data: unknown): AgentCompletedOutput | null {
	if (!data || typeof data !== 'object') return null;
	const result = (data as { result?: unknown }).result;
	if (!result || typeof result !== 'object') return null;
	const { content, stoppedReason } = result as Record<string, unknown>;
	if (typeof content !== 'string') return null;
	if (stoppedReason !== 'done' && stoppedReason !== 'max-steps' && stoppedReason !== 'stagnation') {
		return null;
	}
	return { content, stoppedReason };
}

function buildExtensionDocumentContext(
	documentId: string,
	markdown: string,
	selection: { from: number; to: number } | null,
	editor: TiptapEditor
): ExtensionDocumentContextSnapshot {
	const selectionSnapshot =
		selection && selection.from !== selection.to
			? {
					from: selection.from,
					to: selection.to,
					text: editor.state.doc.textBetween(selection.from, selection.to, '\n\n'),
				}
			: null;

	const activeMarks = Array.from(
		new Set(editor.state.selection.$from.marks().map((mark) => mark.type.name))
	).sort();

	return {
		documentId,
		markdown,
		selection: selectionSnapshot,
		editorState: {
			isFocused: editor.isFocused,
			isEditable: editor.isEditable,
			isEmpty: editor.isEmpty,
			activeNode: editor.state.selection.$from.parent.type.name,
			activeMarks,
		},
	};
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
