import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from './NodeView';
import {
	createImageDropPastePlugin,
	fileToDataUri,
	type ImageInsertHandler,
} from './image-drop-paste-plugin';

export interface ImageExtensionOptions {
	/**
	 * Called for every image File that is dropped or pasted into the editor.
	 * The handler is responsible for converting the file, saving it if needed,
	 * and inserting the image node. `insertAtPos` is the document position for
	 * drops (cursor has already been moved there); it is `null` for pastes
	 * (insert at current cursor position).
	 *
	 * Defaults to converting the file to a data URI and calling setImage.
	 */
	onImageInsert: ImageInsertHandler;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		image: {
			setImage: (attrs: { src: string; alt?: string; title?: string }) => ReturnType;
		};
	}
}

export const ImageExtension = Node.create<ImageExtensionOptions>({
	name: 'image',
	group: 'block',
	atom: true,
	draggable: true,

	addOptions() {
		return {
			onImageInsert: (file, _insertAtPos) => {
				fileToDataUri(file)
					.then((src) => {
						this.editor.commands.setImage({ src, alt: file.name });
					})
					.catch((err: unknown) => {
						console.error('[ImageExtension] Failed to process image file:', err);
					});
			},
		};
	},

	addStorage() {
		return {
			documentBasePath: null as string | null,
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

	parseMarkdown: (token: Record<string, string>, helpers: Record<string, Function>) => {
		return helpers.createNode('image', {
			src: token.href,
			title: token.title,
			alt: token.text,
		});
	},

	renderMarkdown: (node: { attrs?: Record<string, string> }) => {
		const src = node.attrs?.src ?? '';
		const alt = node.attrs?.alt ?? '';
		const title = node.attrs?.title ?? '';
		return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
	},

	addCommands() {
		return {
			setImage:
				(attrs) =>
				({ commands }) => {
					return commands.insertContent({ type: this.name, attrs });
				},
		};
	},

	addProseMirrorPlugins() {
		return [createImageDropPastePlugin(this.options.onImageInsert)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(ImageNodeView);
	},
});
