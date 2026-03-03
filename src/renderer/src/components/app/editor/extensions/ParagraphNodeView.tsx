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
 *   [⠿] [+] [⋮]  │  [paragraph text .................]
 *
 * Width budget (left side):
 *   - ContentPage applies `px-10` (40px) to the content container.
 *   - AppTextEditor applies `px-8` (32px) to EditorContent.
 *   - NodeViewWrapper uses `-mx-8` to bleed 32px into the editor padding.
 *   - The gutter is `w-[72px]` — it spills an extra 40px into the page
 *     padding, which is exactly what `px-10` provides. The right-aligned
 *     buttons therefore sit flush against the paragraph text at all times.
 *
 * All controls are `contentEditable={false}` so ProseMirror never treats
 * button clicks as text-editing interactions.
 *
 * The `group` class on NodeViewWrapper drives `opacity-0 group-hover:opacity-100`
 * — controls are invisible at rest and appear on hover.
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
  // `onMouseDown={(e) => e.preventDefault()}` on every control prevents
  // ProseMirror from stealing the mousedown and collapsing the selection.
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
        // Default: insert an empty paragraph immediately after this one.
        const { state, dispatch } = editor.view
        const nodeEnd = pos + node.nodeSize
        const tr = state.tr.insert(nodeEnd, state.schema.nodes.paragraph.create())
        dispatch(tr)
        editor.commands.focus()
        editor.commands.setTextSelection(nodeEnd + 1)
      }
    },
    // getNodePos reads getPos via closure — stable across renders.
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
  // Shared gutter button style
  // -------------------------------------------------------------------------

  const gutterBtn = cn(
    'flex items-center justify-center',
    'h-6 w-6 rounded-md',
    'text-muted-foreground/40',
    'hover:text-muted-foreground hover:bg-muted/60',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    // Hidden at rest; the `group` on NodeViewWrapper reveals on hover.
    'opacity-0 group-hover:opacity-100',
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      className={cn(
        'group relative flex items-start',
        // -mx-8 bleeds the row into the editor's px-8 padding so the gutter
        // can occupy that space without displacing the text column.
        '-mx-8',
        'py-0',
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* LEFT GUTTER — drag handle · add-below · options (⋮)               */}
      {/*                                                                    */}
      {/* MUST be contentEditable={false}. ProseMirror skips mouse events    */}
      {/* inside non-editable zones, so buttons fire normally without        */}
      {/* disrupting the editor cursor or selection.                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        contentEditable={false}
        suppressContentEditableWarning
        className={cn(
          'flex items-center gap-0.5',
          // 72px = 32px bleed (matching -mx-8) + 40px page padding (px-10).
          // justify-end keeps the controls flush-right against the text edge.
          'w-[72px] shrink-0 justify-end',
          // pt aligns the icon row with the cap-height of text-lg / leading-relaxed.
          'pt-[3px]',
          'select-none',
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag paragraph"
          title="Drag to reorder"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(gutterBtn, 'cursor-grab active:cursor-grabbing')}
        >
          <GripVertical size={14} strokeWidth={2} />
        </button>

        {/* Add paragraph below */}
        <button
          type="button"
          aria-label="Add paragraph below"
          title="Add paragraph below"
          onMouseDown={handleAddBelow}
          className={gutterBtn}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>

        {/* Options menu (⋮) */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Paragraph options"
              title="Options"
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                gutterBtn,
                // Stay visible while the dropdown is open, even if the pointer
                // has left the paragraph row.
                menuOpen && 'opacity-100 text-muted-foreground',
              )}
            >
              <MoreVertical size={14} strokeWidth={2} />
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
      {/* CONTENT — the editable paragraph text                              */}
      {/*                                                                    */}
      {/* NodeViewContent renders the ProseMirror-managed editable region.   */}
      {/* It must NOT be wrapped in contentEditable={false}.                 */}
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
