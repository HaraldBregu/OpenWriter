// 1. Define the custom node
import { Node, mergeAttributes, RawCommands } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            setCallout: (attributes: { type: string }) => ReturnType
            toggleCallout: (attributes: { type: string }) => ReturnType
        }
    }
}

export const Callout = Node.create({
    name: 'callout',

    // Define the node as a block element that can contain content
    group: 'block',
    content: 'inline*',

    // Make it selectable and deletable
    draggable: true,

    // Define attributes for the node
    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: element => element.getAttribute('data-type'),
                renderHTML: attributes => {
                    if (!attributes.type) {
                        return {}
                    }
                    return {
                        'data-type': attributes.type,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'callout', // Parse <callout> tags
            },
        ]
    },

    // Define how to render this node to HTML
    renderHTML({ HTMLAttributes }) {
        return [
            'callout', // Render as <callout> tag instead of <div>
            mergeAttributes(HTMLAttributes, {
                class: `callout callout--${HTMLAttributes['data-type'] || 'info'}`,
            }),
            0, // This means "render the content here"
        ]
    },


    // Add commands to insert/toggle the node
    addCommands() {
        return {
            setCallout:
                (attributes) =>
                    ({ commands }) => {
                        return commands.setNode(this.name, attributes)
                    },
            toggleCallout:
                (attributes) =>
                    ({ commands }) => {
                        return commands.toggleNode(this.name, 'paragraph', attributes)
                    },
        } satisfies Partial<RawCommands>
    },

    // Add keyboard shortcuts
    addKeyboardShortcuts() {
        return {
            'Mod-Alt-c': () => this.editor.commands.toggleCallout({ type: 'info' }),
        } as const
    },

    // Add input rules (auto-formatting)
    addInputRules() {
        return [
            // Auto-convert ":::" at the start of a line to a callout
            {
                find: /^:::(\w+)?\s$/,
                handler: ({ state, range, match }) => {
                    const type = match[1] || 'info'
                    const { tr } = state
                    const start = range.from
                    const end = range.to

                    tr.delete(start, end)
                    tr.replaceWith(start, start, this.type.create({ type }))
                },
            },
        ]
    },
})