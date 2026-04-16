import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImagePlaceholderNodeView } from '../components/ImagePlaceholderNodeView';
import type { ImageInsertHandler } from '../components/image';

export interface ImagePlaceholderOptions {
	onImageInsert?: ImageInsertHandler;
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
			insertImagePlaceholder:
				() =>
				({ commands }) => {
					return commands.insertContent({ type: this.name });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ImagePlaceholderNodeView);
	},
});
