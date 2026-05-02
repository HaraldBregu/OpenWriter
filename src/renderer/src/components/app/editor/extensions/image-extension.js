import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from '../nodes/ImageNodeView';
import { createImageDropPastePlugin, fileToDataUri, } from '../plugins/image-drop-paste-plugin';
export const ImageExtension = Node.create({
    name: 'image',
    group: 'block',
    atom: true,
    draggable: true,
    addOptions() {
        return {};
    },
    addStorage() {
        return {
            documentBasePath: null,
            onImageEditSave: null,
        };
    },
    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
        };
    },
    parseHTML() {
        return [{ tag: 'img[src]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes)];
    },
    parseMarkdown: (token, helpers) => {
        return helpers.createNode('image', {
            src: token.href,
            title: token.title,
            alt: token.text,
        });
    },
    renderMarkdown: (node) => {
        const src = node.attrs?.src ?? '';
        const alt = node.attrs?.alt ?? '';
        const title = node.attrs?.title ?? '';
        return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
    },
    addCommands() {
        return {
            setImage: (attrs) => ({ commands }) => {
                return commands.insertContent({ type: this.name, attrs });
            },
        };
    },
    addProseMirrorPlugins() {
        const onImageInsert = this.options.onImageInsert ??
            ((file, _insertAtPos) => {
                fileToDataUri(file)
                    .then((src) => {
                    this.editor.commands.setImage({ src, alt: file.name });
                })
                    .catch((err) => {
                    console.error('[ImageExtension] Failed to process image file:', err);
                });
            });
        return [createImageDropPastePlugin(onImageInsert)];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
    },
});
