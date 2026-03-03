import { Paragraph } from '@tiptap/extension-paragraph'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ParagraphNodeView, type ParagraphNodeViewCallbacks } from './ParagraphNodeView'

// ---------------------------------------------------------------------------
// CustomParagraph
// ---------------------------------------------------------------------------

/**
 * Extends TipTap's built-in `Paragraph` node to render each paragraph through
 * a React NodeView that shows interactive buttons in the left and right gutters
 * on hover.
 *
 * The extension accepts optional callback options (`onAddBelow`, `onComment`)
 * so the host editor can plug in application-specific behaviour without
 * coupling this extension to Redux or application state.
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
 * in the rest of the editor breaks.  We only override `addNodeView` to inject
 * the React renderer.
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
      Enter: ({ editor }) => {
        const { onAddBelow } = this.options as ParagraphNodeViewCallbacks
        if (!onAddBelow) return false

        const { $from } = editor.state.selection
        if ($from.parent.type.name !== 'paragraph') return false

        const pos = $from.before($from.depth)
        onAddBelow(pos)
        return true
      },

      Backspace: ({ editor }) => {
        const { onDelete } = this.options as ParagraphNodeViewCallbacks
        if (!onDelete) return false

        const { $from, empty } = editor.state.selection
        // Only intercept when: cursor is collapsed, at the very start of the
        // paragraph, the paragraph is empty, and we're directly in a paragraph.
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
