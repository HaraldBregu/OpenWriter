import type React from 'react';
import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorAction } from '../context/actions';

interface UseBlockHoverOptions {
	editor: Editor;
	containerRef: React.RefObject<HTMLDivElement | null>;
	dispatch: React.Dispatch<EditorAction>;
}

export function useBlockHover({ editor, containerRef, dispatch }: UseBlockHoverOptions): void {
	const getBlock = useCallback(
		(y: number): { dom: HTMLElement; pos: number } | null => {
			if (editor.isDestroyed) return null;
			const pm = containerRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
			if (!pm) return null;
			for (const child of Array.from(pm.children) as HTMLElement[]) {
				const r = child.getBoundingClientRect();
				if (y >= r.top - 4 && y <= r.bottom + 4) {
					try {
						const p = editor.view.posAtDOM(child, 0);
						const pos = editor.state.doc.resolve(p).before(1);
						const node = editor.state.doc.nodeAt(pos);
						if (node && node.type.name === 'contentGenerator') return null;
						return { dom: child, pos };
					} catch {
						return null;
					}
				}
			}
			return null;
		},
		[editor, containerRef]
	);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const onMove = (e: MouseEvent): void => {
			const block = getBlock(e.clientY);
			if (block) {
				const cR = el.getBoundingClientRect();
				const bR = block.dom.getBoundingClientRect();
				const lh = parseFloat(getComputedStyle(block.dom).lineHeight) || 30;
				dispatch({
					type: 'SET_HOVERED_BLOCK',
					payload: {
						node: block.dom,
						pos: block.pos,
						top: bR.top - cR.top + Math.min(lh, bR.height) / 2 - 12,
					},
				});
			} else {
				dispatch({ type: 'SET_HOVERED_BLOCK', payload: null });
			}
		};

		const onLeave = (): void => {
			setTimeout(() => {
				dispatch({ type: 'SET_HOVERED_BLOCK', payload: null });
			}, 80);
		};

		el.addEventListener('mousemove', onMove);
		el.addEventListener('mouseleave', onLeave);
		return () => {
			el.removeEventListener('mousemove', onMove);
			el.removeEventListener('mouseleave', onLeave);
		};
	}, [containerRef, getBlock, dispatch]);
}
