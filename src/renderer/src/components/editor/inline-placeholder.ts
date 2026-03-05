import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// side: 1 — This is the critical option. It tells ProseMirror to render the widget after the cursor, not before it. Use side: -1 if you ever want it before.
// $cursor.pos === $cursor.end() — This checks that the cursor is at the very end of its parent node (e.g., a paragraph). You can relax this condition if you want the placeholder to show anywhere, not just at the end of a block.
// contenteditable="false" — Prevents the user from accidentally placing their cursor inside the decoration span.

const pluginKey = new PluginKey('inlinePlaceholder');

const InlinePlaceholder = Extension.create({
    name: 'inlinePlaceholder',

    addOptions() {
        return {
            placeholder: 'Keep writing…',
        };
    },

    // addProseMirrorPlugins() {
    //     const { placeholder } = this.options

    //     return [
    //         new Plugin({
    //             key: new PluginKey('inlinePlaceholder'),
    //             props: {
    //                 decorations(state) {
    //                     const { doc, selection } = state

    //                     // Guard: only proceed if it's a TextSelection with a cursor
    //                     if (!(selection instanceof TextSelection)) return DecorationSet.empty

    //                     const $cursor = selection.$cursor
    //                     if (!$cursor) return DecorationSet.empty

    //                     const isAtEnd = $cursor.pos === $cursor.end()
    //                     if (!isAtEnd) return DecorationSet.empty

    //                     const widget = Decoration.widget(
    //                         $cursor.pos,
    //                         () => {
    //                             const span = document.createElement('span')
    //                             span.className = 'text-gray-400 italic pointer-events-none select-none'
    //                             span.textContent = placeholder
    //                             span.setAttribute('contenteditable', 'false')
    //                             return span
    //                         },
    //                         { side: 1 }
    //                     )

    //                     return DecorationSet.create(doc, [widget])
    //                 },
    //             },
    //         }),
    //     ]
    // },

    addProseMirrorPlugins() {
        const { placeholder } = this.options;

        return [
            new Plugin({
                key: pluginKey,

                // Track focus state in plugin state
                state: {
                    init: () => ({ focused: false }),
                    apply(tr, pluginState) {
                        const meta = tr.getMeta(pluginKey);
                        if (meta !== undefined) return { focused: meta.focused };
                        return pluginState;
                    },
                },

                props: {
                    // Update focus state on focus/blur events
                    handleDOMEvents: {
                        focus(view) {
                            view.dispatch(view.state.tr.setMeta(pluginKey, { focused: true }));
                            return false;
                        },
                        blur(view) {
                            view.dispatch(view.state.tr.setMeta(pluginKey, { focused: false }));
                            return false;
                        },
                    },

                    decorations(state) {
                        const pluginState = this.getState(state);
                        if (!pluginState?.focused) return DecorationSet.empty;

                        const { doc, selection } = state;

                        if (!(selection instanceof TextSelection)) return DecorationSet.empty;

                        const $cursor = selection.$cursor;
                        if (!$cursor) return DecorationSet.empty;

                        const isAtEnd = $cursor.pos === $cursor.end();
                        if (!isAtEnd) return DecorationSet.empty;

                        const widget = Decoration.widget(
                            $cursor.pos,
                            () => {
                                const span = document.createElement('span');
                                span.className = 'text-gray-400 italic pointer-events-none select-none';
                                span.textContent = ' ' + placeholder;
                                span.setAttribute('contenteditable', 'false');
                                return span;
                            },
                            { side: 1 }
                        );

                        return DecorationSet.create(doc, [widget]);
                    },
                },
            }),
        ];
    },
});

export { InlinePlaceholder };
