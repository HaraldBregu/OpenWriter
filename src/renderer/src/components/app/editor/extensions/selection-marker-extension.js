import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
export const selectionMarkerPluginKey = new PluginKey('selectionMarker');
function getTextSelectionRange(selection) {
    if (!(selection instanceof TextSelection) || selection.empty) {
        return null;
    }
    return {
        from: selection.from,
        to: selection.to,
    };
}
function createDecorations(doc, range, focused) {
    if (focused || !range) {
        return DecorationSet.empty;
    }
    return DecorationSet.create(doc, [
        Decoration.inline(range.from, range.to, { class: 'selection-marker' }, {
            inclusiveStart: true,
            inclusiveEnd: true,
        }),
    ]);
}
export const SelectionMarkerExtension = Extension.create({
    name: 'selectionMarker',
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: selectionMarkerPluginKey,
                state: {
                    init: (_, state) => ({
                        focused: false,
                        deco: createDecorations(state.doc, getTextSelectionRange(state.selection), false),
                    }),
                    apply: (tr, pluginState, _oldState, newState) => {
                        const meta = tr.getMeta(selectionMarkerPluginKey);
                        const focused = meta?.focused ?? pluginState.focused;
                        const range = getTextSelectionRange(newState.selection);
                        return {
                            focused,
                            deco: createDecorations(newState.doc, range, focused),
                        };
                    },
                },
                props: {
                    handleDOMEvents: {
                        focus: (view) => {
                            view.dispatch(view.state.tr.setMeta(selectionMarkerPluginKey, { focused: true }));
                            return false;
                        },
                        blur: (view) => {
                            view.dispatch(view.state.tr.setMeta(selectionMarkerPluginKey, { focused: false }));
                            return false;
                        },
                    },
                    decorations(state) {
                        return selectionMarkerPluginKey.getState(state)?.deco ?? null;
                    },
                },
            }),
        ];
    },
});
