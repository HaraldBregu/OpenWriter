import type { Editor } from '@tiptap/core';
import type { DocumentSelection } from '../../../context/state';

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
	const selectedText = rawSelection.replace(/<[^>]*>/g, '').trim();

	return selectedText.length > 0 ? selectedText : null;
}

export function buildTaskPrompt(input: string, selectedText: string | null): string {
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
