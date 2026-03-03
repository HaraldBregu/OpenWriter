import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlashCommandState {
  active: boolean
  query: string
  /** The document position of the '/' character that opened the menu. */
  triggerPos: number
  /** Viewport-relative coordinates for positioning the menu. */
  coords: { top: number; left: number }
}

export type SlashCommandChangeHandler = (state: SlashCommandState) => void

export interface SlashCommandOptions {
  onChange: SlashCommandChangeHandler
}

// ---------------------------------------------------------------------------
// Plugin key — used externally to read plugin state if needed.
// ---------------------------------------------------------------------------

export const slashCommandKey = new PluginKey<SlashCommandState>('slashCommand')

// ---------------------------------------------------------------------------
// Helper: resolve viewport coordinates from a ProseMirror position.
// Returns coordinates just below the character so the menu appears underneath.
// ---------------------------------------------------------------------------

function resolveCoords(view: EditorView, pos: number): { top: number; left: number } {
  try {
    const coords = view.coordsAtPos(pos)
    return { top: coords.bottom + 4, left: coords.left }
  } catch {
    return { top: 0, left: 0 }
  }
}

// ---------------------------------------------------------------------------
// SlashCommand Extension
// ---------------------------------------------------------------------------

const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onChange: () => {},
    }
  },

  addProseMirrorPlugins() {
    const { onChange } = this.options

    // Mutable state — avoids repeated setState round-trips through React.
    let isActive = false
    let triggerPos = -1

    const closeMenu = (view: EditorView): void => {
      if (!isActive) return
      isActive = false
      triggerPos = -1
      onChange({ active: false, query: '', triggerPos: -1, coords: { top: 0, left: 0 } })
      view.focus()
    }

    return [
      new Plugin({
        key: slashCommandKey,

        props: {
          handleKeyDown(view, event) {
            // Open on '/'
            if (!isActive && event.key === '/') {
              // Schedule so ProseMirror inserts the character first, then we read the state.
              requestAnimationFrame(() => {
                if (view.isDestroyed) return
                const pos = view.state.selection.from
                // Confirm the character just before cursor is '/'.
                const textBefore = view.state.doc.textBetween(Math.max(0, pos - 1), pos)
                if (textBefore !== '/') return
                isActive = true
                triggerPos = pos - 1
                const coords = resolveCoords(view, triggerPos)
                onChange({ active: true, query: '', triggerPos, coords })
              })
              return false // let ProseMirror handle insertion
            }

            if (!isActive) return false

            // Close on Escape
            if (event.key === 'Escape') {
              closeMenu(view)
              return true
            }

            // Close on Space (no command matched via space)
            if (event.key === ' ') {
              closeMenu(view)
              return false
            }

            // Allow Backspace to delete query chars; close when '/' itself is deleted.
            if (event.key === 'Backspace') {
              const { from } = view.state.selection
              if (from <= triggerPos + 1) {
                // cursor is at or before trigger — slash is about to be deleted
                closeMenu(view)
              }
              // let ProseMirror handle the deletion
              return false
            }

            // ArrowUp / ArrowDown / Enter — let the React menu component handle via keydown.
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
              // Prevent ProseMirror from moving the cursor; menu captures these.
              if (isActive) {
                event.stopPropagation()
                return true
              }
            }

            return false
          },

          handleTextInput(view, _from, _to, _text) {
            if (!isActive) return false

            // Update query after ProseMirror inserts the char.
            requestAnimationFrame(() => {
              if (view.isDestroyed || !isActive) return
              const { from } = view.state.selection
              const end = from
              const start = triggerPos + 1 // character after '/'
              if (start > end) return
              const query = view.state.doc.textBetween(start, end)
              const coords = resolveCoords(view, triggerPos)
              onChange({ active: true, query, triggerPos, coords })
            })

            return false
          },
        },

        // Expose a helper on the editor instance to close the menu imperatively.
        // Used when a command is executed.
        view(editorView) {
          return {
            destroy() {
              closeMenu(editorView)
            },
          }
        },
      }),
    ]
  },
})

// ---------------------------------------------------------------------------
// executeSlashCommand — deletes the '/query' text and runs a chain command.
// ---------------------------------------------------------------------------

export function executeSlashCommand(
  editor: Editor,
  triggerPos: number,
  _query: string,
  command: (editor: Editor) => void,
): void {
  const { state } = editor
  // Delete from the '/' position to the current cursor position.
  const from = triggerPos
  const to = state.selection.from
  editor.chain().focus().deleteRange({ from, to }).run()
  // Run the transformation after deletion.
  command(editor)
}

export { SlashCommand }
