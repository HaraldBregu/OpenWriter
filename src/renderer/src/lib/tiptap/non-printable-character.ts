import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface TextCharSymbol {
    char: string
    symbol: string
}
interface TagCharSymbol {
    tag: string
    name: string
    symbol: string
    level: undefined | number
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        nonPrintingCharacters: {
            toggleNonPrintingCharacters: () => ReturnType;
        };
    }

    interface EditorEvents {
        updateEmphasisState: void;
    }
}

export interface NonPrintableCharacterOptions {
    textCharacters: TextCharSymbol[]
    tagsCharacters: TagCharSymbol[]
    className: string
    visible: boolean
}

export const NonPrintableCharacters = Extension.create<NonPrintableCharacterOptions>({
    name: 'nonPrintingCharacter',

    addOptions() {
        return {
            visible: false,
            textCharacters: [{
                char: ' ',
                symbol: '.'
            }, {
                char: '\n',
                symbol: '¶'
            }, {
                char: '\t',
                symbol: '→'
            }],
            tagsCharacters: [{
                tag: '<br>',
                name: 'hardBreak',
                level: undefined,
                symbol: '¶'
            }, {
                tag: '<p>',
                name: 'paragraph',
                level: undefined,
                symbol: '¶'
            }, {
                tag: '<h1>',
                name: 'heading',
                level: 1,
                symbol: '¶'
            }, {
                tag: '<h2>',
                name: 'heading',
                level: 2,
                symbol: '¶'
            }, {
                tag: '<h3>',
                name: 'heading',
                level: 3,
                symbol: '¶'
            }, {
                tag: '<h4>',
                name: 'heading',
                level: 4,
                symbol: '¶'
            }, {
                tag: '<h5>',
                name: 'heading',
                level: 5,
                symbol: '¶'
            }, {
                tag: '<h6>',
                name: 'heading',
                level: 6,
                symbol: '¶'
            }],
            className: 'npc',
        }
    },

    addStorage() {
        return {
            visibility: () => this.options.visible
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('nonPrintingCharacter'),
                props: {
                    decorations: (state: any) => {
                        if (!this.options.visible) return null
                        const decorations: any[] = []
                        const { doc } = state
                        doc.descendants((node: any, pos: number) => {
                            if (node.isText) {
                                this.options.textCharacters.forEach(character => {
                                    // Only process single-character invisible characters in text nodes
                                    if (character.char.length === 1) {
                                        let idx = node.text.indexOf(character.char)
                                        while (idx !== -1 && (pos + idx < doc.content.size)) {
                                            decorations.push(
                                                Decoration.inline(
                                                    pos + idx,
                                                    pos + idx + 1,
                                                    {
                                                        class: this.options.className,
                                                        'data-symbol': character.symbol
                                                    }
                                                )
                                            )
                                            idx = node.text.indexOf(character.char, idx + 1)
                                        }
                                    }
                                })
                            } else {
                                this.options.tagsCharacters.forEach(character => {
                                    if (
                                        (
                                            node.type.name === character.name &&
                                            (
                                                (character.level && node.attrs.level === character.level) ||
                                                !character.level
                                            )
                                        ) || node.type.name === character.tag
                                    ) {
                                        decorations.push(
                                            Decoration.widget(
                                                pos + node.nodeSize - 1,
                                                () => {
                                                    const span = document.createElement('span');
                                                    span.className = this.options.className;
                                                    span.textContent = character.symbol;
                                                    return span;
                                                },
                                                { side: 1 }
                                            )
                                        );
                                    }
                                })
                            }
                        })
                        return DecorationSet.create(doc, decorations)
                    },
                },
            })
        ]
    },

    addCommands() {
        return {
            toggleNonPrintingCharacters: () => () => {
                this.options.visible = !this.options.visible;
                this.editor.view.dispatch(this.editor.view.state.tr);
                this.editor.emit('updateEmphasisState');
                return true;
            }
        }
    }
})
