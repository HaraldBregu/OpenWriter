import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { TaskEvent } from '../../../../../shared/types';
import type { PromptSubmitPayload } from '@/components/app/editor/types';

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

export function useDocumentAiTasks(opts: UseDocumentAiTasksOptions): UseDocumentAiTasks {
	const { documentId, editor } = opts;

	const onMarkdownChangedRef = useRef(opts.onMarkdownChanged);
	onMarkdownChangedRef.current = opts.onMarkdownChanged;

	const editorRef = useRef(editor);
	editorRef.current = editor;

	const [aiActionTaskId, setAiActionTaskId] = useState<string | null>(null);
	const [taskError, setTaskError] = useState<string | null>(null);

	const isRunning = aiActionTaskId !== null;
	const isBusy = isRunning || isExternallyBusy;
	const isBusyRef = useRef(isBusy);
	isBusyRef.current = isBusy;

	useEffect(() => {
		if (!documentId || !aiActionTaskId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		return window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== aiActionTaskId) return;
			if (event.metadata.documentId !== documentId) return;

			if (event.state === 'finished') {
				if (event.data.success) {
					const responseText = event.data.data;
					const ed = editorRef.current;
					if (ed && !ed.isDestroyed) {
						const range = extractTaskSelection(event.metadata.selection);
						if (range) {
							const docSize = ed.state.doc.content.size;
							// const from = Math.min(range.from, docSize);
							// const to = Math.min(range.to, docSize);
							const from = range.from;
							const to = range.to;
							const json = ed.markdown?.parse(responseText);
							if (json) {
								console.log('Response text: ', responseText);
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

	const submit = useCallback(
		async (payload: PromptSubmitPayload): Promise<void> => {
			if (!documentId || isBusyRef.current) return;
			if (typeof window.task?.submit !== 'function') return;

			const ed = payload.editor;
			if (ed.isDestroyed) return;

			const { from, to } = ed.state.selection;
			console.log('Submitting prompt with selection range: ', { from, to });

			// const sliceToMarkdown = (start: number, end: number): string => {
			// 	if (start === end) return '';
			// 	const slice = ed.state.doc.cut(start, end);
			// 	return (
			// 		ed.markdown?.serialize(slice.toJSON()) ??
			// 		ed.state.doc.textBetween(start, end, '\n\n')
			// 	);
			// };

			const sliceToText = (start: number, end: number): string => {
				if (start === end) return '';
				return ed.state.doc.textBetween(start, end, '\n\n');
			};

			const docSize = ed.state.doc.content.size;
			const before = sliceToText(0, from);
			const after = sliceToText(to, docSize);

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
