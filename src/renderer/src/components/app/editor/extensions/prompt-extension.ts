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

export const PromptExtension = Node.create<PromptOptions>({
	name: 'contentGenerator',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			onPromptSubmit: () => {},
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
			files: {
				default: [] as File[],
				parseHTML: () => [] as File[],
				renderHTML: () => ({}),
			},
			statusBarVisible: {
				default: false,
				parseHTML: () => false,
				renderHTML: () => ({}),
			},
			statusBarMessage: {
				default: '',
				parseHTML: () => '',
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

				let existing: { pos: number; size: number; attrs: Record<string, unknown> } | null =
					null;
				ed.state.doc.descendants((node, pos) => {
					if (node.type.name === 'contentGenerator') {
						existing = { pos, size: node.nodeSize, attrs: { ...node.attrs } };
						return false;
					}
					return true;
				});

				if (!existing) {
					return ed.commands.insertPromptView();
				}

				const preservedAttrs = {
					prompt: existing.attrs.prompt,
					agentId: existing.attrs.agentId,
					files: existing.attrs.files,
				};

				return ed
					.chain()
					.deleteRange({ from: existing.pos, to: existing.pos + existing.size })
					.insertContent({ type: 'contentGenerator', attrs: preservedAttrs })
					.run();
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
