import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ContentGeneratorNodeView } from './NodeView';

export type ContentGeneratorMode = 'text' | 'image';

export interface ContentGeneratorOptions {
	/**
	 * Called when the user submits a text-generation prompt. The node is
	 * deleted from the document immediately after this callback is invoked.
	 */
	onTextSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
	/**
	 * Called when the user submits an AI image-generation prompt. The node is
	 * deleted from the document immediately after this callback is invoked.
	 */
	onImageSubmit: (prompt: string) => void;
	/**
	 * Called when the user drops or selects an image file directly. The node
	 * is deleted from the document immediately after this callback is invoked.
	 */
	onFileSelect: (file: File) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		contentGenerator: {
			insertContentGenerator: (mode: ContentGeneratorMode) => ReturnType;
		};
	}
}

export const ContentGeneratorExtension = Node.create<ContentGeneratorOptions>({
	name: 'contentGenerator',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			onTextSubmit: (_before: string, _after: string, _cursorPos: number, _prompt: string) => {},
			onImageSubmit: (_prompt: string) => {},
			onFileSelect: (_file: File) => {},
		};
	},

	addAttributes() {
		return {
			mode: {
				default: 'text' as ContentGeneratorMode,
				parseHTML: (element) => {
					const value = element.getAttribute('data-mode');
					return value === 'image' ? 'image' : 'text';
				},
				renderHTML: (attributes) => ({
					'data-mode': attributes.mode as ContentGeneratorMode,
				}),
			},
			loading: {
				default: false,
				parseHTML: () => false,
				renderHTML: () => ({}),
			},
			enable: {
				default: true,
				parseHTML: () => true,
				renderHTML: () => ({}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="content-generator"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'content-generator' })];
	},

	addCommands() {
		return {
			insertContentGenerator:
				(mode: ContentGeneratorMode) =>
				({ commands }) => {
					return commands.insertContent({ type: this.name, attrs: { mode } });
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ContentGeneratorNodeView);
	},
});
