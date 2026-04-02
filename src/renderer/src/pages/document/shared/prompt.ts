import type { Editor } from '@tiptap/core';
import type { DocumentSelection } from '../context/state';

const TASK_PROMPT_MARKER = '⬢';

function stripHtmlTags(text: string): string {
	return text.replace(/<[^>]*>/g, '');
}

export function getSelectedEditorText(
	editor: Editor | null,
	selection: DocumentSelection | null
): string | null {
	if (!editor || editor.isDestroyed || !selection || selection.from === selection.to) {
		return null;
	}

	const docSize = editor.state.doc.content.size;
	const from = Math.max(0, Math.min(selection.from, docSize));
	const to = Math.max(0, Math.min(selection.to, docSize));

	if (from >= to) {
		return null;
	}

	const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
	const serializer = storage.markdown?.serializer as
		| { serialize: (node: unknown) => string }
		| undefined;
	const rawSelection =
		serializer?.serialize(editor.state.doc.cut(from, to)) ??
		editor.state.doc.textBetween(from, to, '\n\n');
	const selectedText = stripHtmlTags(rawSelection).trim();

	return selectedText.length > 0 ? selectedText : null;
}

export function buildChatTaskPrompt(input: string, selectedText: string | null): string {
	const prompt = input.trim();

	if (!selectedText) {
		return prompt;
	}

	return [
		'User request:',
		prompt,
		'',
		'Selected text from the current document:',
		'```markdown',
		selectedText,
		'```',
	].join('\n');
}

export function stripTaskPromptMarkers(text: string): string {
	return text.replaceAll(TASK_PROMPT_MARKER, '');
}

export function normalizeTaskPromptContext(
	before: string,
	after: string
): { before: string; after: string } {
	return {
		before: stripTaskPromptMarkers(before).trimEnd(),
		after: stripTaskPromptMarkers(after).trimStart(),
	};
}

export function buildTaskPrompt(before: string, after: string, input: string): string {
	const prompt = input.trim();
	const sections: string[] = [];

	if (before.length > 0) {
		sections.push(before);
	}

	sections.push(`${TASK_PROMPT_MARKER} ${prompt} ${TASK_PROMPT_MARKER}`);

	if (after.length > 0) {
		sections.push(after);
	}

	return sections.join('\n\n');
}
