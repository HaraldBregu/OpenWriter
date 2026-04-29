import { useCallback, useEffect, useRef, useState } from 'react';
import { Slice } from '@tiptap/pm/model';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { TaskEvent } from '../../../../../shared/types';
import type { PromptSubmitPayload } from '@/components/app/editor/types';
import type { EditorActions } from './use-editor';

interface InsertSession {
	origin: number;
	insertedLength: number;
	buffer: string;
}

const TASK_TYPE = 'content-reviewer';

const PROMPT_TEMPLATE = `Enhance the selected text below. The text uses Markdown formatting (e.g., **bold**, *italic*, \`code\`, [links](url), lists, headings). You MUST preserve all existing Markdown formatting in your output — keep the same emphasis, links, code spans, and structural elements on the same words and phrases as in the original.

Use the surrounding context (text before and after) only to understand tone, style, and intent — do NOT modify or include the surrounding text in your output.

<context_before>
{{TEXT_BEFORE}}
</context_before>

<selected_text>
{{SELECTED_TEXT}}
</selected_text>

<context_after>
{{TEXT_AFTER}}
</context_after>

Instructions: {{USER_INSTRUCTION}}

Formatting rules:
- Preserve all Markdown syntax exactly: **bold**, *italic*, ***bold italic***, ~~strikethrough~~, \`inline code\`, [link text](url), images, headings (#, ##, ###), blockquotes (>), lists (-, *, 1.), tables, and code blocks (\`\`\`).
- If a word or phrase is emphasized in the original, keep it emphasized in the enhanced version — even if the wording changes, apply the same emphasis to the equivalent word/phrase.
- Do not add new formatting that wasn't in the original unless the user explicitly asks for it.
- Do not remove formatting unless the original phrase is being deleted entirely.
- Never modify content inside \`inline code\` or fenced code blocks.
- Never modify URLs inside link targets — only the visible link text may be edited.
- Preserve list structure, indentation, and heading levels.
- Preserve line breaks and paragraph boundaries unless restructuring is part of the requested enhancement.

Return only the enhanced version of the selected text, with all Markdown formatting intact. Do not repeat the surrounding context. Do not wrap your response in code fences. Do not add explanations.`;

function buildReviewPrompt(args: {
	textBefore: string;
	selectedText: string;
	textAfter: string;
	userInstruction: string;
}): string {
	return PROMPT_TEMPLATE.replaceAll('{{TEXT_BEFORE}}', args.textBefore)
		.replaceAll('{{SELECTED_TEXT}}', args.selectedText)
		.replaceAll('{{TEXT_AFTER}}', args.textAfter)
		.replaceAll('{{USER_INSTRUCTION}}', args.userInstruction);
}

export interface UseDocumentAiTasksOptions {
	documentId: string | null;
	editor: TiptapEditor | null;
	editorActions: EditorActions;
	isExternallyBusy: boolean;
	onMarkdownChanged: (markdown: string) => void;
}

export interface UseDocumentAiTasks {
	isRunning: boolean;
	taskError: string | null;
	dismissTaskError: () => void;
	submit: (payload: PromptSubmitPayload) => Promise<void>;
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
 *                       position, replacing with parsed markdown on finish.
 *   AI-action flow   → submits a tagged prompt from the bubble menu and on
 *                       finish replaces the original selection range with the
 *                       returned markdown.
 *
 * Failures from either flow are captured into `taskError` for the page-level
 * error dialog to surface.
 */
export function useDocumentAiTasks(opts: UseDocumentAiTasksOptions): UseDocumentAiTasks {
	const { documentId, editor, editorActions, isExternallyBusy } = opts;

	const onMarkdownChangedRef = useRef(opts.onMarkdownChanged);
	onMarkdownChangedRef.current = opts.onMarkdownChanged;

	const editorRef = useRef(editor);
	editorRef.current = editor;

	// ---- Streaming insert ---------------------------------------------------
	// Streams agent-generated markdown into the editor at a tracked position.
	// Each delta appends to a buffer that is re-parsed as markdown and rendered
	// synchronously. Editor update events are suppressed via the
	// `preventEditorUpdate` meta so the document's `onChange` handler does not
	// persist intermediate states.
	const sessionRef = useRef<InsertSession | null>(null);

	const clampPos = useCallback((ed: TiptapEditor, pos: number): number => {
		const size = ed.state.doc.content.size;
		if (pos < 0) return 0;
		if (pos > size) return size;
		return pos;
	}, []);

	const renderBuffer = useCallback((): void => {
		const ed = editorRef.current;
		if (!ed || ed.isDestroyed) return;
		const session = sessionRef.current;
		if (!session) return;

		const from = clampPos(ed, session.origin);
		const to = clampPos(ed, session.origin + session.insertedLength);
		const sizeBefore = ed.state.doc.content.size;

		let tr = ed.state.tr;
		const json = session.buffer ? ed.markdown?.parse(session.buffer) : null;
		if (json) {
			const doc = ed.schema.nodeFromJSON(json);
			const slice = new Slice(doc.content, 0, 0);
			tr = tr.replaceRange(from, to, slice);
		} else {
			tr = tr.delete(from, to);
			if (session.buffer) tr = tr.insertText(session.buffer, from);
		}

		const newInsertedLength = session.insertedLength + (tr.doc.content.size - sizeBefore);
		tr.setMeta('preventEditorUpdate', true);

		ed.view.dispatch(tr);
		session.insertedLength = newInsertedLength;
	}, [clampPos]);

	const appendDelta = useCallback(
		(token: string): void => {
			const session = sessionRef.current;
			if (!session || !token) return;
			session.buffer += token;
			renderBuffer();
		},
		[renderBuffer]
	);

	const commitFinal = useCallback(
		(content: string): void => {
			const session = sessionRef.current;
			if (!session) return;
			session.buffer = content;
			renderBuffer();
			sessionRef.current = null;
		},
		[renderBuffer]
	);

	const revertInsert = useCallback((): void => {
		const session = sessionRef.current;
		if (!session) return;
		const ed = editorRef.current;
		if (ed && !ed.isDestroyed) {
			const from = clampPos(ed, session.origin);
			const to = clampPos(ed, session.origin + session.insertedLength);
			if (to > from) {
				const tr = ed.state.tr.delete(from, to).setMeta('preventEditorUpdate', true);
				ed.view.dispatch(tr);
			}
		}
		sessionRef.current = null;
	}, [clampPos]);

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const activeTaskIdRef = useRef<string | null>(null);
	activeTaskIdRef.current = activeTaskId;

	const [aiActionTaskId, setAiActionTaskId] = useState<string | null>(null);
	const [taskError, setTaskError] = useState<string | null>(null);

	const isRunning = activeTaskId !== null || aiActionTaskId !== null;
	const isBusy = isRunning || isExternallyBusy;
	const isBusyRef = useRef(isBusy);
	isBusyRef.current = isBusy;

	// ---- Prompt-flow stream handlers ----------------------------------------
	const handleDelta = useCallback(
		(token: string) => {
			appendDelta(token);
		},
		[appendDelta]
	);

	const handleCompleted = useCallback(
		(completedContent: string) => {
			commitFinal(completedContent);
			editorActions.hideLoading();
			editorActions.enable();
			editorActions.hidePromptStatusBar();
			editorActions.clearPromptInput();
			const ed = editorRef.current;
			if (!ed || ed.isDestroyed) return;
			onMarkdownChangedRef.current(ed.getMarkdown());
		},
		[commitFinal, editorActions]
	);

	const handleCancelOrError = useCallback(() => {
		revertInsert();
		editorActions.hideLoading();
		editorActions.enable();
		editorActions.hidePromptStatusBar();
	}, [revertInsert, editorActions]);

	const taskHandlersRef = useRef({ handleDelta, handleCompleted, handleCancelOrError });
	taskHandlersRef.current = { handleDelta, handleCompleted, handleCancelOrError };

	// ---- AI-action event listener -------------------------------------------
	useEffect(() => {
		if (!documentId || !aiActionTaskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== aiActionTaskId) return;
			if (event.metadata.documentId !== documentId) return;

			// `event.data: TaskEventResult` is a discriminated union. Narrow on
			// `success` first, then act on the lifecycle state.
			if (event.state === 'finished') {
				if (event.data.success) {
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
								console.log("Response text: ", responseText);
								ed.chain().deleteRange({ from, to }).insertContentAt(from, responseText).run();
							}
						}
						onMarkdownChangedRef.current(ed.getMarkdown());
					}
				} else if (event.data.error.length > 0) {
					setTaskError(event.data.error);
				}

				if (typeof window.task?.cancel === 'function') {
					void window.task.cancel(aiActionTaskId);
				}
				setAiActionTaskId(null);
			} else if (event.state === 'cancelled') {
				if (!event.data.success && event.data.error.length > 0) {
					setTaskError(event.data.error);
				}
				setAiActionTaskId(null);
			}
		});
	}, [aiActionTaskId, documentId]);

	// ---- Submit -------------------------------------------------------------
	// All payloads go through the same path: wrap `payload.prompt` with the
	// surrounding doc context so the model can use it, then replace the
	// selection range on completion (collapsed range → insert at cursor).
	const submit = useCallback(
		async (payload: PromptSubmitPayload): Promise<void> => {
			if (!documentId || isBusyRef.current) return;
			if (typeof window.task?.submit !== 'function') return;

			const ed = payload.editor;
			if (ed.isDestroyed) return;

			const { from, to } = ed.state.selection;
			console.log('Submitting prompt with selection range: ', { from, to });

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
			const after = sliceToMarkdown(to, docSize);

			const prompt = buildReviewPrompt({
				textBefore: before,
				selectedText: payload.selectedText,
				textAfter: after,
				userInstruction: payload.prompt,
			});

			const result = await window.task.submit({
				type: TASK_TYPE,
				input: { prompt },
				metadata: { documentId, selection: { from, to } },
			});

			if (result.success) {
				setAiActionTaskId(result.data.taskId);
			}
		},
		[documentId]
	);

	const dismissTaskError = useCallback(() => {
		setTaskError(null);
	}, []);

	return {
		isRunning,
		taskError,
		dismissTaskError,
		submit,
	};
}
