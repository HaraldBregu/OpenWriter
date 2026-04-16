import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2, Clipboard, Scissors, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HoveredBlock } from './BlockControls';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { useEditorContext } from '../hooks';

interface BlockActionsProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
	hoveredBlock: HoveredBlock | null;
}

export const BlockActions = React.memo(function BlockActions({
	hoveredBlock,
}: BlockActionsProps): React.JSX.Element {
	const { t } = useTranslation();
	const { editor } = useEditorContext();
	const [menuOpen, setMenuOpen] = useState(false);
	const lockedTopRef = useRef<number>(0);
	const lastTopRef = useRef<number>(0);

	if (hoveredBlock) {
		lastTopRef.current = hoveredBlock.top;
	}

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (open) {
				lockedTopRef.current = hoveredBlock?.top ?? 0;
			}
			setMenuOpen(open);
		},
		[hoveredBlock]
	);

	const copyBlock = useCallback(() => {
		if (!hoveredBlock) return;
		const node = editor.state.doc.nodeAt(hoveredBlock.pos);
		if (!node) return;
		navigator.clipboard.writeText(node.textContent);
	}, [editor, hoveredBlock]);

	const cutBlock = useCallback(() => {
		if (!hoveredBlock) return;
		const node = editor.state.doc.nodeAt(hoveredBlock.pos);
		if (!node) return;
		navigator.clipboard.writeText(node.textContent);
		editor
			.chain()
			.focus()
			.deleteRange({
				from: hoveredBlock.pos,
				to: hoveredBlock.pos + node.nodeSize,
			})
			.run();
	}, [editor, hoveredBlock]);

	const duplicateBlock = useCallback(() => {
		if (!hoveredBlock) return;
		const node = editor.state.doc.nodeAt(hoveredBlock.pos);
		if (!node) return;
		const insertPos = hoveredBlock.pos + node.nodeSize;
		editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
	}, [editor, hoveredBlock]);

	const deleteBlock = useCallback(() => {
		if (!hoveredBlock) return;
		const node = editor.state.doc.nodeAt(hoveredBlock.pos);
		if (!node) return;
		editor
			.chain()
			.focus()
			.deleteRange({
				from: hoveredBlock.pos,
				to: hoveredBlock.pos + node.nodeSize,
			})
			.run();
	}, [editor, hoveredBlock]);

	const visible = !!hoveredBlock || menuOpen;
	const topValue = (menuOpen ? lockedTopRef.current : lastTopRef.current) - 4;

	return (
		<div
			className={cn(
				'absolute right-0 z-50 flex items-center gap-1',
				'pointer-events-none opacity-0 transition-opacity duration-150 ease-in',
				visible && 'pointer-events-auto opacity-100'
			)}
			style={{ top: topValue }}
		>
			<DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label={t('blockActions.title')}
						>
							<MoreVertical />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" sideOffset={4} className="min-w-44">
					<DropdownMenuItem onClick={copyBlock}>
						<Clipboard className="mr-2 h-4 w-4" />
						{t('common.copy')}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={cutBlock}>
						<Scissors className="mr-2 h-4 w-4" />
						{t('common.cut')}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={duplicateBlock}>
						<Copy className="mr-2 h-4 w-4" />
						{t('common.duplicate')}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={deleteBlock}>
						<Trash2 className="mr-2 h-4 w-4" />
						{t('common.delete')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
});
