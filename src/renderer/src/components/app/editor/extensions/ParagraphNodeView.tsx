import React, { useCallback, useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GripVertical, Plus, MoreVertical, Trash2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
}

// ---------------------------------------------------------------------------
// ParagraphNodeView
// ---------------------------------------------------------------------------

/**
 * React NodeView for the custom Paragraph extension.
 *
 * Notion-style layout — all controls in the LEFT gutter:
 *
 *   [drag ⠿] [+] [⋮] │ [NodeViewContent ...............]
 *
 * The left gutter is `contentEditable={false}` so ProseMirror never treats
 * clicks on the control buttons as text-editing interactions.
 *
 * The entire row is a hover group (`group` Tailwind class on the wrapper) so
 * gutter controls use `opacity-0 group-hover:opacity-100` — invisible at rest,
 * revealed on hover. The `⋮` trigger also stays visible while the dropdown is
 * open via a `menuOpen` state guard.
 */
export function ParagraphNodeView({
  node,
  getPos,
  editor,
  extension,
}: NodeViewProps): React.JSX.Element {
  const callbacks = extension.options as ParagraphNodeViewCallbacks
  const [menuOpen, setMenuOpen] = useState(false)

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const getNodePos = (): number | undefined => {
    return typeof getPos === 'function' ? getPos() : undefined
  }

  // -------------------------------------------------------------------------
  // Button handlers
  //
  // IMPORTANT: `onMouseDown={(e) => e.preventDefault()}` on every button inside
  // `contentEditable={false}` zones prevents ProseMirror from stealing the
  // mousedown event and collapsing the editor selection.
  // -------------------------------------------------------------------------

  const handleAddBelow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const pos = getNodePos()
      if (pos === undefined) return

      if (callbacks.onAddBelow) {
        callbacks.onAddBelow(pos)
      } else {
        // Default: insert an empty paragraph immediately after this one and
        // move the cursor into it.
        const { state, dispatch } = editor.view
        const nodeEnd = pos + node.nodeSize
        const tr = state.tr.insert(nodeEnd, state.schema.nodes.paragraph.create())
        dispatch(tr)
        editor.commands.focus()
        editor.commands.setTextSelection(nodeEnd + 1)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callbacks, editor, node.nodeSize],
  )

  const handleDelete = useCallback(() => {
    const pos = getNodePos()
    if (pos === undefined) return
    callbacks.onDelete?.(pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks])

  const handleEnhance = useCallback(() => {
    const pos = getNodePos()
    if (pos === undefined) return
    callbacks.onEnhance?.(pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks])

  // -------------------------------------------------------------------------
  // Shared gutter button class
  // -------------------------------------------------------------------------

  const gutterBtn = cn(
    'flex items-center justify-center',
    'h-6 w-6 rounded-md',
    'text-muted-foreground/40',
    'hover:text-muted-foreground hover:bg-muted/60',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    // Hidden by default; the wrapper `group` reveals them on hover.
    'opacity-0 group-hover:opacity-100',
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    // NodeViewWrapper is the ProseMirror-managed root element.
    // `group` enables Tailwind's group-hover system for the gutter controls.
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      className={cn(
        'group relative flex items-start gap-1',
        // Negative horizontal margin lets the left gutter "float" outside the
        // text column without shifting the paragraph content itself.
        '-mx-8',
        'py-0',
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* LEFT GUTTER: drag handle · add-below · options menu               */}
      {/* All Notion controls live here. contentEditable={false} is critical  */}
      {/* — ProseMirror must not treat this zone as an editable text region.  */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-0',
          // w-8 (32px) matches the -mx-8 bleed so the gutter sits flush
          // within the editor's horizontal padding. Three 24px buttons at
          // scale would overflow, so we shrink each icon to 14px and keep
          // the buttons at h-5 w-5 (20px) — three × 20px = 60px total,
          // so we allow the gutter to be wider than the bleed. The excess
          // sits in the page's own px-10 padding without clipping.
          'w-[60px] shrink-0 justify-end',
          // Align controls with the first text baseline of a text-lg line.
          'pt-[3px]',
          'select-none',
        )}
      >
        {/* Drag handle — visual affordance for Framer Motion reorder */}
        <button
          type="button"
          aria-label="Drag paragraph"
          title="Drag to reorder"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(gutterBtn, 'cursor-grab active:cursor-grabbing')}
        >
          <GripVertical size={15} strokeWidth={2} />
        </button>

        {/* Add paragraph below */}
        <button
          type="button"
          aria-label="Add paragraph below"
          title="Add paragraph below"
          onMouseDown={handleAddBelow}
          className={gutterBtn}
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>

        {/* Options menu trigger (⋮) */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Paragraph options"
              title="Options"
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                gutterBtn,
                // Keep the trigger visible while the menu is open even if the
                // pointer has moved outside the paragraph row.
                menuOpen && 'opacity-100 text-muted-foreground',
              )}
            >
              <MoreVertical size={15} strokeWidth={2} />
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
            <DropdownMenuSeparator />
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

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT: the editable paragraph text                               */}
      {/* NodeViewContent must NOT be wrapped in contentEditable={false} —   */}
      {/* it is the leaf that ProseMirror controls.                          */}
      {/* ------------------------------------------------------------------ */}
      <NodeViewContent
        className={cn(
          'flex-1 min-w-0 block',
          'text-lg leading-relaxed text-foreground break-words',
          'm-0 p-0 ml-2',
        )}
      />
    </NodeViewWrapper>
  )
}
