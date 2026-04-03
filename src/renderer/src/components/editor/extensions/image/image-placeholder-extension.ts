import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImagePlaceholderNodeView } from './ImagePlaceholderNodeView';
import type { ImageInsertHandler } from './image-drop-paste-plugin';

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
