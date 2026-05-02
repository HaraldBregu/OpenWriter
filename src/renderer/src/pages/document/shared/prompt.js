const TASK_PROMPT_MARKER = '⬢';
function stripHtmlTags(text) {
    return text.replace(/<[^>]*>/g, '');
}
export function getSelectedEditorText(editor, selection) {
    if (!editor || editor.isDestroyed || !selection || selection.from === selection.to) {
        return null;
    }
    const docSize = editor.state.doc.content.size;
    const from = Math.max(0, Math.min(selection.from, docSize));
    const to = Math.max(0, Math.min(selection.to, docSize));
    if (from >= to) {
        return null;
    }
    const storage = editor.storage;
    const serializer = storage.markdown?.serializer;
    const rawSelection = serializer?.serialize(editor.state.doc.cut(from, to)) ??
        editor.state.doc.textBetween(from, to, '\n\n');
    const selectedText = stripHtmlTags(rawSelection).trim();
    return selectedText.length > 0 ? selectedText : null;
}
export function buildChatTaskPrompt(input, selectedText) {
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
export function stripTaskPromptMarkers(text) {
    return text.replaceAll(TASK_PROMPT_MARKER, '');
}
export function normalizeTaskPromptContext(before, after) {
    return {
        before: stripTaskPromptMarkers(before).trimEnd(),
        after: stripTaskPromptMarkers(after).trimStart(),
    };
}
