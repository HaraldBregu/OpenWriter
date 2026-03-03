import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import type { Editor, AnyExtension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { cn } from '@/lib/utils'
import { BlockControls, GUTTER_WIDTH, type HoveredBlock } from './BlockControls'
import { BlockActions } from './BlockActions'
import { BubbleMenu } from './bubble-menu'
import { OptionMenu } from './option-menu'
import { Placeholder } from '@tiptap/extensions'

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
  onContinueWithAI?: (content: string) => void
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
  Bold,
  Italic,
  Underline,
  Strike,
  BulletList,
  OrderedList,
  ListItem,
  Placeholder.configure({ placeholder: "Type '/' for commands, or start writing\u2026" }),
]

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
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null)

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
    [editor],
  )

  // Mouse move / leave — detect hovered block.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMove = (e: MouseEvent): void => {
      const block = getBlock(e.clientY)
      if (block) {
        const cR = el.getBoundingClientRect()
        const bR = block.dom.getBoundingClientRect()
        const lh = parseFloat(getComputedStyle(block.dom).lineHeight) || 30
        setHoveredBlock({
          node: block.dom,
          pos: block.pos,
          top: bR.top - cR.top + Math.min(lh, bR.height) / 2 - 12,
        })
      } else {
        setHoveredBlock(null)
      }
    }

    const onLeave = (): void => {
      setTimeout(() => {
        setHoveredBlock(null)
      }, 80)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [getBlock])

  return (
    <div className="relative w-full" ref={forwardedRef}>
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
      >
        {editor && (
          <>
            <BlockControls editor={editor} containerRef={containerRef} hoveredBlock={hoveredBlock} />
            <BlockActions editor={editor} containerRef={containerRef} hoveredBlock={hoveredBlock} />
            <BubbleMenu editor={editor} />
            <OptionMenu editor={editor} />
          </>
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
