import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from './NodeView';
import {
	createImageDropPastePlugin,
	fileToDataUri,
	type ImageFileHandler,
} from './image-drop-paste-plugin';

export interface ImageExtensionOptions {
	/**
	 * Called for every image File that is dropped or pasted into the editor.
	 * Must return a Promise resolving to the image src string (data URI or path).
	 * Defaults to converting the file to a data URI.
	 */
	onImageFile: ImageFileHandler;
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
			onImageFile: fileToDataUri,
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
		return [createImageDropPastePlugin(this.editor, this.options.onImageFile)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(ImageNodeView);
	},
});
