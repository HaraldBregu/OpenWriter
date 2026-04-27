import { useCallback, useEffect, useRef } from 'react';
import { Slice } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './use-editor-instance';

interface InsertSession {
	origin: number;
	insertedLength: number;
	buffer: string;
	pendingFrame: number | null;
}

function getScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
	let node = el?.parentElement ?? null;
	while (node) {
		const style = getComputedStyle(node);
		const overflowY = style.overflowY;
		if (
			(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
			node.scrollHeight > node.clientHeight
		) {
			return node;
		}
		node = node.parentElement;
	}
	return null;
}

export interface EditorStreamInsert {
	begin: (posFrom: number, posTo: number) => void;
	appendDelta: (token: string) => void;
	commitFinal: (content: string) => void;
	revert: () => void;
}

/**
 * Streams agent-generated markdown into the active editor at a tracked
 * position. Each delta appends to a buffer that is re-parsed as markdown on
 * the next animation frame, so formatting renders incrementally instead of
 * appearing only after completion. Editor update events are suppressed so the
 * document's `onChange` handler does not persist intermediate states.
 */
export function useEditorStreamInsert(): EditorStreamInsert {
	const { editor } = useEditorInstance();
	const sessionRef = useRef<InsertSession | null>(null);
	const scrollAnimationRef = useRef<number | null>(null);
	const scrollTargetRef = useRef<{ el: HTMLElement; top: number } | null>(null);

	const clampPos = useCallback((ed: Editor, pos: number): number => {
		const size = ed.state.doc.content.size;
		if (pos < 0) return 0;
		if (pos > size) return size;
		return pos;
	}, []);

	const cancelScrollAnimation = useCallback((): void => {
		if (scrollAnimationRef.current != null) {
			cancelAnimationFrame(scrollAnimationRef.current);
			scrollAnimationRef.current = null;
		}
		scrollTargetRef.current = null;
	}, []);

	// Continuously eases scrollTop toward the latest target so that consecutive
	// streaming deltas blend into one smooth motion instead of stepwise jumps.
	const ensureScrollAnimation = useCallback((): void => {
		if (scrollAnimationRef.current != null) return;
		const tick = (): void => {
			const target = scrollTargetRef.current;
			if (!target) {
				scrollAnimationRef.current = null;
				return;
			}
			const current = target.el.scrollTop;
			const diff = target.top - current;
			if (Math.abs(diff) < 0.5) {
				target.el.scrollTop = target.top;
				scrollAnimationRef.current = null;
				scrollTargetRef.current = null;
				return;
			}
			target.el.scrollTop = current + diff * 0.18;
			scrollAnimationRef.current = requestAnimationFrame(tick);
		};
		scrollAnimationRef.current = requestAnimationFrame(tick);
	}, []);

	const renderBuffer = useCallback((): void => {
		if (!editor || editor.isDestroyed) return;
		const session = sessionRef.current;
		if (!session) return;

		const from = clampPos(editor, session.origin);
		const to = clampPos(editor, session.origin + session.insertedLength);
		const sizeBefore = editor.state.doc.content.size;

		let tr = editor.state.tr;
		const json = session.buffer ? editor.markdown?.parse(session.buffer) : null;
		if (json) {
			const doc = editor.schema.nodeFromJSON(json);
			const slice = new Slice(doc.content, 0, 0);
			tr = tr.replaceRange(from, to, slice);
		} else {
			tr = tr.delete(from, to);
			if (session.buffer) tr = tr.insertText(session.buffer, from);
		}

		const newInsertedLength = session.insertedLength + (tr.doc.content.size - sizeBefore);
		const endPos = Math.min(Math.max(from + newInsertedLength, 0), tr.doc.content.size);
		try {
			tr = tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1));
		} catch {
			// Selection placement is best-effort.
		}
		tr.setMeta('preventEditorUpdate', true);

		editor.view.dispatch(tr);
		session.insertedLength = newInsertedLength;

		// Follow the trailing edge of inserted text. We update a scroll target
		// after each render and let an rAF loop ease toward it, so streaming
		// tokens produce one continuous glide instead of per-frame jumps.
		const scrollEl = getScrollableAncestor(editor.view.dom as HTMLElement);
		if (scrollEl) {
			try {
				const coords = editor.view.coordsAtPos(endPos);
				const containerRect = scrollEl.getBoundingClientRect();
				const bottomMargin = 96;
				const overflow = coords.bottom - (containerRect.bottom - bottomMargin);
				if (overflow > 0) {
					scrollTargetRef.current = {
						el: scrollEl,
						top: scrollEl.scrollTop + overflow,
					};
					ensureScrollAnimation();
				}
			} catch {
				// coordsAtPos throws on invalid positions; nothing to do.
			}
		}
	}, [editor, clampPos, ensureScrollAnimation]);

	const cancelPendingFrame = useCallback((): void => {
		const session = sessionRef.current;
		if (session?.pendingFrame != null) {
			cancelAnimationFrame(session.pendingFrame);
			session.pendingFrame = null;
		}
	}, []);

	const scheduleRender = useCallback((): void => {
		const session = sessionRef.current;
		if (!session || session.pendingFrame != null) return;
		session.pendingFrame = requestAnimationFrame(() => {
			if (sessionRef.current !== session) return;
			session.pendingFrame = null;
			renderBuffer();
		});
	}, [renderBuffer]);

	const begin = useCallback(
		(posFrom: number, posTo: number): void => {
			if (!editor || editor.isDestroyed) return;
			cancelPendingFrame();
			const from = clampPos(editor, posFrom);
			const to = clampPos(editor, Math.max(posFrom, posTo));
			if (to > from) {
				const tr = editor.state.tr.delete(from, to).setMeta('preventEditorUpdate', true);
				editor.view.dispatch(tr);
			}
			sessionRef.current = {
				origin: from,
				insertedLength: 0,
				buffer: '',
				pendingFrame: null,
			};
		},
		[editor, clampPos, cancelPendingFrame]
	);

	const appendDelta = useCallback(
		(token: string): void => {
			const session = sessionRef.current;
			if (!session || !token) return;
			session.buffer += token;
			scheduleRender();
		},
		[scheduleRender]
	);

	const commitFinal = useCallback(
		(content: string): void => {
			cancelPendingFrame();
			const session = sessionRef.current;
			if (!session) return;
			session.buffer = content;
			renderBuffer();
			sessionRef.current = null;
		},
		[cancelPendingFrame, renderBuffer]
	);

	const revert = useCallback((): void => {
		cancelPendingFrame();
		const session = sessionRef.current;
		if (!session) return;
		if (editor && !editor.isDestroyed) {
			const from = clampPos(editor, session.origin);
			const to = clampPos(editor, session.origin + session.insertedLength);
			if (to > from) {
				const tr = editor.state.tr.delete(from, to).setMeta('preventEditorUpdate', true);
				editor.view.dispatch(tr);
			}
		}
		sessionRef.current = null;
	}, [editor, clampPos, cancelPendingFrame]);

	useEffect(() => {
		return () => {
			cancelPendingFrame();
		};
	}, [cancelPendingFrame]);

	return { begin, appendDelta, commitFinal, revert };
}
