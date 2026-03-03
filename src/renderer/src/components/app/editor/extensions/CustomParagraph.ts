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
   *
   * `contentDOMElementTag` is not needed because NodeViewContent handles the
   * content DOM element internally via `as="p"`.
   */
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphNodeView)
  },
})
