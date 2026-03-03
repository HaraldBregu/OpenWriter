import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import type { Editor, AnyExtension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
  streamingContent?: string
}

// ---------------------------------------------------------------------------
// Base extensions
// ---------------------------------------------------------------------------

const BASE_EXTENSIONS: AnyExtension[] = [
  Document,
  Text,
  Paragraph,
  Heading.configure({ levels: [1, 2, 3] }),
  History,
]

// ---------------------------------------------------------------------------
// BlockControls — + button and drag handle in the left gutter.
// Hover detection finds top-level ProseMirror blocks; drag reorders them
// via ProseMirror transactions (no framer-motion dependency).
// ---------------------------------------------------------------------------

const GUTTER_WIDTH = 54

interface BlockControlsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
}

function BlockControls({ editor, containerRef }: BlockControlsProps): React.JSX.Element {
  const [ctrlState, setCtrlState] = useState({ top: 0, visible: false })
  const [dropState, setDropState] = useState({ top: 0, visible: false })
  const hoverRef = useRef<{ node: HTMLElement | null; pos: number | null }>({ node: null, pos: null })
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

  // Mouse move / leave — detect hovered block.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMove = (e: MouseEvent): void => {
      if (dragRef.current) return
      const block = getBlock(e.clientY)
      if (block) {
        hoverRef.current = { node: block.dom, pos: block.pos }
        const cR = el.getBoundingClientRect()
        const bR = block.dom.getBoundingClientRect()
        const lh = parseFloat(getComputedStyle(block.dom).lineHeight) || 30
        setCtrlState({
          top: bR.top - cR.top + Math.min(lh, bR.height) / 2 - 12,
          visible: true,
        })
      } else {
        hoverRef.current = { node: null, pos: null }
        setCtrlState((s) => ({ ...s, visible: false }))
      }
    }

    const onLeave = (): void => {
      if (dragRef.current) return
      setTimeout(() => {
        if (!dragRef.current) setCtrlState((s) => ({ ...s, visible: false }))
      }, 80)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [getBlock, containerRef])

  // Add a paragraph below the hovered block.
  const handleAdd = useCallback(() => {
    const { pos } = hoverRef.current
    if (pos === null || pos === undefined) return
    const nd = editor.state.doc.nodeAt(pos)
    const ip = pos + (nd ? nd.nodeSize : 0)
    editor.chain().focus().insertContentAt(ip, { type: 'paragraph' }).run()
    editor.commands.focus(ip + 1)
    setCtrlState((s) => ({ ...s, visible: false }))
  }, [editor])

  // Drag-to-reorder via ProseMirror transactions.
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      const { node: srcDom, pos: srcPos } = hoverRef.current
      if (!srcDom || srcPos === null || srcPos === undefined) return
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
        setCtrlState((s) => ({ ...s, visible: false }))

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
    [editor, getBlock, containerRef],
  )

  return (
    <>
      {/* + and drag-handle buttons */}
      <div
        className={cn(
          'absolute left-0.5 z-50 flex items-center gap-0',
          'pointer-events-none opacity-0 transition-opacity duration-100',
          ctrlState.visible && 'pointer-events-auto opacity-100',
        )}
        style={{ top: ctrlState.top }}
        onMouseLeave={() => {
          if (!dragRef.current) setCtrlState((s) => ({ ...s, visible: false }))
        }}
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

// ---------------------------------------------------------------------------
// EditorAdapter — owns the Tiptap editor instance.
// ---------------------------------------------------------------------------

function EditorAdapter({
  value,
  onChange,
  autoFocus,
  disabled,
  streamingContent,
  forwardedRef,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  streamingContent: string | undefined
  forwardedRef: React.Ref<HTMLDivElement>
}): React.JSX.Element {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const internalChangeRef = useRef(false)

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: BASE_EXTENSIONS,
      content: value || '',
      immediatelyRender: false,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        internalChangeRef.current = true
        onChangeRef.current(ed.getHTML())
      },
      editorProps: {
        attributes: {
          class:
            'focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words',
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const editor = useEditor(editorOptions, [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (streamingContent !== undefined) {
      const current = editor.getHTML()
      if (current !== streamingContent) {
        editor.commands.setContent(streamingContent, { emitUpdate: false })
      }
      return
    }

    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    const current = editor.getHTML()
    if (current !== (value || '')) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, streamingContent, editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed)
      return
    didAutoFocus.current = true
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor, autoFocus])

  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-full" ref={forwardedRef}>
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingLeft: GUTTER_WIDTH }}
      >
        {editor && (
          <BlockControls editor={editor} containerRef={containerRef} />
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TextEditor — public API, memoised outer shell.
// ---------------------------------------------------------------------------

const TextEditor = React.memo(
  React.forwardRef<HTMLDivElement, TextEditorProps>((props, ref) => {
    const { value, onChange, autoFocus, className, disabled, id } = props

    const stableOnChange = useCallback(
      (html: string) => onChange(html),
      [onChange],
    )

    return (
      <div id={id} className={cn('w-full', className)}>
        <EditorAdapter
          value={value}
          onChange={stableOnChange}
          autoFocus={autoFocus}
          disabled={disabled}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
        />
      </div>
    )
  }),
)
TextEditor.displayName = 'TextEditor'

export { TextEditor }
