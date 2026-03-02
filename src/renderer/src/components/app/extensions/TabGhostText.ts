import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabGhostTextOptions {
  /**
   * The ghost text shown at the end of the current node when TAB is pressed.
   * Defaults to an empty string — consumers should supply meaningful text
   * (e.g. an AI suggestion).
   */
  placeholder: string
}

interface TabGhostState {
  active: boolean
  /** Document position just after the end of the current block node. */
  pos: number | null
}

// ---------------------------------------------------------------------------
// Plugin key (stable singleton)
// ---------------------------------------------------------------------------

export const TAB_GHOST_KEY = new PluginKey<TabGhostState>('tabGhostText')

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

/**
 * TabGhostText — shows a ghost-text decoration at the end of the current node
 * when the user presses TAB. ESC (or any content change / selection move)
 * dismisses it.
 *
 * @example
 * TabGhostText.configure({ placeholder: 'Continue writing…' })
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
        // Plugin state machine
        // -----------------------------------------------------------------
        state: {
          init: (): TabGhostState => ({ active: false, pos: null }),

          apply(tr, prev): TabGhostState {
            // Explicit command via meta takes priority.
            const meta = tr.getMeta(TAB_GHOST_KEY) as TabGhostState | undefined
            if (meta !== undefined) return meta

            // Dismiss automatically when the document or selection changes
            // so the ghost never points to a stale position.
            if (prev.active && (tr.docChanged || tr.selectionSet)) {
              return { active: false, pos: null }
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

              // End of the current block node (paragraph, heading, …).
              const { $from } = view.state.selection
              const pos = $from.end()

              view.dispatch(view.state.tr.setMeta(TAB_GHOST_KEY, { active: true, pos }))
              return true
            }

            if (event.key === 'Escape' && state?.active) {
              view.dispatch(
                view.state.tr.setMeta(TAB_GHOST_KEY, { active: false, pos: null }),
              )
              return true
            }

            return false
          },

          // -----------------------------------------------------------------
          // Ghost-text decoration
          // -----------------------------------------------------------------
          decorations(state) {
            const pluginState = TAB_GHOST_KEY.getState(state)
            if (!pluginState?.active || pluginState.pos === null || !placeholder) {
              return DecorationSet.empty
            }

            const widget = Decoration.widget(
              pluginState.pos,
              () => {
                const el = document.createElement('span')
                el.className = 'tiptap-ghost-text'
                el.setAttribute('aria-hidden', 'true')
                el.textContent = placeholder
                return el
              },
              // side: 1 → render after any real content at the same position.
              // key keeps React/ProseMirror from re-creating the DOM node on
              // every state update.
              { side: 1, key: 'tab-ghost-text' },
            )

            return DecorationSet.create(state.doc, [widget])
          },
        },
      }),
    ]
  },
})
