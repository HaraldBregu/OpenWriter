import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PlaceholderNodeView } from '../nodes/PlaceholderNodeView';
export const ImagePlaceholderExtension = Node.create({
    name: 'imagePlaceholder',
    group: 'block',
    atom: true,
    selectable: false,
    draggable: false,
    addOptions() {
        return {};
    },
    parseHTML() {
        return [{ tag: 'div[data-type="image-placeholder"]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-placeholder' })];
    },
    addCommands() {
        return {
            insertImagePlaceholder: () => ({ commands }) => {
                return commands.insertContent({ type: this.name });
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(PlaceholderNodeView);
    },
});
