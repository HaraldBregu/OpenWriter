import { useCallback, useEffect, useRef, useState } from 'react';
import { Slice } from '@tiptap/pm/model';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { TaskEvent } from '../../../../../shared/types';
import type { PromptSubmitPayload } from '@shared/index';
import type { AiActionPayload } from '@/components/app/editor/components/BubbleMenu';
import type { EditorActions } from './use-editor';
import type { EditorStreamInsert } from './use-editor-stream-insert';

const TASK_TYPE = 'content-writer';

export interface UseDocumentAiTasksOptions {
	documentId: string | null;
	editor: TiptapEditor | null;
	editorActions: EditorActions;
	editorInsert: EditorStreamInsert;
	selection: { from: number; to: number } | null;
	/**
	 * Caller-owned busy state (e.g. preexisting task on this document, document-
	 * scoped task from another window). The hook's submit guards combine this
	 * with its own running state.
	 */
	isExternallyBusy: boolean;
	/**
	 * Invoked after a task completion writes new content back into the editor.
	 * Lets the page sync local state and persist the file.
	 */
	onMarkdownChanged: (markdown: string) => void;
}

export interface UseDocumentAiTasks {
	/** True while a prompt task or AI action task is in flight. */
	isRunning: boolean;
	/** Type of the AI action currently running, used by the BubbleMenu spinner. */
	activeAiAction: AiActionPayload['type'] | null;
	/** Latest captured task failure message; null when no error to surface. */
	taskError: string | null;
	/** Clears `taskError` (called when the error dialog is dismissed). */
	dismissTaskError: () => void;
	/** Submit a prompt typed in the editor's content-generator block. */
	submitPrompt: (payload: PromptSubmitPayload, editor: TiptapEditor) => Promise<void>;
	/** Submit a bubble-menu AI action (fix-grammar / improve-writing / custom). */
	submitAiAction: (action: AiActionPayload) => Promise<void>;
}

function extractTaskSelection(value: unknown): { from: number; to: number } | null {
	if (!value || typeof value !== 'object') return null;
	const v = value as { from?: unknown; to?: unknown };
	if (typeof v.from !== 'number' || typeof v.to !== 'number') return null;
	return { from: v.from, to: v.to };
}

/**
 * Owns the prompt-input task and AI-action flows for a document page.
 *
 *   prompt flow      → streams tokens into the editor at the inserted prompt
 *                       position via `editorInsert`, replacing on finish.
 *   AI-action flow   → submits a tagged prompt from the bubble menu and on
 *                       finish replaces the original selection range with the
 *                       returned markdown.
 *
 * Failures from either flow are captured into `taskError` for the page-level
 * error dialog to surface.
 */
export function useDocumentAiTasks(opts: UseDocumentAiTasksOptions): UseDocumentAiTasks {
	const { documentId, editor, editorActions, editorInsert, selection, isExternallyBusy } = opts;

	const onMarkdownChangedRef = useRef(opts.onMarkdownChanged);
	onMarkdownChangedRef.current = opts.onMarkdownChanged;

	const editorRef = useRef(editor);
	editorRef.current = editor;

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	const [aiActionTaskId, setAiActionTaskId] = useState<string | null>(null);
	const [activeAiAction, setActiveAiAction] = useState<AiActionPayload['type'] | null>(null);
	const [taskError, setTaskError] = useState<string | null>(null);

	const isRunning = activeTaskId !== null || aiActionTaskId !== null;
	const isBusy = isRunning || isExternallyBusy;
	const isBusyRef = useRef(isBusy);
	isBusyRef.current = isBusy;

	// ---- Prompt-flow stream handlers ----------------------------------------
	const handleDelta = useCallback(
		(token: string) => {
			editorInsert.appendDelta(token);
		},
		[editorInsert]
	);

	const handleCompleted = useCallback(
		(completedContent: string) => {
			editorInsert.commitFinal(completedContent);
			editorActions.hideLoading();
			editorActions.enable();
			editorActions.hidePromptStatusBar();
			editorActions.clearPromptInput();
			const ed = editorRef.current;
			if (!ed || ed.isDestroyed) return;
			onMarkdownChangedRef.current(ed.getMarkdown());
		},
		[editorInsert, editorActions]
	);

	const handleCancelOrError = useCallback(() => {
		editorInsert.revert();
		editorActions.hideLoading();
		editorActions.enable();
		editorActions.hidePromptStatusBar();
	}, [editorInsert, editorActions]);

	const taskHandlersRef = useRef({ handleDelta, handleCompleted, handleCancelOrError });
	taskHandlersRef.current = { handleDelta, handleCompleted, handleCancelOrError };

	// ---- Prompt-flow event listener -----------------------------------------
	useEffect(() => {
		if (!documentId || !activeTaskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.metadata.documentId !== documentId) return;
			const data = event.data.success ? event.data.data : '';
			editorActions.showPromptStatusBar(data);
			const handlers = taskHandlersRef.current;
			if (event.state === 'running') {
				handlers.handleDelta(data);
			} else if (event.state === 'finished') {
				handlers.handleCompleted(data);
				if (typeof window.task?.cancel === 'function') {
					void window.task.cancel(activeTaskId);
				}
				setActiveTaskId(null);
			} else if (event.state === 'cancelled') {
				if (!event.data.success && event.data.error.length > 0) {
					setTaskError(event.data.error);
				}
				handlers.handleCancelOrError();
				setActiveTaskId(null);
			}
		});
	}, [activeTaskId, documentId, editorActions]);

	// ---- AI-action event listener -------------------------------------------
	useEffect(() => {
		if (!documentId || !aiActionTaskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== aiActionTaskId) return;
			if (event.metadata.documentId !== documentId) return;

			if (event.state === 'finished' && event.data.success) {
				const responseText = event.data.data;
				const ed = editorRef.current;
				if (ed && !ed.isDestroyed) {
					const range = extractTaskSelection(event.metadata.selection);
					if (range) {
						const docSize = ed.state.doc.content.size;
						const from = Math.min(range.from, docSize);
						const to = Math.min(range.to, docSize);
						const json = ed.markdown?.parse(responseText);
						if (json) {
							const node = ed.schema.nodeFromJSON(json);
							const slice = new Slice(node.content, 0, 0);
							const tr = ed.state.tr.replaceRange(from, to, slice);
							ed.view.dispatch(tr);
						}
					}
					onMarkdownChangedRef.current(ed.getMarkdown());
				}

				if (typeof window.task?.cancel === 'function') {
					void window.task.cancel(aiActionTaskId);
				}
				setAiActionTaskId(null);
				setActiveAiAction(null);
			} else if (event.state === 'cancelled') {
				if (!event.data.success && event.data.error.length > 0) {
					setTaskError(event.data.error);
				}
				setAiActionTaskId(null);
				setActiveAiAction(null);
			}
		});
	}, [aiActionTaskId, documentId]);

	// ---- Submit: prompt task ------------------------------------------------
	const submitPrompt = useCallback(
		async (payload: PromptSubmitPayload, editorArg: TiptapEditor): Promise<void> => {
			if (!documentId || isBusyRef.current) return;
			if (typeof window.task?.submit !== 'function') return;

			let promptPos: number | null = null;
			editorArg.state.doc.descendants((node, pos) => {
				if (node.type.name === 'contentGenerator') {
					promptPos = pos;
					return false;
				}
				return true;
			});

			const from = promptPos ?? editorArg.state.selection.from;
			const to = promptPos ?? editorArg.state.selection.to;

			editorActions.showLoading();
			editorActions.disable();
			editorInsert.begin(from, to);

			const result = await window.task.submit({
				type: TASK_TYPE,
				input: { prompt: payload.prompt },
				metadata: { documentId, selection },
			});

			if (!result.success) {
				editorInsert.revert();
				editorActions.hideLoading();
				editorActions.enable();
				return;
			}
			setActiveTaskId(result.data.taskId);
		},
		[documentId, selection, editorActions, editorInsert]
	);

	// ---- Submit: AI action --------------------------------------------------
	const submitAiAction = useCallback(
		async (action: AiActionPayload): Promise<void> => {
			if (!documentId || isBusyRef.current) return;
			if (typeof window.task?.submit !== 'function') return;
			const ed = editorRef.current;
			if (!ed || ed.isDestroyed) return;

			const { from, to } = ed.state.selection;
			if (from === to) return;

			if (action.type === 'custom' && !action.prompt?.trim()) return;

			const sliceToMarkdown = (start: number, end: number): string => {
				if (start === end) return '';
				const slice = ed.state.doc.cut(start, end);
				return (
					ed.markdown?.serialize(slice.toJSON()) ??
					ed.state.doc.textBetween(start, end, '\n\n')
				);
			};

			const docSize = ed.state.doc.content.size;
			const before = sliceToMarkdown(0, from);
			const selectedText = sliceToMarkdown(from, to);
			const after = sliceToMarkdown(to, docSize);

			const instruction = action.type === 'custom' ? action.prompt : action.type;

			const prompt = [
				`<instruction>${instruction}</instruction>\n`,
				`<before>\n${before}\n</before>`,
				`<selection>\n${selectedText}\n</selection>`,
				`<after>\n${after}\n</after>`,
			].join('\n\n');

			setActiveAiAction(action.type);

			const result = await window.task.submit({
				type: TASK_TYPE,
				input: { prompt },
				metadata: { documentId, selection: { from, to } },
			});

			if (!result.success) {
				setActiveAiAction(null);
				return;
			}

			setAiActionTaskId(result.data.taskId);
		},
		[documentId]
	);

	const dismissTaskError = useCallback(() => {
		setTaskError(null);
	}, []);

	return {
		isRunning,
		activeAiAction,
		taskError,
		dismissTaskError,
		submitPrompt,
		submitAiAction,
	};
}
