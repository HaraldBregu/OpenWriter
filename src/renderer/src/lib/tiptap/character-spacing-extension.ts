import { Extension } from '@tiptap/core'

export interface CharacterSpacingOptions {
    types: string[],
    defaultSpacing: string,
    step: number, // Add a step option for increment/decrement
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        characterSpacing: {
            setCharacterSpacing: (spacing: string) => ReturnType,
            unsetCharacterSpacing: () => ReturnType,
            increaseCharacterSpacing: () => ReturnType, // New command
            decreaseCharacterSpacing: () => ReturnType, // New command
        }
    }
}

export const CharacterSpacing = Extension.create<CharacterSpacingOptions>({
    name: 'characterSpacing',

    addOptions() {
        return {
            types: ['textStyle'],
            defaultSpacing: 'normal',
            step: 0.15, // Default step for increment/decrement
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    letterSpacing: {
                        default: this.options.defaultSpacing,
                        parseHTML: element => element.style.letterSpacing || this.options.defaultSpacing,
                        renderHTML: attributes => {
                            if (attributes.letterSpacing === this.options.defaultSpacing) {
                                return {}
                            }
                            return { style: `letter-spacing: ${attributes.letterSpacing}` }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setCharacterSpacing: spacing => ({ chain }) => {
                return chain().setMark('textStyle', { letterSpacing: spacing }).run()
            },
            unsetCharacterSpacing: () => ({ chain }) => {
                return chain().setMark('textStyle', { letterSpacing: 'normal' }).run()
            },
            increaseCharacterSpacing: () => ({ chain, editor }) => {
                const currentSpacing = parseFloat(editor.getAttributes('textStyle').letterSpacing) || 0
                const newSpacing = currentSpacing + this.options.step
                return chain().setMark('textStyle', { letterSpacing: `${newSpacing}em` }).run()
            },
            decreaseCharacterSpacing: () => ({ chain, editor }) => {
                const currentSpacing = parseFloat(editor.getAttributes('textStyle').letterSpacing) || 0
                const newSpacing = currentSpacing - this.options.step // Prevent negative spacing
                return chain().setMark('textStyle', { letterSpacing: `${newSpacing}em` }).run()
            },
        }
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Alt--': () => this.editor.commands.increaseCharacterSpacing(),
            'Mod-Alt-_': () => this.editor.commands.decreaseCharacterSpacing(),
            'Mod-Alt-Space': () => this.editor.commands.unsetCharacterSpacing(),
        }
    },
})