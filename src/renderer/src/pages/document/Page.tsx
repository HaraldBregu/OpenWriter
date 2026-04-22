import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Undo2, Redo2 } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import InfoPanel from './panels/info/Panel';
import Chat from './panels/chat/Panel';
import ExtensionPanel from './panels/extension/Panel';
import HistoryMenu from './components/HistoryMenu';
import DocumentInfoPopover from './components/DocumentInfoPopover';
import { DocumentSidebarTabs, type DocumentSidebarTabItem } from './components/DocumentSidebarTabs';
import {
	useDocumentDispatch,
	useDocumentHistory,
	useDocumentState,
	useInsertContentDialog,
	useEditorInstance,
	useEditor,
	useAssistantTask,
	useEditorStreamInsert,
} from './hooks';
import { useSidebarVisibility } from '@/hooks/use-sidebar-visibility';
import type { ExtensionDocPanelInfo } from '../../../../shared/types';
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
import type { ActiveSidebar } from '@/contexts/SidebarVisibilityProvider';

const METADATA_SAVE_DEBOUNCE_MS = 500;
const CONTENT_SAVE_DEBOUNCE_MS = 1500;

function PageContent(): ReactElement {
	const { documentId: id } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const appDispatch = useAppDispatch();
	const navigate = useNavigate();
	const { setEditor } = useEditorInstance();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [contentVersion, setContentVersion] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [extensionDocPanels, setExtensionDocPanels] = useState<ExtensionDocPanelInfo[]>([]);

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
					window.workspace.updateDocumentConfig(id, { title: currentTitle });
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
					window.workspace.updateDocumentContent(id, contentRef.current);
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
	const submitRangeRef = useRef<{ from: number; to: number } | null>(null);

	const assistant = useAssistantTask({
		documentId: id,
		sessionIdRef,
		onPhase: useCallback((_, label: string) => {
			setPhaseLabel(label);
		}, []),
		onDelta: useCallback(
			(token: string) => {
				editorInsert.appendDelta(token);
			},
			[editorInsert]
		),
		onRecovery: useCallback(
			(fullContent: string, metadata) => {
				submitRangeRef.current = { from: metadata.posFrom, to: metadata.posTo };
				editorInsert.begin(metadata.posFrom, metadata.posTo);
				if (fullContent) editorInsert.appendDelta(fullContent);
			},
			[editorInsert]
		),
		onCompleted: useCallback(
			(content: string) => {
				editorInsert.commitFinal(content);
				setPhaseLabel(null);
				editorActions.hideLoading();
				editorActions.enable();
				editorActions.clearPromptInput();
				if (!id) return;
				const markdown = content;
				setContent(markdown);
				dispatch({ type: 'CONTENT_CHANGED', value: markdown });
				debouncedContentSave.cancel();
				window.workspace.updateDocumentContent(id, markdown).catch(() => {
					// document may have been deleted mid-run; ignore
				});
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						editorActions.insertPromptView();
					});
				});
			},
			[editorInsert, editorActions, id, dispatch, debouncedContentSave]
		),
		onCancelled: useCallback(() => {
			editorInsert.revert();
			setPhaseLabel(null);
			editorActions.hideLoading();
			editorActions.enable();
		}, [editorInsert, editorActions]),
		onError: useCallback(() => {
			editorInsert.revert();
			setPhaseLabel(null);
			editorActions.hideLoading();
			editorActions.enable();
		}, [editorInsert, editorActions]),
	});

	const assistantIsRunning = assistant.isRunning;

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
			submitRangeRef.current = { from, to };
			editorInsert.begin(from, to);

			const submitted = await assistant.submit({
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
		[assistant, assistantIsRunning, editorActions, editorInsert, id]
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

	const handleOpenChat = useCallback(() => {
		setActiveSidebar('builtin:agentic');
		requestAnimationFrame(() => {
			const el = document.querySelector<HTMLTextAreaElement>('[data-chat-input]');
			el?.focus();
		});
	}, [setActiveSidebar]);

	const handleOpenFolder = useCallback(() => {
		if (!id) return;
		window.workspace.openDocumentFolder(id);
	}, [id]);

	const sidebarItems = useMemo<DocumentSidebarTabItem[]>(
		() => [
			{
				id: 'builtin:agentic',
				title: t('agenticPanel.headerTitle', 'Chat'),
				meta: 'Built-in',
			},
			{
				id: 'builtin:config',
				title: t('configSidebar.documentInfo', 'Document info'),
				meta: 'Built-in',
			},
			...extensionDocPanels.map((panel) => ({
				id: panel.id,
				title: panel.title,
				meta: panel.extensionName,
			})),
		],
		[extensionDocPanels, t]
	);

	const activeExtensionPanel = useMemo(
		() => extensionDocPanels.find((panel) => panel.id === activeSidebar) ?? null,
		[activeSidebar, extensionDocPanels]
	);

	useEffect(() => {
		if (!activeSidebar) return;
		if (activeSidebar === 'builtin:agentic' || activeSidebar === 'builtin:config') return;
		if (extensionDocPanels.some((panel) => panel.id === activeSidebar)) return;
		setActiveSidebar('builtin:config');
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
									<DocumentInfoPopover
										documentId={id ?? null}
										title={title}
										content={content}
									/>
								</PageHeaderItems>
							</PageHeader>
							<TaskStatusBar taskId={assistantActiveTaskId} />
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
										onOpenChat={handleOpenChat}
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
						<div className="flex h-full min-h-0 flex-col">
							<DocumentSidebarTabs
								items={sidebarItems}
								activePanelId={activeSidebar}
								onSelect={(panelId) => setActiveSidebar(panelId as Exclude<ActiveSidebar, null>)}
							/>
							<div className="min-h-0 flex-1">
								{activeSidebar === 'builtin:config' && (
									<InfoPanel onOpenFolder={handleOpenFolder} />
								)}
								{activeSidebar === 'builtin:agentic' && <Chat />}
								{activeExtensionPanel && id ? (
									<ExtensionPanel panelId={activeExtensionPanel.id} documentId={id} />
								) : null}
							</div>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</PageBody>
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
