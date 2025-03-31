import { Mark, mergeAttributes } from "@tiptap/core";

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bookmarkText: {
            setBookmarkText: (id: string) => ReturnType;
            unsetBookmarkText: () => ReturnType;
        };
    }
}


const BookmarkIdentifiedText = Mark.create({
    name: 'bookmarkText',

    addOptions() {
        return {
            HTMLAttributes: {},
            textColor: 'darkgreen',
            backgroundColor: 'lightgreen',
        };
    },

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: element => element.getAttribute('data-id'),
                renderHTML: attributes => {
                    if (!attributes.id) return {};
                    return { 'data-id': attributes.id };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-id]',
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                HTMLAttributes,
                {
                    style: `color: ${this.options.textColor};background-color: ${this.options.backgroundColor};`,
                    class: 'identified-text'
                }
            ),
            0
        ];
    },

    addCommands() {
        return {
            setBookmarkText: (id) => ({ commands }) => {
                console.log("🚀 ~ addCommands ~ id:", id)
                return commands.setMark(this.name, { id });
            },
            unsetBookmarkText: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },
});

export { BookmarkIdentifiedText }