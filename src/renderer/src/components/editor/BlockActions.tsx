import React, { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Copy, Trash2, Clipboard, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoveredBlock } from "./BlockControls";
import { AppButton } from "../app/AppButton";
import {
  AppDropdownMenu,
  AppDropdownMenuTrigger,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
} from "../app/AppDropdownMenu";

interface BlockActionsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hoveredBlock: HoveredBlock | null;
}

export const BlockActions = React.memo(function BlockActions({
  editor,
  hoveredBlock,
}: BlockActionsProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  // Captures the `top` value at the moment the menu opens so the container
  // does not jump when hoveredBlock updates while the dropdown is visible.
  const lockedTopRef = useRef<number>(0);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Lock position to the current hoveredBlock top before the menu renders.
        lockedTopRef.current = hoveredBlock?.top ?? 0;
      }
      setMenuOpen(open);
    },
    [hoveredBlock],
  );

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

  const copyBlockText = useCallback(() => {
    if (!hoveredBlock) return;
    const node = editor.state.doc.nodeAt(hoveredBlock.pos);
    if (!node) return;
    navigator.clipboard.writeText(node.textContent);
  }, [editor, hoveredBlock]);

  const visible = !!hoveredBlock || menuOpen;
  // While the menu is open, use the position that was locked when it opened.
  // This prevents the container from jumping as hoveredBlock changes on mouse move.
  const topValue = menuOpen ? lockedTopRef.current : (hoveredBlock?.top ?? 0);

  return (
    <div
      className={cn(
        "absolute right-1 z-50 flex items-center gap-1",
        "pointer-events-none opacity-0 transition-opacity duration-100",
        visible && "pointer-events-auto opacity-100",
      )}
      style={{ top: topValue }}
    >
      <AppDropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
        <AppDropdownMenuTrigger asChild>
          <AppButton
            variant="editor-block-actions"
            size="editor-block-icons"
            aria-label="Block options"
          >
            <MoreVertical />
          </AppButton>
        </AppDropdownMenuTrigger>
        <AppDropdownMenuContent align="end" sideOffset={4}>
          <AppDropdownMenuItem onClick={deleteBlock}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </AppDropdownMenuItem>
          <AppDropdownMenuItem onClick={duplicateBlock}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </AppDropdownMenuItem>
          <AppDropdownMenuItem onClick={copyBlockText}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copy to clipboard
          </AppDropdownMenuItem>
        </AppDropdownMenuContent>
      </AppDropdownMenu>
    </div>
  );
});
