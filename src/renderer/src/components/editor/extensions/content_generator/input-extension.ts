import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ContentGeneratorNodeView } from './NodeView';
import type { ContentGeneratorAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';

export interface ContentGeneratorOptions {
	defaultTextModel?: ModelInfo;
	defaultImageModel?: ModelInfo;
	onTextModelChange?: (model: ModelInfo) => void;
	onImageModelChange?: (model: ModelInfo) => void;
	onGenerateTextSubmit: (prompt: string) => void;
	onGenerateImageSubmit: (prompt: string, files: File[]) => void;
}

export interface ContentGeneratorStorage {
	defaultTextModel: ModelInfo | undefined;
	defaultImageModel: ModelInfo | undefined;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		contentGenerator: {
			insertContentGenerator: () => ReturnType;
		};
	}
}

export const ContentGeneratorExtension = Node.create<
	ContentGeneratorOptions,
	ContentGeneratorStorage
>({
	name: 'contentGenerator',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			defaultTextModel: undefined,
			defaultImageModel: undefined,
			onTextModelChange: undefined,
			onImageModelChange: undefined,
			onGenerateTextSubmit: (_prompt: string) => {},
			onGenerateImageSubmit: (_prompt: string, _files: File[]) => {},
		};
	},

	addStorage() {
		return {
			defaultTextModel: this.options.defaultTextModel,
			defaultImageModel: this.options.defaultImageModel,
		};
	},

	addAttributes() {
		return {
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
			prompt: {
				default: '',
				parseHTML: () => '',
				renderHTML: () => ({}),
			},
			agentId: {
				default: 'text' as ContentGeneratorAgentId,
				parseHTML: (element) => {
					const value = element.getAttribute('data-agent-id');
					return value === 'image' ? 'image' : 'text';
				},
				renderHTML: (attributes) => ({
					'data-agent-id': attributes.agentId as ContentGeneratorAgentId,
				}),
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
				() =>
				({ commands }) => {
					return commands.insertContent({ type: this.name });
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			Space: ({ editor: ed }) => {
				const { selection } = ed.state;
				if (!selection.empty) return false;

				const $from = selection.$from;
				if ($from.parent.type.name !== 'paragraph') return false;
				if ($from.parent.content.size !== 0) return false;
				if ($from.pos !== $from.start()) return false;

				return ed.commands.insertContentGenerator();
			},
			'Mod-/': ({ editor: ed }) => {
				return ed.commands.insertContentGenerator();
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ContentGeneratorNodeView);
	},
});
