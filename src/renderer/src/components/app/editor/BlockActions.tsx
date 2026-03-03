import React, { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { cn } from '@/lib/utils'
import type { HoveredBlock } from './BlockControls'
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

const BTN_CLASS = cn(
  'flex h-6 w-6 items-center justify-center rounded',
  'cursor-pointer border-none bg-transparent',
  'text-muted-foreground/50 transition-all duration-100',
  'hover:bg-muted hover:text-muted-foreground',
  'active:scale-90',
)

export function BlockActions({ editor, containerRef, hoveredBlock }: BlockActionsProps): React.JSX.Element {
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
    if (resolved.index(0) === 0) return // already first
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
    if (resolved.index(0) >= parentChildCount - 1) return // already last
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
    const text = node.textContent
    navigator.clipboard.writeText(text)
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
      {/* Duplicate */}
      <button type="button" aria-label="Duplicate block" onClick={duplicateBlock} className={BTN_CLASS}>
        <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      {/* Move up */}
      <button type="button" aria-label="Move block up" onClick={moveBlockUp} className={BTN_CLASS}>
        <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Move down */}
      <button type="button" aria-label="Move block down" onClick={moveBlockDown} className={BTN_CLASS}>
        <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 3-dot options menu */}
      <AppDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <AppDropdownMenuTrigger asChild>
          <button type="button" aria-label="Block options" className={BTN_CLASS}>
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor" stroke="none">
              <circle cx={5} cy={12} r={2} />
              <circle cx={12} cy={12} r={2} />
              <circle cx={19} cy={12} r={2} />
            </svg>
          </button>
        </AppDropdownMenuTrigger>
        <AppDropdownMenuContent align="end" sideOffset={4}>
          <AppDropdownMenuItem onClick={deleteBlock}>Delete</AppDropdownMenuItem>
          <AppDropdownMenuItem onClick={duplicateBlock}>Duplicate</AppDropdownMenuItem>
          <AppDropdownMenuItem onClick={copyBlockText}>Copy to clipboard</AppDropdownMenuItem>
        </AppDropdownMenuContent>
      </AppDropdownMenu>
    </div>
  )
}
