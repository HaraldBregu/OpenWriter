import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabGhostTextOptions {
  /**
   * Text rendered via CSS `::after` on the current block node when TAB is
   * pressed. Pass an AI suggestion or any hint string.
   * Defaults to empty — the feature is a no-op until a placeholder is set.
   */
  placeholder: string
}

interface TabGhostState {
  active: boolean
  /** Start position of the block node (before its opening token). */
  nodeFrom: number | null
  /** End position of the block node (after its closing token). */
  nodeTo: number | null
}

// ---------------------------------------------------------------------------
// Plugin key (stable singleton)
// ---------------------------------------------------------------------------

export const TAB_GHOST_KEY = new PluginKey<TabGhostState>('tabGhostText')

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

/**
 * TabGhostText
 *
 * - TAB   → adds a `Decoration.node` with `data-ghost-text` on the current
 *           block node; CSS `::after` renders the ghost text.
 * - ESC   → removes the decoration.
 * - Any selection move or document change → auto-dismisses.
 */
export const TabGhostText = Extension.create<TabGhostTextOptions>({
  name: 'tabGhostText',

  addOptions() {
    return { placeholder: '' }
  },

  addProseMirrorPlugins() {
    const { placeholder } = this.options

    return [
      new Plugin<TabGhostState>({
        key: TAB_GHOST_KEY,

        // -----------------------------------------------------------------
        // State machine
        // -----------------------------------------------------------------
        state: {
          init: (): TabGhostState => ({ active: false, nodeFrom: null, nodeTo: null }),

          apply(tr, prev): TabGhostState {
            const meta = tr.getMeta(TAB_GHOST_KEY) as TabGhostState | undefined
            if (meta !== undefined) return meta

            // Auto-dismiss when anything in the document or selection changes.
            if (prev.active && (tr.docChanged || tr.selectionSet)) {
              return { active: false, nodeFrom: null, nodeTo: null }
            }

            return prev
          },
        },

        // -----------------------------------------------------------------
        // Key handling
        // -----------------------------------------------------------------
        props: {
          handleKeyDown(view, event) {
            const state = TAB_GHOST_KEY.getState(view.state)

            if (event.key === 'Tab') {
              event.preventDefault()

              const { $from } = view.state.selection
              // Positions spanning the whole block node (paragraph, heading, …).
              const nodeFrom = $from.before($from.depth)
              const nodeTo = $from.after($from.depth)

              view.dispatch(
                view.state.tr.setMeta(TAB_GHOST_KEY, { active: true, nodeFrom, nodeTo }),
              )
              return true
            }

            if (event.key === 'Escape' && state?.active) {
              view.dispatch(
                view.state.tr.setMeta(TAB_GHOST_KEY, {
                  active: false,
                  nodeFrom: null,
                  nodeTo: null,
                }),
              )
              return true
            }

            return false
          },

          // -----------------------------------------------------------------
          // Node decoration — adds class + data attribute; CSS does the rest.
          // -----------------------------------------------------------------
          decorations(state) {
            const pluginState = TAB_GHOST_KEY.getState(state)

            if (
              !pluginState?.active ||
              pluginState.nodeFrom === null ||
              pluginState.nodeTo === null ||
              !placeholder
            ) {
              return DecorationSet.empty
            }

            const deco = Decoration.node(pluginState.nodeFrom, pluginState.nodeTo, {
              class: 'tiptap-ghost-active',
              'data-ghost-text': placeholder,
            })

            return DecorationSet.create(state.doc, [deco])
          },
        },
      }),
    ]
  },
})
