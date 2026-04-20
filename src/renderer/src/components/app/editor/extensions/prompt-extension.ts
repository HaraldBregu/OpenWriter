import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PromptNodeView } from '../nodes/PromptNodeView';
import { PromptOptions } from '@shared/index';

type AgentId = 'text' | 'image';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		contentGenerator: {
			insertPromptView: () => ReturnType;
		};
	}
}

export const PromptExtension = Node.create<
	PromptOptions,
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
			onPromptSubmit: () => {},
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
				default: 'text' as AgentId,
				parseHTML: (element) => {
					const value = element.getAttribute('data-agent-id');
					return value === 'image' ? 'image' : 'text';
				},
				renderHTML: (attributes) => ({
					'data-agent-id': attributes.agentId as AgentId,
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
			insertPromptView:
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

				return ed.commands.insertPromptView();
			},
			'Mod-/': ({ editor: ed }) => {
				return ed.commands.insertPromptView();
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(PromptNodeView);
	},
});
