import { Paragraph } from '@tiptap/extension-paragraph'
import { ReactNodeViewRenderer } from '@tiptap/react'
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
       * Backspace → delete the current ContentBlock when it is empty.
       *
       * Guards:
       *   1. Selection must be collapsed (no range selected).
       *   2. The immediate parent must be a paragraph node.
       *   3. The paragraph must be completely empty (no text content).
       *   4. The cursor must sit at offset 0 (very start of the node).
       *
       * All four must hold before we hand off to `onDelete`; otherwise
       * regular Backspace behaviour (delete the preceding character) is used.
       */
      Backspace: ({ editor }) => {
        const { onDelete } = this.options as ParagraphNodeViewCallbacks
        if (!onDelete) return false

        const { $from, empty } = editor.state.selection
        if (!empty) return false
        if ($from.parent.type.name !== 'paragraph') return false
        if ($from.parent.textContent !== '') return false
        if ($from.parentOffset !== 0) return false

        const pos = $from.before($from.depth)
        onDelete(pos)
        return true
      },
    }
  },
})
