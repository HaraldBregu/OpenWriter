import React, { useCallback, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { GUTTER_WIDTH } from '../shared/common';

export const BlockControls = React.memo(function BlockControls(): React.JSX.Element {
	const {
		editor,
		containerRef,
		state: { hoveredBlock },
	} = useEditor();
	const [dropState, setDropState] = useState({ top: 0, visible: false });
	const dragRef = useRef(false);
	const lastTopRef = useRef(0);

	if (hoveredBlock) {
		lastTopRef.current = hoveredBlock.top;
	}

	// Resolve the top-level block at a given clientY.
	const getBlock = useCallback(
		(y: number): { dom: HTMLElement; pos: number } | null => {
			if (!editor) return null;
			const pm = containerRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
			if (!pm) return null;
			for (const child of Array.from(pm.children) as HTMLElement[]) {
				const r = child.getBoundingClientRect();
				if (y >= r.top - 4 && y <= r.bottom + 4) {
					try {
						const p = editor.view.posAtDOM(child, 0);
						return { dom: child, pos: editor.state.doc.resolve(p).before(1) };
					} catch {
						return null;
					}
				}
			}
			return null;
		},
		[editor, containerRef]
	);

	// Drag-to-reorder via ProseMirror transactions.
	const handleDragStart = useCallback(
		(e: React.MouseEvent) => {
			if (!hoveredBlock) return;
			const { node: srcDom, pos: srcPos } = hoveredBlock;
			e.preventDefault();
			dragRef.current = true;
			srcDom.classList.add('is-dragging');

			let dropTarget: { dom: HTMLElement; pos: number } | null = null;
			let dropDir: 'above' | 'below' | null = null;

			const onMove = (me: MouseEvent): void => {
				const block = getBlock(me.clientY);
				if (block && block.dom !== srcDom) {
					dropTarget = block;
					const r = block.dom.getBoundingClientRect();
					const cr = containerRef.current!.getBoundingClientRect();
					dropDir = me.clientY < r.top + r.height / 2 ? 'above' : 'below';
					setDropState({
						top: dropDir === 'above' ? r.top - cr.top - 2 : r.bottom - cr.top - 1,
						visible: true,
					});
				} else {
					dropTarget = null;
					dropDir = null;
					setDropState((s) => ({ ...s, visible: false }));
				}
			};

			const onUp = (): void => {
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);
				srcDom.classList.remove('is-dragging');
				setDropState({ top: 0, visible: false });
				dragRef.current = false;

				if (!dropTarget || !dropDir) return;
				const sn = editor.state.doc.nodeAt(srcPos);
				const tn = editor.state.doc.nodeAt(dropTarget.pos);
				if (!sn || !tn) return;

				const { tr } = editor.state;
				const insertPos = dropDir === 'above' ? dropTarget.pos : dropTarget.pos + tn.nodeSize;
				const srcEnd = srcPos + sn.nodeSize;

				if (srcPos < insertPos) {
					tr.insert(insertPos, sn.copy(sn.content));
					tr.delete(srcPos, srcEnd);
				} else {
					tr.delete(srcPos, srcEnd);
					tr.insert(insertPos, sn.copy(sn.content));
				}
				editor.view.dispatch(tr);
			};

			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
		},
		[editor, hoveredBlock, getBlock, containerRef]
	);

	const visible = !!hoveredBlock && !dragRef.current;

	return (
		<>
			<div
				className={cn(
					'absolute -left-2 z-50 flex items-center gap-1',
					'pointer-events-none opacity-0 transition-opacity duration-150 ease-in',
					visible && 'pointer-events-auto opacity-100'
				)}
				style={{ top: lastTopRef.current - 4 }}
			>
				{/* Drag to reorder */}
				<Button
					variant="ghost"
					size="icon"
					aria-label="Drag to reorder"
					onMouseDown={handleDragStart}
				>
					<GripVertical />
				</Button>
			</div>

			{/* Drop indicator line */}
			<div
				className={cn(
					'pointer-events-none absolute z-100 h-[2.5px] rounded-sm bg-primary opacity-0 transition-opacity duration-75',
					dropState.visible && 'opacity-100'
				)}
				style={{ top: dropState.top, left: GUTTER_WIDTH, right: 0 }}
			/>
		</>
	);
});
