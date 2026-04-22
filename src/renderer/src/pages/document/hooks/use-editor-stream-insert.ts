import { useCallback, useRef } from 'react';
import { Slice } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './use-editor-instance';

interface InsertSession {
	origin: number;
	insertedLength: number;
}

export interface EditorStreamInsert {
	begin: (posFrom: number, posTo: number) => void;
	appendDelta: (token: string) => void;
	commitFinal: (content: string) => void;
	revert: () => void;
}

/**
 * Streams agent-generated text into the active editor at a tracked position.
 * Suppresses editor update events so the document's `onChange` handler does
 * not persist intermediate states.
 */
export function useEditorStreamInsert(): EditorStreamInsert {
	const { editor } = useEditorInstance();
	const sessionRef = useRef<InsertSession | null>(null);

	const clampOrigin = useCallback((ed: Editor, origin: number): number => {
		const size = ed.state.doc.content.size;
		if (origin < 0) return 0;
		if (origin > size) return size;
		return origin;
	}, []);

	const begin = useCallback(
		(posFrom: number, posTo: number): void => {
			if (!editor || editor.isDestroyed) return;
			const from = clampOrigin(editor, posFrom);
			const to = clampOrigin(editor, Math.max(posFrom, posTo));
			if (to > from) {
				const tr = editor.state.tr.delete(from, to).setMeta('preventEditorUpdate', true);
				editor.view.dispatch(tr);
			}
			sessionRef.current = { origin: from, insertedLength: 0 };
		},
		[editor, clampOrigin]
	);

	const appendDelta = useCallback(
		(token: string): void => {
			if (!editor || editor.isDestroyed) return;
			const session = sessionRef.current;
			if (!session || !token) return;
			const at = clampOrigin(editor, session.origin + session.insertedLength);
			const tr = editor.state.tr.insertText(token, at).setMeta('preventEditorUpdate', true);
			editor.view.dispatch(tr);
			session.insertedLength += token.length;
		},
		[editor, clampOrigin]
	);

	const commitFinal = useCallback(
		(content: string): void => {
			if (!editor || editor.isDestroyed) return;
			const session = sessionRef.current;
			if (!session) return;

			const from = clampOrigin(editor, session.origin);
			const streamedEnd = clampOrigin(editor, session.origin + session.insertedLength);

			const json = editor.markdown?.parse(content);
			if (json) {
				const doc = editor.schema.nodeFromJSON(json);
				const slice = new Slice(doc.content, 0, 0);
				const tr = editor.state.tr
					.replaceRange(from, streamedEnd, slice)
					.setMeta('preventEditorUpdate', true);
				editor.view.dispatch(tr);
			} else {
				// Markdown parser unavailable — fall back to plain replace.
				const tr = editor.state.tr
					.delete(from, streamedEnd)
					.insertText(content, from)
					.setMeta('preventEditorUpdate', true);
				editor.view.dispatch(tr);
			}

			sessionRef.current = null;
		},
		[editor, clampOrigin]
	);

	const revert = useCallback((): void => {
		if (!editor || editor.isDestroyed) return;
		const session = sessionRef.current;
		if (!session) return;
		const from = clampOrigin(editor, session.origin);
		const to = clampOrigin(editor, session.origin + session.insertedLength);
		if (to > from) {
			const tr = editor.state.tr.delete(from, to).setMeta('preventEditorUpdate', true);
			editor.view.dispatch(tr);
		}
		sessionRef.current = null;
	}, [editor, clampOrigin]);

	return { begin, appendDelta, commitFinal, revert };
}
