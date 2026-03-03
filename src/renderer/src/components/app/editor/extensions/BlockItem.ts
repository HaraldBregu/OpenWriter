import { Node as TTNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { ParagraphNodeView, type ParagraphNodeViewCallbacks } from './ParagraphNodeView'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockItemOptions extends ParagraphNodeViewCallbacks {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockItem: {
      /** Set the current node to a block item. */
      setBlockItem: () => ReturnType
    }
  }
}

// ---------------------------------------------------------------------------
// BlockItem — block node
// ---------------------------------------------------------------------------

/**
 * A custom block node with the same structure and behaviour as the paragraph
 * node but registered under the name `'blockItem'`.
 *
 * Renders through `ParagraphNodeView` (Notion-style gutter buttons on hover)
 * and exposes the same keyboard shortcuts:
 *
 * - **Enter** — delegates to `onAddBelow` so the host can insert a new block.
 * - **Backspace** (empty node) —
 *     a) Previous node exists → deletes the current node and moves the cursor
 *        to the end of the previous node.
 *     b) First/only node → delegates to `onDelete` (host removes ContentBlock).
 *
 * Callbacks (`onAddBelow`, `onDelete`, `onEnhance`) are injected via
 * `.configure({...})` at the call site and forwarded to the NodeView through
 * `extension.options`.
 */
export const BlockItem = TTNode.create<BlockItemOptions>({
  name: 'blockItem',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="block-item"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'block-item',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setBlockItem: () => ({ commands }) => commands.setNode(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { onAddBelow } = this.options
        if (!onAddBelow) return false

        const { $from } = editor.state.selection
        if ($from.parent.type.name !== 'blockItem') return false

        const pos = $from.before($from.depth)
        onAddBelow(pos)
        return true
      },

      Backspace: ({ editor }) => {
        const { onDelete } = this.options

        const { $from, empty } = editor.state.selection
        if (!empty) return false
        if ($from.parent.type.name !== 'blockItem') return false
        if ($from.parent.textContent !== '') return false
        if ($from.parentOffset !== 0) return false

        const nodeStart = $from.before($from.depth)

        if (nodeStart > 1) {
          const { tr } = editor.state
          tr.delete(nodeStart, nodeStart + $from.parent.nodeSize)
          const targetPos = nodeStart - 1
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.resolve(targetPos).pos))
          editor.view.dispatch(tr)
          return true
        }

        if (!onDelete) return false
        onDelete(nodeStart)
        return true
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParagraphNodeView)
  },
})
