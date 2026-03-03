import React, { useCallback, useRef } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GripVertical, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Callbacks injected via the extension's `addOptions` and threaded through
 * `ReactNodeViewRenderer`. They let the host editor react to button clicks
 * without the NodeView needing to know about Redux / application state.
 */
export interface ParagraphNodeViewCallbacks {
  /**
   * Called when the user clicks the "+" (add block below) button.
   * Receives the ProseMirror position of the paragraph's start so the
   * caller can insert a new node at the correct place.
   *
   * When omitted the NodeView falls back to inserting a new paragraph via a
   * direct ProseMirror transaction and moving the cursor into it.
   */
  onAddBelow?: (pos: number) => void
}

// ---------------------------------------------------------------------------
// ParagraphNodeView
// ---------------------------------------------------------------------------

/**
 * React NodeView for the custom Paragraph extension.
 *
 * Layout:
 *   [left gutter: add-below · drag-handle] [NodeViewContent]
 *
 * The left gutter is `contentEditable={false}` so ProseMirror never
 * treats clicks on buttons as text-editing interactions.
 *
 * The entire row becomes a hover group (`group` Tailwind class on the wrapper)
 * so the gutter buttons can use `opacity-0 group-hover:opacity-100` — they are
 * invisible at rest and appear only when the cursor enters the paragraph.
 */
export function ParagraphNodeView({
  node,
  getPos,
  editor,
  extension,
}: NodeViewProps): React.JSX.Element {
  const callbacks = extension.options as ParagraphNodeViewCallbacks

  // -------------------------------------------------------------------------
  // Drag state — we highlight the handle while the row is being dragged so the
  // user gets a visible affordance even when the mouse leaves the element.
  // -------------------------------------------------------------------------
  const wrapperRef = useRef<HTMLDivElement>(null)

  // -------------------------------------------------------------------------
  // Button handlers
  //
  // IMPORTANT: We call `event.preventDefault()` on every mouse-down inside
  // `contentEditable={false}` zones so ProseMirror never steals the event and
  // collapses the selection.
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
        // Default behaviour: insert an empty paragraph immediately after this one.
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

  return (
    // NodeViewWrapper is the ProseMirror-managed root element.
    // `as="div"` + `data-type="paragraph"` so CSS can target it if needed.
    // The outer div carries the `group` class for Tailwind's group-hover system.
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      className={cn(
        'group relative flex items-start gap-1',
        // Negative horizontal margin lets the gutters "float" outside the text
        // column without shifting the paragraph content itself.
        '-mx-8',
        // Vertical rhythm — match the editor's line-height for single-line paragraphs.
        'py-0',
      )}
      ref={wrapperRef}
    >
      {/* ------------------------------------------------------------------ */}
      {/* LEFT GUTTER: drag handle + add-below button                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-1',
          'w-8 shrink-0 justify-end',
          // Align buttons vertically with the first text baseline.
          // `pt-[3px]` fine-tunes against the 1.5rem line-height of the prose text.
          'pt-[3px]',
          // Keep gutters in the DOM flow — this prevents layout shifts when
          // they fade in/out, unlike absolute positioning.
          'select-none',
        )}
      >

        {/* Add paragraph below */}
        <button
          type="button"
          aria-label="Add paragraph below"
          title="Add paragraph below"
          onMouseDown={handleAddBelow}
          className={gutterBtn}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>

        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag paragraph"
          title="Drag to reorder"
          className={cn(
            gutterBtn,
          )}
        >
          <GripVertical size={17} strokeWidth={2} />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT: the editable paragraph text                               */}
      {/* ------------------------------------------------------------------ */}
      {/*
        NodeViewContent renders the actual ProseMirror editable region.
        It MUST NOT be wrapped in contentEditable={false} — it is the leaf
        that ProseMirror controls.
        TipTap v3's NodeViewContent defaults to `as="div"` (NoInfer<T> prevents
        passing "p" at the call site without an explicit cast). We keep the
        default div and apply `display: block` via Tailwind so it behaves
        identically to a <p> for all layout and Placeholder purposes.
      */}
      <NodeViewContent
        className={cn(
          'flex-1 min-w-0 block',
          // Inherit the editor's typography so this node view looks identical
          // to the default paragraph render.
          'text-lg leading-relaxed text-foreground break-words',
          // Remove browser default margins — the editor controls spacing.
          'm-0 p-0 ml-2',
        )}
      />

    </NodeViewWrapper>
  )
}
