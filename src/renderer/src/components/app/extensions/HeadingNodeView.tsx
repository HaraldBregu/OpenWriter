import React, { useCallback, useRef, useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GripVertical, Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Callbacks injected via the extension's `addOptions` and threaded through
 * `ReactNodeViewRenderer`. They mirror the paragraph callback shape exactly so
 * the host editor can use the same handler functions for both node types.
 */
export interface HeadingNodeViewCallbacks {
  /**
   * Called when the user clicks the "+" (add block below) button.
   * Receives the ProseMirror position of the heading's start so the caller can
   * insert a new node at the correct place.
   */
  onAddBelow?: (pos: number) => void
  /**
   * Called when the user clicks the comment / options icon on the right.
   * The host can open a sidebar panel, popover, or any UI it owns.
   */
  onComment?: (pos: number) => void
}

// ---------------------------------------------------------------------------
// Heading level → Tailwind typography classes
// ---------------------------------------------------------------------------

/**
 * Maps a heading level (1–6) to the Tailwind size + weight classes that match
 * the project's prose scale.  Levels beyond 4 are rare in practice but
 * included for completeness so the extension never falls back to unstyled text.
 */
const HEADING_CLASS_MAP: Record<number, string> = {
  1: 'text-3xl font-bold leading-tight',
  2: 'text-2xl font-semibold leading-snug',
  3: 'text-xl font-semibold leading-snug',
  4: 'text-lg font-semibold leading-normal',
  5: 'text-base font-semibold leading-normal',
  6: 'text-sm font-semibold leading-normal',
}

// ---------------------------------------------------------------------------
// HeadingNodeView
// ---------------------------------------------------------------------------

/**
 * React NodeView for the custom Heading extension.
 *
 * Layout:
 *   [left gutter: drag-handle · add-below] [NodeViewContent] [right gutter: comment]
 *
 * This is structurally identical to `ParagraphNodeView` — the only differences
 * are:
 *   1. The `NodeViewContent` receives size + weight classes derived from
 *      `node.attrs.level` rather than a single fixed text-lg class.
 *   2. The wrapper carries `data-type="heading"` and `data-level={level}` for
 *      CSS targeting and debugging.
 *   3. The drag-handle aria-label and the add-below button label reference
 *      "heading" instead of "paragraph".
 *
 * All gutter columns are `contentEditable={false}` so ProseMirror never treats
 * clicks on buttons as text-editing interactions.
 *
 * The entire row is a hover group (`group` Tailwind class on the wrapper) so
 * the gutter buttons can use `opacity-0 group-hover:opacity-100` — invisible
 * at rest and revealed only when the cursor enters the heading row.
 */
export function HeadingNodeView({
  node,
  getPos,
  editor,
  extension,
}: NodeViewProps): React.JSX.Element {
  const callbacks = extension.options as HeadingNodeViewCallbacks
  const level = (node.attrs.level as number) ?? 1

  // -------------------------------------------------------------------------
  // Drag state — highlight the handle while the row is being dragged so the
  // user has a visible affordance even when the mouse leaves the element.
  // -------------------------------------------------------------------------
  const [isDragging, setIsDragging] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // -------------------------------------------------------------------------
  // Button handlers
  //
  // IMPORTANT: `event.preventDefault()` on every mouse-down inside
  // `contentEditable={false}` zones prevents ProseMirror from stealing the
  // event and collapsing the selection.
  // -------------------------------------------------------------------------

  const handleAddBelow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos === undefined) return

      if (callbacks.onAddBelow) {
        callbacks.onAddBelow(pos)
      } else {
        // Default behaviour: insert an empty paragraph immediately after this heading.
        const { state, dispatch } = editor.view
        const nodeEnd = pos + node.nodeSize
        const tr = state.tr.insert(nodeEnd, state.schema.nodes.paragraph.create())
        dispatch(tr)
        // Move the cursor into the new paragraph.
        editor.commands.focus()
        editor.commands.setTextSelection(nodeEnd + 1)
      }
    },
    [callbacks, editor, getPos, node.nodeSize],
  )

  const handleComment = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos === undefined) return

      callbacks.onComment?.(pos)
    },
    [callbacks, getPos],
  )

  // Pointer events for the drag handle — we delegate to ProseMirror's built-in
  // node drag support rather than implementing custom DnD here.
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const gutterBtn = cn(
    'flex items-center justify-center',
    'h-6 w-6 rounded-md',
    'text-muted-foreground/40',
    'hover:text-muted-foreground hover:bg-muted/60',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    // Invisible by default; the wrapper's `group` makes them appear on hover.
    'opacity-0 group-hover:opacity-100',
  )

  // The typography classes are stable per heading level; no recalculation needed.
  const contentClasses = cn(
    'flex-1 min-w-0 block',
    HEADING_CLASS_MAP[level] ?? HEADING_CLASS_MAP[6],
    'text-foreground break-words',
    // Remove browser default margins — the editor controls spacing.
    'm-0 p-0',
  )

  return (
    // NodeViewWrapper is the ProseMirror-managed root element.
    // `data-type="heading"` and `data-level` allow CSS to target heading rows.
    // The outer div carries the `group` class for Tailwind's group-hover system.
    <NodeViewWrapper
      as="div"
      data-type="heading"
      data-level={level}
      className={cn(
        'group relative flex items-start gap-1',
        // Negative horizontal margin lets the gutters "float" outside the text
        // column without shifting the heading content itself.
        '-mx-8',
        'py-0',
      )}
      ref={wrapperRef}
      onDragEnd={handleDragEnd}
    >
      {/* ------------------------------------------------------------------ */}
      {/* LEFT GUTTER: drag handle + add-below button                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-0.5',
          'w-8 shrink-0 justify-end',
          // Align buttons with the first text baseline.
          // Headings are taller than body text, so we use a slightly larger
          // top offset (`pt-1`) to visually centre the buttons against the cap height.
          'pt-1',
          'select-none',
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag heading"
          title="Drag to reorder"
          onMouseDown={handleDragHandleMouseDown}
          className={cn(
            gutterBtn,
            isDragging && 'opacity-100 text-muted-foreground cursor-grabbing',
            !isDragging && 'cursor-grab',
          )}
        >
          <GripVertical size={13} strokeWidth={2} />
        </button>

        {/* Add paragraph below */}
        <button
          type="button"
          aria-label="Add paragraph below"
          title="Add paragraph below"
          onMouseDown={handleAddBelow}
          className={gutterBtn}
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT: the editable heading text                                 */}
      {/* ------------------------------------------------------------------ */}
      {/*
        NodeViewContent renders the actual ProseMirror editable region.
        It MUST NOT be wrapped in contentEditable={false} — it is the leaf
        that ProseMirror controls.

        We do NOT pass `as="h1"` (or any hN) here because TipTap v3's
        NodeViewContent uses NoInfer<T> which prevents passing semantic heading
        tags at the call site without an explicit cast.  The visual appearance
        is driven entirely by the Tailwind size + weight classes derived from
        `node.attrs.level`, which is sufficient for the editor context.
        The actual DOM node type (h1/h2/…) is only relevant for document export,
        which TipTap handles via its schema `toDOM` rules — those are unaffected
        by the NodeView.
      */}
      <NodeViewContent className={contentClasses} />

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT GUTTER: comment / options button                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-0.5',
          'w-8 shrink-0 justify-start',
          'pt-1',
          'select-none',
        )}
      >
        <button
          type="button"
          aria-label="Add comment"
          title="Add comment"
          onMouseDown={handleComment}
          className={gutterBtn}
        >
          <MessageSquare size={13} strokeWidth={2} />
        </button>
      </div>
    </NodeViewWrapper>
  )
}
