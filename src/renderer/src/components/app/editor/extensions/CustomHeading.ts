import { Heading, type HeadingOptions } from '@tiptap/extension-heading'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { HeadingNodeView, type HeadingNodeViewCallbacks } from './HeadingNodeView'

// ---------------------------------------------------------------------------
// CustomHeading
// ---------------------------------------------------------------------------

/**
 * Extends TipTap's built-in `Heading` node to render every heading (h1–h6)
 * through a React NodeView that shows interactive gutter buttons on hover.
 *
 * All built-in heading behaviour is preserved:
 *   - `setHeading` / `toggleHeading` commands
 *   - Keyboard shortcuts: Mod-Alt-1 … Mod-Alt-6
 *   - Markdown input rules: `# `, `## `, `### ` …
 *   - Schema attributes (`level`) and serialisation rules
 *
 * The extension accepts optional callback options (`onAddBelow`, `onComment`)
 * so the host editor can plug in application-specific behaviour without
 * coupling this extension to Redux or application state.
 *
 * ### Usage in AppTextEditor
 * ```ts
 * import { CustomHeading } from './extensions/CustomHeading'
 *
 * // Replace the default heading from StarterKit (already disabled there) and
 * // the standalone Heading import:
 * CustomHeading.configure({
 *   levels: [1, 2, 3, 4, 5, 6],
 *   onAddBelow: (pos) => ...,
 *   onComment:  (pos) => ...,
 * })
 * ```
 *
 * ### Why extend rather than create from scratch?
 * Extending `Heading` preserves the full schema definition (attribute
 * validation, `toDOM`, `parseDOM`), all commands, and all keyboard shortcuts
 * so nothing in the rest of the editor is affected.  We only override
 * `addNodeView` to inject the React renderer.
 */
export const CustomHeading = Heading.extend<HeadingOptions & HeadingNodeViewCallbacks>({
  /**
   * Register the ReactNodeViewRenderer so every heading in the document is
   * managed by our `HeadingNodeView` React component.
   *
   * The renderer reads `this.options` (which includes `onAddBelow` and
   * `onComment`) via `extension.options` inside the NodeView component.
   */
  // addNodeView() {
  //   return ReactNodeViewRenderer(HeadingNodeView)
  // },
})
