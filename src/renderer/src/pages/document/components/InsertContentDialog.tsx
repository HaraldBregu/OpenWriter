import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { Slice } from '@tiptap/pm/model';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { useEditorInstance, useInsertContentDialog } from '../Provider';
import type { ResourceInfo } from '../../../../../../shared/types';

export function InsertContentDialog(): ReactElement {
	const { insertContentDialogOpen, closeInsertContentDialog } = useInsertContentDialog();
	const { editor } = useEditorInstance();

	const [items, setItems] = useState<ResourceInfo[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

	useEffect(() => {
		if (!insertContentDialogOpen) return;

		let cancelled = false;
		window.workspace
			.getContents()
			.then((results) => {
				if (cancelled) return;
				setItems(results);
				setActiveIndex(0);
			})
			.catch(() => {
				if (!cancelled) setItems([]);
			});

		return () => {
			cancelled = true;
		};
	}, [insertContentDialogOpen]);

	useEffect(() => {
		itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex]);

	const handleSelect = useCallback(
		async (item: ResourceInfo) => {
			closeInsertContentDialog();
			if (!editor || editor.isDestroyed) return;

			try {
				const text = await window.workspace.readFile({ filePath: item.path });
				const json = editor.markdown?.parse(text);
				const { from } = editor.state.selection;

				if (json) {
					const doc = editor.schema.nodeFromJSON(json);
					const slice = new Slice(doc.content, 0, 0);
					const tr = editor.state.tr.replaceRange(from, from, slice);
					editor.view.dispatch(tr);
				} else {
					editor.commands.insertContentAt(from, text);
				}
				editor.view.focus();
			} catch {
				// ignore read failures
			}
		},
		[closeInsertContentDialog, editor],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (items.length === 0) return;

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setActiveIndex((i) => (i + 1) % items.length);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				setActiveIndex((i) => (i - 1 + items.length) % items.length);
			} else if (event.key === 'Enter') {
				event.preventDefault();
				const item = items[activeIndex];
				if (item) handleSelect(item);
			}
		},
		[items, activeIndex, handleSelect],
	);

	return (
		<Dialog
			open={insertContentDialogOpen}
			onOpenChange={(open) => {
				if (!open) closeInsertContentDialog();
			}}
		>
			<DialogContent onKeyDown={handleKeyDown}>
				<DialogHeader>
					<DialogTitle>Insert content</DialogTitle>
					<DialogDescription>Select a file to insert at the cursor.</DialogDescription>
				</DialogHeader>
				<ul className="max-h-80 overflow-y-auto -mx-1 flex flex-col gap-0.5">
					{items.length === 0 ? (
						<li className="px-3 py-6 text-center text-sm text-muted-foreground">
							No content available
						</li>
					) : (
						items.map((item, idx) => (
							<li
								key={item.id}
								ref={(el) => {
									itemRefs.current[idx] = el;
								}}
								className={cn(
									'cursor-pointer rounded-md px-3 py-2 text-sm outline-none',
									idx === activeIndex
										? 'bg-accent text-accent-foreground'
										: 'hover:bg-accent/50',
								)}
								onMouseEnter={() => setActiveIndex(idx)}
								onClick={() => handleSelect(item)}
							>
								<div className="truncate">{item.name}</div>
							</li>
						))
					)}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
