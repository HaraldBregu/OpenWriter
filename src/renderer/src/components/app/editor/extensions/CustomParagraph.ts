import { Paragraph } from '@tiptap/extension-paragraph'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { ParagraphNodeView, type ParagraphNodeViewCallbacks } from './ParagraphNodeView'

// ---------------------------------------------------------------------------
// CustomParagraph
// ---------------------------------------------------------------------------

/**
 * Extends TipTap's built-in `Paragraph` node to render each paragraph through
 * a React NodeView that shows interactive buttons in the left gutter on hover.
 *
 * The extension accepts optional callback options (`onAddBelow`, `onDelete`,
 * `onEnhance`) so the host editor can plug in application-specific behaviour
 * without coupling this extension to Redux or application state.
 *
 * ### Keyboard shortcuts
 *
 * - **Enter** — delegates to `onAddBelow` so the host can insert a new
 *   ContentBlock below. Because each ContentBlock owns its own TipTap
 *   instance, intercepting Enter here maps naturally to "add new block".
 *
 * - **Backspace** — delegates to `onDelete` only when the paragraph is empty
 *   and the cursor is at position 0, i.e. when the user is trying to erase
 *   an empty block. Non-empty paragraphs are unaffected.
 *
 * ### Usage in AppTextEditor
 * ```ts
 * import { CustomParagraph } from './extensions/CustomParagraph'
 *
 * // Replace the default paragraph from StarterKit:
 * StarterKit.configure({ paragraph: false, ... })
 * CustomParagraph.configure({ onAddBelow: (pos) => ... })
 * ```
 *
 * ### Why extend rather than create from scratch?
 * Extending `Paragraph` preserves all built-in schema rules, commands
 * (`setParagraph`, `liftEmptyBlock`, etc.), and keyboard shortcuts so nothing
 * in the rest of the editor breaks.  We only override `addNodeView` and
 * `addKeyboardShortcuts` to inject the React renderer and block-level keys.
 */
export const CustomParagraph = Paragraph.extend<ParagraphNodeViewCallbacks>({
  /**
   * Register the ReactNodeViewRenderer so every `<p>` in the document is
   * managed by our `ParagraphNodeView` React component.
   */
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphNodeView)
  },

  addKeyboardShortcuts() {
    return {
      /**
       * Enter → add a new ContentBlock below.
       *
       * We resolve `onAddBelow` via `this.options` rather than closing over a
       * captured value so we always use the latest callback reference even if
       * the host re-renders after the extension was configured.
       */
      Enter: ({ editor }) => {
        const { onAddBelow } = this.options as ParagraphNodeViewCallbacks
        if (!onAddBelow) return false

        const { $from } = editor.state.selection
        // Only intercept inside a top-level paragraph.
        if ($from.parent.type.name !== 'paragraph') return false

        const pos = $from.before($from.depth)
        onAddBelow(pos)
        return true
      },

      /**
       * Backspace → when the paragraph is empty:
       *
       *   a) If a node exists before this one in the document, delete the
       *      current node and move the cursor to the end of the previous node.
       *
       *   b) If this is the first (or only) node in the document, delegate to
       *      `onDelete` so the host can remove the entire ContentBlock.
       *
       * Guards (all must hold before we intercept):
       *   1. Selection must be collapsed (no range selected).
       *   2. The immediate parent must be a paragraph node.
       *   3. The paragraph must be completely empty (no text content).
       *   4. The cursor must sit at offset 0 (very start of the node).
       *
       * Regular Backspace behaviour is preserved for all other cases.
       */
      Backspace: ({ editor }) => {
        const { onDelete } = this.options as ParagraphNodeViewCallbacks

        const { $from, empty } = editor.state.selection
        if (!empty) return false
        if ($from.parent.type.name !== 'paragraph') return false
        if ($from.parent.textContent !== '') return false
        if ($from.parentOffset !== 0) return false

        const nodeStart = $from.before($from.depth)

        // nodeStart > 1 means there is at least one node before this one
        // (position 0 is the doc open token, 1 is where the first node begins).
        if (nodeStart > 1) {
          const { tr } = editor.state
          // Delete the current empty paragraph node.
          tr.delete(nodeStart, nodeStart + $from.parent.nodeSize)
          // Place the cursor at the end of whatever precedes this node.
          const targetPos = nodeStart - 1
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.resolve(targetPos).pos))
          editor.view.dispatch(tr)
          return true
        }

        // First node in the document — delegate to the host (remove ContentBlock).
        if (!onDelete) return false
        onDelete(nodeStart)
        return true
      },
    }
  },
})
