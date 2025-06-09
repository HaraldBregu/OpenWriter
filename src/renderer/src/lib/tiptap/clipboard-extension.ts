import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const ClipboardExtension = Extension.create({
    name: 'clipboardHandler',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('clipboardHandler'),
                props: {
                    handleDOMEvents: {
                        // @ts-ignore
                        copy: (view, event) => {
                            console.log('Copy event triggered')
                            console.log('Current DOM:', view.dom.innerHTML)
                            console.log('Selection:', view.state.selection)
                            return false // Don't prevent default
                        },
                        // @ts-ignore
                        cut: (view, event) => {
                            console.log('Cut event triggered')
                            console.log('Current DOM:', view.dom.innerHTML)
                            return false
                        },
                        // @ts-ignore
                        paste: (view, event) => {
                            console.log('Paste event triggered')
                            console.log('Current DOM:', view.dom.innerHTML)
                            return false
                        }
                    }
                }
            })
        ]
    }
})