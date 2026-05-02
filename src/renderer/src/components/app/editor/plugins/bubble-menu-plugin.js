import { isTextSelection, posToDOMRect } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
export class BubbleMenuView {
    editor;
    view;
    updateDelay;
    updateDebounceTimer;
    shouldShow;
    onUpdate;
    constructor({ editor, view, updateDelay = 250, shouldShow, onUpdate }) {
        this.editor = editor;
        this.view = view;
        this.updateDelay = updateDelay;
        this.onUpdate = onUpdate;
        this.view.dom.addEventListener('dragstart', this.dragstartHandler);
        this.editor.on('focus', this.focusHandler);
        this.editor.on('blur', this.blurHandler);
        this.shouldShow =
            shouldShow ??
                (({ view: v, state, from, to }) => {
                    const { doc, selection } = state;
                    const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(selection);
                    if (!v.hasFocus() || state.selection.empty || isEmptyTextBlock)
                        return false;
                    return true;
                });
    }
    dragstartHandler = () => {
        this.emitClosed();
    };
    focusHandler = () => {
        setTimeout(() => this.update(this.editor.view));
    };
    blurHandler = () => {
        this.emitClosed();
    };
    getReferenceRect = () => {
        const { selection } = this.editor.state;
        if (isTextSelection(selection)) {
            const { ranges } = selection;
            const from = Math.min(...ranges.map((r) => r.$from.pos));
            const to = Math.max(...ranges.map((r) => r.$to.pos));
            return posToDOMRect(this.view, from, to);
        }
        const node = this.view.nodeDOM(selection.from);
        if (node)
            return node.getBoundingClientRect();
        return posToDOMRect(this.view, selection.from, selection.to);
    };
    emitOpen() {
        this.onUpdate({ open: true, getReferenceRect: this.getReferenceRect });
    }
    emitClosed() {
        this.onUpdate({ open: false, getReferenceRect: null });
    }
    update(view, oldState) {
        const { state } = view;
        const hasValidSelection = state.selection.from !== state.selection.to;
        if (this.updateDelay > 0 && hasValidSelection) {
            this.handleDebouncedUpdate(view, oldState);
            return;
        }
        const selectionChanged = !oldState?.selection.eq(view.state.selection);
        const docChanged = !oldState?.doc.eq(view.state.doc);
        this.runUpdate(view, selectionChanged, docChanged, oldState);
    }
    handleDebouncedUpdate = (view, oldState) => {
        const selectionChanged = !oldState?.selection.eq(view.state.selection);
        const docChanged = !oldState?.doc.eq(view.state.doc);
        if (!selectionChanged && !docChanged)
            return;
        if (this.updateDebounceTimer)
            clearTimeout(this.updateDebounceTimer);
        this.updateDebounceTimer = setTimeout(() => {
            this.runUpdate(view, selectionChanged, docChanged, oldState);
        }, this.updateDelay);
    };
    runUpdate = (view, selectionChanged, docChanged, oldState) => {
        const { state, composing } = view;
        const { selection } = state;
        const isSame = !selectionChanged && !docChanged;
        if (composing || isSame)
            return;
        const shouldShow = this.shouldShow({
            editor: this.editor,
            view,
            state,
            oldState,
            from: selection.from,
            to: selection.to,
        });
        if (!shouldShow) {
            this.emitClosed();
            return;
        }
        this.emitOpen();
    };
    destroy() {
        if (this.updateDebounceTimer)
            clearTimeout(this.updateDebounceTimer);
        this.view.dom.removeEventListener('dragstart', this.dragstartHandler);
        this.editor.off('focus', this.focusHandler);
        this.editor.off('blur', this.blurHandler);
    }
}
export const BubbleMenuPlugin = (options) => {
    const key = typeof options.pluginKey === 'string' ? new PluginKey(options.pluginKey) : options.pluginKey;
    return new Plugin({
        key,
        view: (view) => new BubbleMenuView({ ...options, view }),
    });
};
