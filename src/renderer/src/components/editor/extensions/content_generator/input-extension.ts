import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ContentGeneratorNodeView } from './NodeView';
import type { ContentGeneratorAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';

export interface ContentGeneratorOptions {
	onGenerateTextSubmit: (
		before: string,
		after: string,
		cursorPos: number,
		prompt: string,
		model: ModelInfo
	) => void;
	onGenerateImageSubmit: (
		before: string,
		after: string,
		cursorPos: number,
		prompt: string,
		files: File[],
		model: ModelInfo
	) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		contentGenerator: {
			insertContentGenerator: () => ReturnType;
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
			onGenerateTextSubmit: (
				_before: string,
				_after: string,
				_cursorPos: number,
				_prompt: string,
				_model: ModelInfo
			) => {},
			onGenerateImageSubmit: (
				_before: string,
				_after: string,
				_cursorPos: number,
				_prompt: string,
				_files: File[],
				_model: ModelInfo
			) => {},
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
				default: 'writer' as ContentGeneratorAgentId,
				parseHTML: (element) => {
					const value = element.getAttribute('data-agent-id');
					return value === 'image' ? 'image' : 'writer';
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
