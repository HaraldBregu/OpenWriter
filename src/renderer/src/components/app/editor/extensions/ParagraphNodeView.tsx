import React, { useCallback, useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GripVertical, Plus, MoreVertical, Trash2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  /** Called when the user selects "Delete" from the paragraph menu. */
  onDelete?: (pos: number) => void
  /** Called when the user selects "Enhance" from the paragraph menu. */
  onEnhance?: (pos: number) => void
  /** Placeholder text shown when the paragraph is empty. */
  placeholder?: string
}

// ---------------------------------------------------------------------------
// ParagraphNodeView
// ---------------------------------------------------------------------------

/**
 * React NodeView for the custom Paragraph extension.
 *
 * Layout:
 *   [left gutter: add-below · drag-handle] [NodeViewContent] [right gutter: ⋯ menu]
 *
 * Both gutters are `contentEditable={false}` so ProseMirror never treats
 * clicks on buttons as text-editing interactions.
 *
 * The entire row becomes a hover group (`group` Tailwind class on the wrapper)
 * so the gutter buttons use `opacity-0 group-hover:opacity-100` — invisible at
 * rest, visible on hover.
 */
export function ParagraphNodeView({
  node,
  getPos,
  editor,
  extension,
}: NodeViewProps): React.JSX.Element {
  const callbacks = extension.options as ParagraphNodeViewCallbacks
  const [menuOpen, setMenuOpen] = useState(false)
  const isEmpty = node.textContent === ''
  const placeholder = callbacks.placeholder ?? 'Write something, or type "/" for commands…'

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
        editor.commands.focus()
        editor.commands.setTextSelection(nodeEnd + 1)
      }
    },
    [callbacks, editor, getPos, node.nodeSize],
  )

  const handleDelete = useCallback(() => {
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (pos === undefined) return

    if (callbacks.onDelete) {
      callbacks.onDelete(pos)
    } else {
      // Default: delete this paragraph node via ProseMirror transaction.
      const { state, dispatch } = editor.view
      const tr = state.tr.delete(pos, pos + node.nodeSize)
      dispatch(tr)
    }
  }, [callbacks, editor, getPos, node.nodeSize])

  const handleEnhance = useCallback(() => {
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (pos === undefined) return
    callbacks.onEnhance?.(pos)
  }, [callbacks, getPos])

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
    // The outer div carries the `group` class for Tailwind's group-hover system.
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      className={cn(
        'group relative flex items-start gap-1',
        // Negative horizontal margin lets the gutters "float" outside the text
        // column without shifting the paragraph content itself.
        '-mx-8',
        'py-0',
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* LEFT GUTTER: add-below button + drag handle                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-1',
          'w-8 shrink-0 justify-end',
          'pt-[3px]',
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
          className={cn(gutterBtn, 'cursor-grab')}
        >
          <GripVertical size={17} strokeWidth={2} />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT: the editable paragraph text                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative flex-1 min-w-0 ml-2">
        {isEmpty && (
          <span
            aria-hidden="true"
            className="absolute inset-0 text-lg leading-relaxed text-muted-foreground/40 pointer-events-none select-none"
          >
            {placeholder}
          </span>
        )}
        <NodeViewContent
          className={cn(
            'block w-full',
            'text-lg leading-relaxed text-foreground break-words',
            'm-0 p-0',
          )}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT GUTTER: ⋯ dropdown menu                                      */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center',
          'w-8 shrink-0 justify-start',
          'pt-[3px]',
          'select-none',
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Paragraph options"
              title="Options"
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                gutterBtn,
                // Keep visible while the menu is open even if mouse moved away.
                menuOpen && 'opacity-100 text-muted-foreground',
              )}
            >
              <MoreVertical size={17} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-40">
            <DropdownMenuItem
              onSelect={handleEnhance}
              className="gap-2 cursor-pointer"
            >
              <Sparkles size={14} strokeWidth={2} />
              Enhance
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 size={14} strokeWidth={2} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </NodeViewWrapper>
  )
}
