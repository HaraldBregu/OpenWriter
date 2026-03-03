import React, { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Copy, ChevronUp, ChevronDown, MoreHorizontal, Trash2, Clipboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HoveredBlock } from './BlockControls'
import { AppButton } from '../AppButton'
import {
  AppDropdownMenu,
  AppDropdownMenuTrigger,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
} from '../AppDropdownMenu'

interface BlockActionsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
  hoveredBlock: HoveredBlock | null
}

export function BlockActions({ editor, hoveredBlock }: BlockActionsProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  const duplicateBlock = useCallback(() => {
    if (!hoveredBlock) return
    const node = editor.state.doc.nodeAt(hoveredBlock.pos)
    if (!node) return
    const insertPos = hoveredBlock.pos + node.nodeSize
    editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run()
  }, [editor, hoveredBlock])

  const moveBlockUp = useCallback(() => {
    if (!hoveredBlock) return
    const { pos } = hoveredBlock
    const node = editor.state.doc.nodeAt(pos)
    if (!node) return
    const resolved = editor.state.doc.resolve(pos)
    if (resolved.index(0) === 0) return
    const prevPos = resolved.before(1) - 1
    const prevResolved = editor.state.doc.resolve(prevPos)
    const targetPos = prevResolved.before(1)
    const { tr } = editor.state
    const srcEnd = pos + node.nodeSize
    tr.delete(pos, srcEnd)
    tr.insert(targetPos, node.copy(node.content))
    editor.view.dispatch(tr)
  }, [editor, hoveredBlock])

  const moveBlockDown = useCallback(() => {
    if (!hoveredBlock) return
    const { pos } = hoveredBlock
    const node = editor.state.doc.nodeAt(pos)
    if (!node) return
    const resolved = editor.state.doc.resolve(pos)
    const parentChildCount = resolved.node(0).childCount
    if (resolved.index(0) >= parentChildCount - 1) return
    const nextPos = pos + node.nodeSize
    const nextNode = editor.state.doc.nodeAt(nextPos)
    if (!nextNode) return
    const { tr } = editor.state
    const insertAfter = nextPos + nextNode.nodeSize
    tr.insert(insertAfter, node.copy(node.content))
    tr.delete(pos, pos + node.nodeSize)
    editor.view.dispatch(tr)
  }, [editor, hoveredBlock])

  const deleteBlock = useCallback(() => {
    if (!hoveredBlock) return
    const node = editor.state.doc.nodeAt(hoveredBlock.pos)
    if (!node) return
    editor.chain().focus().deleteRange({ from: hoveredBlock.pos, to: hoveredBlock.pos + node.nodeSize }).run()
  }, [editor, hoveredBlock])

  const copyBlockText = useCallback(() => {
    if (!hoveredBlock) return
    const node = editor.state.doc.nodeAt(hoveredBlock.pos)
    if (!node) return
    navigator.clipboard.writeText(node.textContent)
  }, [editor, hoveredBlock])

  const visible = !!hoveredBlock || menuOpen

  return (
    <div
      className={cn(
        'absolute right-1 z-50 flex items-center gap-0',
        'pointer-events-none opacity-0 transition-opacity duration-100',
        visible && 'pointer-events-auto opacity-100',
      )}
      style={{ top: hoveredBlock?.top ?? 0 }}
    >
      <AppButton variant="ghost" size="icon" aria-label="Duplicate block" onClick={duplicateBlock} className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground">
        <Copy className="h-3.5 w-3.5" />
      </AppButton>

      <AppButton variant="ghost" size="icon" aria-label="Move block up" onClick={moveBlockUp} className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground">
        <ChevronUp className="h-3.5 w-3.5" />
      </AppButton>

      <AppButton variant="ghost" size="icon" aria-label="Move block down" onClick={moveBlockDown} className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground">
        <ChevronDown className="h-3.5 w-3.5" />
      </AppButton>

      <AppDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <AppDropdownMenuTrigger asChild>
          <AppButton variant="ghost" size="icon" aria-label="Block options" className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground">
            <MoreHorizontal className="h-3.5 w-3.5" />
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
  )
}
