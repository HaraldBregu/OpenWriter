import React, { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { cn } from '@/lib/utils'

export const GUTTER_WIDTH = 54

export interface HoveredBlock {
  node: HTMLElement
  pos: number
  top: number
}

interface BlockControlsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
  hoveredBlock: HoveredBlock | null
}

export function BlockControls({ editor, containerRef, hoveredBlock }: BlockControlsProps): React.JSX.Element {
  const [dropState, setDropState] = useState({ top: 0, visible: false })
  const dragRef = useRef(false)

  // Resolve the top-level block at a given clientY.
  const getBlock = useCallback(
    (y: number): { dom: HTMLElement; pos: number } | null => {
      if (!editor) return null
      const pm = containerRef.current?.querySelector('.ProseMirror') as HTMLElement | null
      if (!pm) return null
      for (const child of Array.from(pm.children) as HTMLElement[]) {
        const r = child.getBoundingClientRect()
        if (y >= r.top - 4 && y <= r.bottom + 4) {
          try {
            const p = editor.view.posAtDOM(child, 0)
            return { dom: child, pos: editor.state.doc.resolve(p).before(1) }
          } catch {
            return null
          }
        }
      }
      return null
    },
    [editor, containerRef],
  )

  // Add a paragraph below the hovered block.
  const handleAdd = useCallback(() => {
    if (!hoveredBlock) return
    const { pos } = hoveredBlock
    const nd = editor.state.doc.nodeAt(pos)
    const ip = pos + (nd ? nd.nodeSize : 0)
    editor.chain().focus().insertContentAt(ip, { type: 'paragraph' }).run()
    editor.commands.focus(ip + 1)
  }, [editor, hoveredBlock])

  // Drag-to-reorder via ProseMirror transactions.
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!hoveredBlock) return
      const { node: srcDom, pos: srcPos } = hoveredBlock
      e.preventDefault()
      dragRef.current = true
      srcDom.classList.add('is-dragging')

      let dropTarget: { dom: HTMLElement; pos: number } | null = null
      let dropDir: 'above' | 'below' | null = null

      const onMove = (me: MouseEvent): void => {
        const block = getBlock(me.clientY)
        if (block && block.dom !== srcDom) {
          dropTarget = block
          const r = block.dom.getBoundingClientRect()
          const cr = containerRef.current!.getBoundingClientRect()
          dropDir = me.clientY < r.top + r.height / 2 ? 'above' : 'below'
          setDropState({
            top: dropDir === 'above' ? r.top - cr.top - 2 : r.bottom - cr.top - 1,
            visible: true,
          })
        } else {
          dropTarget = null
          dropDir = null
          setDropState((s) => ({ ...s, visible: false }))
        }
      }

      const onUp = (): void => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        srcDom.classList.remove('is-dragging')
        setDropState({ top: 0, visible: false })
        dragRef.current = false

        if (!dropTarget || !dropDir) return
        const sn = editor.state.doc.nodeAt(srcPos)
        const tn = editor.state.doc.nodeAt(dropTarget.pos)
        if (!sn || !tn) return

        const { tr } = editor.state
        const insertPos = dropDir === 'above' ? dropTarget.pos : dropTarget.pos + tn.nodeSize
        const srcEnd = srcPos + sn.nodeSize

        if (srcPos < insertPos) {
          tr.insert(insertPos, sn.copy(sn.content))
          tr.delete(srcPos, srcEnd)
        } else {
          tr.delete(srcPos, srcEnd)
          tr.insert(insertPos, sn.copy(sn.content))
        }
        editor.view.dispatch(tr)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [editor, hoveredBlock, getBlock, containerRef],
  )

  const visible = !!hoveredBlock && !dragRef.current

  return (
    <>
      {/* + and drag-handle buttons */}
      <div
        className={cn(
          'absolute left-0.5 z-50 flex items-center gap-0',
          'pointer-events-none opacity-0 transition-opacity duration-100',
          visible && 'pointer-events-auto opacity-100',
        )}
        style={{ top: hoveredBlock?.top ?? 0 }}
      >
        {/* Add block below */}
        <button
          type="button"
          aria-label="Add block below"
          onClick={handleAdd}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded',
            'cursor-pointer border-none bg-transparent',
            'text-muted-foreground/50 transition-all duration-100',
            'hover:bg-muted hover:text-muted-foreground',
            'active:scale-90',
          )}
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round">
            <line x1={12} y1={5} x2={12} y2={19} />
            <line x1={5} y1={12} x2={19} y2={12} />
          </svg>
        </button>

        {/* Drag to reorder */}
        <button
          type="button"
          aria-label="Drag to reorder"
          onMouseDown={handleDragStart}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded',
            'cursor-grab border-none bg-transparent',
            'text-muted-foreground/50 transition-all duration-100',
            'hover:bg-muted hover:text-muted-foreground',
            'active:cursor-grabbing active:scale-90',
          )}
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor" stroke="none">
            {[5, 10, 15, 20].flatMap((cy) => [
              <circle key={`l${cy}`} cx={9} cy={cy} r={1.5} />,
              <circle key={`r${cy}`} cx={15} cy={cy} r={1.5} />,
            ])}
          </svg>
        </button>
      </div>

      {/* Drop indicator line */}
      <div
        className={cn(
          'pointer-events-none absolute z-[100] h-[2.5px] rounded-sm bg-primary opacity-0 transition-opacity duration-75',
          dropState.visible && 'opacity-100',
        )}
        style={{ top: dropState.top, left: GUTTER_WIDTH, right: 0 }}
      />
    </>
  )
}
