import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { marked } from 'marked';
import type { TaskEvent } from '../../../../../shared/types';
import type { PromptSubmitPayload } from '@/components/app/editor/types';

const TASK_TYPE = 'content-writer';

const PROMPT_TEMPLATE = `Generate new text to insert at the position indicated below. The surrounding text uses Markdown formatting (e.g., **bold**, *italic*, \`code\`, [links](url), lists, headings). Your output MUST use Markdown formatting consistent with the surrounding context.

Use the surrounding context (text before and after) to understand tone, style, voice, and structural intent — match the style of the existing document. If a <selected_text> block is present, the user has selected that text and your output will replace it — use it as the basis for your response unless the instruction says otherwise.

<context_before>
{{TEXT_BEFORE}}
</context_before>

{{SELECTED_TEXT_BLOCK}}<context_after>
{{TEXT_AFTER}}
</context_after>

Instructions: {{USER_INSTRUCTION}}

Formatting rules:
- Use Markdown syntax where appropriate: **bold**, *italic*, ***bold italic***, ~~strikethrough~~, \`inline code\`, [link text](url), images, headings (#, ##, ###), blockquotes (>), lists (-, *, 1.), tables, and code blocks (\`\`\`).
- Match the formatting style and tone of the surrounding context.
- Use heading levels consistent with the document's existing hierarchy.
- Ensure the new text flows naturally with the context before and after.
- Do not repeat content already present in the surrounding context.

Return only the new text to insert at the position. Do not repeat the surrounding context. Do not wrap your response in code fences. Do not add explanations.`;

function buildWritePrompt(args: {
	textBefore: string;
	selectedText: string;
	textAfter: string;
	userInstruction: string;
}): string {
	const selectedBlock = args.selectedText
		? `<selected_text>\n${args.selectedText}\n</selected_text>\n\n`
		: '';
	return PROMPT_TEMPLATE.replaceAll('{{TEXT_BEFORE}}', args.textBefore)
		.replaceAll('{{SELECTED_TEXT_BLOCK}}', selectedBlock)
		.replaceAll('{{TEXT_AFTER}}', args.textAfter)
		.replaceAll('{{USER_INSTRUCTION}}', args.userInstruction);
}

export interface UseContentWriterTaskOptions {
	documentId: string | null;
	editor: TiptapEditor | null;
	onMarkdownChanged: (markdown: string) => void;
}

export interface UseContentWriterTask {
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

export function useContentWriterTask(opts: UseContentWriterTaskOptions): UseContentWriterTask {
	const { documentId, editor } = opts;

	const onMarkdownChangedRef = useRef(opts.onMarkdownChanged);
	onMarkdownChangedRef.current = opts.onMarkdownChanged;

	const editorRef = useRef(editor);
	editorRef.current = editor;

	const [aiActionTaskId, setAiActionTaskId] = useState<string | null>(null);
	const [taskError, setTaskError] = useState<string | null>(null);

	const isRunning = aiActionTaskId !== null;
	const isBusyRef = useRef(isRunning);
	isBusyRef.current = isRunning;

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
							const { from, to } = range;
							const json = ed.markdown?.parse(responseText);
							if (json) {
								const node = ed.schema.nodeFromJSON(json);
								const slice = new Slice(node.content, 0, 0);
								const tr = ed.state.tr.replaceRange(from, to, slice);
								ed.view.dispatch(tr);
								ed.view.focus();
							} else {
								ed.chain().focus().insertContentAt({ from, to }, responseText).run();
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

			const sliceToText = (start: number, end: number): string => {
				if (start === end) return '';
				return ed.state.doc.textBetween(start, end, '\n\n');
			};

			const docSize = ed.state.doc.content.size;
			const before = sliceToText(0, from);
			const after = sliceToText(to, docSize);

			const prompt = buildWritePrompt({
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
