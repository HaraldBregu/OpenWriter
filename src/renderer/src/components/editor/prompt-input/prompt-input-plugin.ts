import { posToDOMRect } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { computePosition, offset, shift, flip } from '@floating-ui/dom';

export interface PromptInputPluginProps {
  pluginKey: PluginKey | string;
  editor: Editor;
  element: HTMLElement;
  onTrigger: (triggerPos: number) => void;
  onDismiss: () => void;
  onKeyEvent: (event: KeyboardEvent) => boolean;
  /** Called just before the element becomes visible so callers can adjust size. */
  onBeforeShow?: (pos: number) => void;
  onViewReady?: (view: PromptInputView) => void;
}

export class PromptInputView {
  public editor: Editor;
  public element: HTMLElement;
  public view: EditorView;

  private visible = false;
  private triggerPos: number | null = null;
  private onDismiss: () => void;
  private onBeforeShow: ((pos: number) => void) | undefined;

  constructor(view: EditorView, props: PromptInputPluginProps) {
    this.editor = props.editor;
    this.element = props.element;
    this.view = view;
    this.onDismiss = props.onDismiss;
    this.onBeforeShow = props.onBeforeShow;

    this.element.style.display = 'none';
    this.element.style.visibility = 'hidden';
    this.element.style.position = 'absolute';
  }

  async show(pos: number): Promise<void> {
    this.triggerPos = pos;
    // Sync width before measuring — element must be display:flex so Floating UI
    // can read its dimensions, but keep it invisible until position is ready.
    this.element.style.display = 'flex';
    this.element.style.visibility = 'hidden';
    this.onBeforeShow?.(pos);
    this.visible = true;
    await this.updatePosition();
    this.element.style.visibility = 'visible';
  }

  hide(): void {
    if (this.visible) {
      this.visible = false;
      this.triggerPos = null;
      this.element.style.display = 'none';
      this.element.style.visibility = 'hidden';
      this.onDismiss();
    }
  }

  async updatePosition(): Promise<void> {
    if (this.triggerPos === null) return;

    const pos = this.triggerPos;
    const virtualEl = {
      getBoundingClientRect: () => posToDOMRect(this.view, pos, pos),
    };

    const result = await computePosition(virtualEl, this.element, {
      placement: 'bottom-start',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    });

    this.element.style.left = `${result.x}px`;
    this.element.style.top = `${result.y}px`;
  }

  isVisible(): boolean {
    return this.visible;
  }

  // No update() implementation — we intentionally never hide on editor state
  // changes. Dismissal is handled exclusively by the React mousedown listener.

  destroy(): void {
    // During plugin teardown we hide silently without calling onDismiss so we
    // don't trigger React state updates after the component has unmounted.
    this.visible = false;
    this.triggerPos = null;
    this.element.style.display = 'none';
    this.element.style.visibility = 'hidden';
  }
}

export const PromptInputPlugin = (options: PromptInputPluginProps): Plugin => {
  const key =
    typeof options.pluginKey === 'string' ? new PluginKey(options.pluginKey) : options.pluginKey;

  let pluginView: PromptInputView | null = null;

  return new Plugin({
    key,
    view: (view) => {
      pluginView = new PromptInputView(view, options);
      options.onViewReady?.(pluginView);
      return pluginView;
    },
    props: {
      handleKeyDown(view, event) {
        if (pluginView?.isVisible()) {
          if (event.key === 'Escape') {
            pluginView.hide();
            return true;
          }
          if (event.key === 'Enter') {
            return options.onKeyEvent(event);
          }
          return false;
        }

        if (event.key !== ' ') return false;

        const { state } = view;
        const { selection } = state;
        if (!selection.empty) return false;

        const $from = selection.$from;

        // Only trigger in empty paragraphs at the block start
        if ($from.parent.type.name !== 'paragraph') return false;
        if ($from.parent.content.size !== 0) return false;
        if ($from.pos !== $from.start()) return false;

        event.preventDefault();
        void pluginView?.show($from.pos);
        options.onTrigger($from.pos);
        return true;
      },
    },
  });
};
