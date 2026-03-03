import { isTextSelection, posToDOMRect } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { computePosition, flip, offset, shift } from '@floating-ui/dom'

export interface BubbleMenuPluginProps {
  pluginKey: PluginKey | string
  editor: Editor
  element: HTMLElement
  updateDelay?: number
  shouldShow?:
    | ((props: {
        editor: Editor
        view: EditorView
        state: EditorState
        oldState?: EditorState
        from: number
        to: number
      }) => boolean)
    | null
}

export type BubbleMenuViewProps = BubbleMenuPluginProps & {
  view: EditorView
}

export class BubbleMenuView {
  public editor: Editor
  public element: HTMLElement
  public view: EditorView
  public preventHide = false
  public updateDelay: number

  private updateDebounceTimer: ReturnType<typeof setTimeout> | undefined
  private shouldShow: Exclude<BubbleMenuPluginProps['shouldShow'], null>

  constructor({ editor, element, view, updateDelay = 250, shouldShow }: BubbleMenuViewProps) {
    this.editor = editor
    this.element = element
    this.view = view
    this.updateDelay = updateDelay

    this.element.addEventListener('mousedown', this.mousedownHandler, { capture: true })
    this.view.dom.addEventListener('dragstart', this.dragstartHandler)
    this.editor.on('focus', this.focusHandler)
    this.editor.on('blur', this.blurHandler)

    this.element.style.visibility = 'hidden'
    this.element.style.position = 'absolute'

    this.shouldShow =
      shouldShow ??
      (({ view: v, state, from, to }) => {
        const { doc, selection } = state
        const isEmptyTextBlock =
          !doc.textBetween(from, to).length && isTextSelection(selection)

        if (!v.hasFocus() || state.selection.empty || isEmptyTextBlock) {
          return false
        }

        return true
      })
  }

  mousedownHandler = (): void => {
    this.preventHide = true
  }

  dragstartHandler = (): void => {
    this.hide()
  }

  focusHandler = (): void => {
    // we use `setTimeout` to make sure `selection` is already updated
    setTimeout(() => this.update(this.editor.view))
  }

  blurHandler = ({ event }: { event: FocusEvent }): void => {
    if (this.preventHide) {
      this.preventHide = false
      return
    }

    if (event?.relatedTarget && this.element.parentNode?.contains(event.relatedTarget as Node)) {
      return
    }

    this.hide()
  }

  async updatePosition(): Promise<void> {
    const { selection } = this.editor.state

    const virtualEl = {
      getBoundingClientRect: () => {
        if (isTextSelection(selection)) {
          const { ranges } = selection
          const from = Math.min(...ranges.map((r) => r.$from.pos))
          const to = Math.max(...ranges.map((r) => r.$to.pos))
          return posToDOMRect(this.view, from, to)
        }

        const node = this.view.nodeDOM(selection.from) as HTMLElement | null
        if (node) {
          return node.getBoundingClientRect()
        }

        return posToDOMRect(this.view, selection.from, selection.to)
      },
    }

    const pos = await computePosition(virtualEl, this.element, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    })

    this.element.style.left = `${pos.x}px`
    this.element.style.top = `${pos.y}px`
  }

  show(): void {
    this.element.style.visibility = 'visible'
  }

  hide(): void {
    this.element.style.visibility = 'hidden'
  }

  update(view: EditorView, oldState?: EditorState): void {
    const { state } = view
    const hasValidSelection = state.selection.from !== state.selection.to

    if (this.updateDelay > 0 && hasValidSelection) {
      this.handleDebouncedUpdate(view, oldState)
      return
    }

    const selectionChanged = !oldState?.selection.eq(view.state.selection)
    const docChanged = !oldState?.doc.eq(view.state.doc)

    this.updateHandler(view, selectionChanged, docChanged, oldState)
  }

  handleDebouncedUpdate = (view: EditorView, oldState?: EditorState): void => {
    const selectionChanged = !oldState?.selection.eq(view.state.selection)
    const docChanged = !oldState?.doc.eq(view.state.doc)

    if (!selectionChanged && !docChanged) {
      return
    }

    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer)
    }

    this.updateDebounceTimer = setTimeout(() => {
      this.updateHandler(view, selectionChanged, docChanged, oldState)
    }, this.updateDelay)
  }

  updateHandler = (
    view: EditorView,
    selectionChanged: boolean,
    docChanged: boolean,
    oldState?: EditorState,
  ): void => {
    const { state, composing } = view
    const { selection } = state

    const isSame = !selectionChanged && !docChanged

    if (composing || isSame) {
      return
    }

    const from = selection.from
    const to = selection.to

    const shouldShow = this.shouldShow?.({
      editor: this.editor,
      view,
      state,
      oldState,
      from,
      to,
    })

    if (!shouldShow) {
      this.hide()
      return
    }

    void this.updatePosition()
    this.show()
  }

  destroy(): void {
    this.element.removeEventListener('mousedown', this.mousedownHandler, { capture: true } as EventListenerOptions)
    this.view.dom.removeEventListener('dragstart', this.dragstartHandler)
    this.editor.off('focus', this.focusHandler)
    this.editor.off('blur', this.blurHandler)
  }
}

export const BubbleMenuPlugin = (options: BubbleMenuPluginProps): Plugin => {
  const key =
    typeof options.pluginKey === 'string'
      ? new PluginKey(options.pluginKey)
      : options.pluginKey

  return new Plugin({
    key,
    view: (view) => new BubbleMenuView({ ...options, view }),
  })
}
