import { Node as TTNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { ParagraphNodeView, type ParagraphNodeViewCallbacks } from './ParagraphNodeView'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomParagraphOptions extends ParagraphNodeViewCallbacks {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customParagraph: {
      /** Set the current node to a paragraph. */
      setParagraph: () => ReturnType
    }
  }
}

// ---------------------------------------------------------------------------
// CustomParagraph — block node
// ---------------------------------------------------------------------------

/**
 * A from-scratch paragraph block node (not extending TipTap's built-in
 * `Paragraph`) that renders each paragraph through a React NodeView showing
 * interactive gutter buttons on hover.
 *
 * The node is registered under the name `'paragraph'` so it integrates
 * transparently with StarterKit (which must be configured with
 * `paragraph: false`), the Markdown extension, and all built-in commands.
 *
 * Callbacks (`onAddBelow`, `onDelete`, `onEnhance`) are injected via
 * `addOptions` / `.configure({...})` at the call site and forwarded to the
 * NodeView through `extension.options`, keeping this node decoupled from
 * Redux and application state.
 *
 * ### Keyboard shortcuts
 *
 * - **Enter** — delegates to `onAddBelow` so the host can insert a new
 *   ContentBlock below the current one.
 *
 * - **Backspace** (on an empty paragraph) —
 *     a) If a previous node exists in the document: deletes the current node
 *        and moves the cursor to the end of the previous node.
 *     b) If this is the first/only node: delegates to `onDelete` so the host
 *        can remove the entire ContentBlock.
 */
export const CustomParagraph = TTNode.create<CustomParagraphOptions>({
  name: 'paragraph',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [{ tag: 'p' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setParagraph: () => ({ commands }) => commands.setNode(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      /** Standard shortcut to convert the current node to a paragraph. */
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),

      /**
       * Enter → add a new ContentBlock below.
       *
       * Only intercepts when the cursor is inside a top-level paragraph;
       * returns false otherwise so default ProseMirror behaviour is preserved
       * (e.g. splitting inside a list item).
       */
      Enter: ({ editor }) => {
        const { onAddBelow } = this.options
        if (!onAddBelow) return false

        const { $from } = editor.state.selection
        if ($from.parent.type.name !== 'paragraph') return false

        const pos = $from.before($from.depth)
        onAddBelow(pos)
        return true
      },

      /**
       * Backspace → remove the current node when it is empty.
       *
       * Guards (all must hold):
       *   1. Selection is collapsed (no range selected).
       *   2. Cursor is inside a paragraph node.
       *   3. The paragraph has no text content.
       *   4. Cursor sits at offset 0 (very start of the node).
       *
       * Behaviour:
       *   a) Previous node exists → delete current node via a ProseMirror
       *      transaction and move the cursor to the end of that previous node.
       *   b) No previous node → delegate to `onDelete` (remove ContentBlock).
       */
      Backspace: ({ editor }) => {
        const { onDelete } = this.options

        const { $from, empty } = editor.state.selection
        if (!empty) return false
        if ($from.parent.type.name !== 'paragraph') return false
        if ($from.parent.textContent !== '') return false
        if ($from.parentOffset !== 0) return false

        const nodeStart = $from.before($from.depth)

        // nodeStart > 1: document open token sits at 0, first node at 1.
        // Any nodeStart > 1 means at least one node exists before this one.
        if (nodeStart > 1) {
          const { tr } = editor.state
          tr.delete(nodeStart, nodeStart + $from.parent.nodeSize)
          const targetPos = nodeStart - 1
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.resolve(targetPos).pos))
          editor.view.dispatch(tr)
          return true
        }

        // First (or only) node in the document — let the host remove the block.
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
