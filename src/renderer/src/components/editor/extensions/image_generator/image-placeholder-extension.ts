import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AiImageNodeView } from './AiImageNodeView';

export interface ImagePlaceholderOptions {
	/**
	 * Called when the user submits an AI image generation prompt. The node is
	 * deleted from the document immediately after this callback is invoked.
	 */
	onSubmit: (prompt: string) => void;
	/**
	 * Called when the user drops or selects an image file directly. The node
	 * is deleted from the document immediately after this callback is invoked.
	 */
	onFileSelect: (file: File) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		imagePlaceholder: {
			insertImagePlaceholder: () => ReturnType;
		};
	}
}

export const ImagePlaceholderExtension = Node.create<ImagePlaceholderOptions>({
	name: 'imagePlaceholder',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			onSubmit: (_prompt: string) => {},
			onFileSelect: (_file: File) => {},
		};
	},

	addAttributes() {
		return {
			loading: {
				default: false,
				parseHTML: () => false,
				renderHTML: () => ({}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="image-placeholder"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-placeholder' })];
	},

	addCommands() {
		return {
			insertImagePlaceholder:
				() =>
				({ commands }) => {
					return commands.insertContent({ type: this.name });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(AiImageNodeView);
	},
});
