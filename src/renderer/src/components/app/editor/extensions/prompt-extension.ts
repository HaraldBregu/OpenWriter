import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PromptNodeView } from '../nodes/PromptNodeView';
import type { PromptSubmitPayload } from '../types';

export interface PromptOptions {
	onPromptSubmit: (payload: PromptSubmitPayload) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		contentGenerator: {
			insertPromptView: () => ReturnType;
			removePromptView: () => ReturnType;
			setPromptViewState: (state: { loading?: boolean; enable?: boolean }) => ReturnType;
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
		const nodeName = this.name;
		return {
			insertPromptView:
				() =>
				({ commands }) => {
					return commands.insertContent({ type: nodeName });
				},
			removePromptView:
				() =>
				({ tr, state, dispatch }) => {
					let found = false;
					state.doc.descendants((node, pos) => {
						if (found) return false;
						if (node.type.name === nodeName) {
							if (dispatch) tr.delete(pos, pos + node.nodeSize);
							found = true;
							return false;
						}
						return true;
					});
					return found;
				},
			setPromptViewState:
				({ loading, enable }) =>
				({ tr, state, dispatch }) => {
					let found = false;
					state.doc.descendants((node, pos) => {
						if (found) return false;
						if (node.type.name === nodeName) {
							if (dispatch) {
								const attrs = { ...node.attrs };
								if (loading !== undefined) attrs.loading = loading;
								if (enable !== undefined) attrs.enable = enable;
								tr.setNodeMarkup(pos, undefined, attrs);
							}
							found = true;
							return false;
						}
						return true;
					});
					return found;
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

				type ExistingNode = { pos: number; size: number; attrs: Record<string, unknown> };
				const ref: { value: ExistingNode | null } = { value: null };
				ed.state.doc.descendants((node, pos) => {
					if (node.type.name === 'contentGenerator') {
						ref.value = { pos, size: node.nodeSize, attrs: { ...node.attrs } };
						return false;
					}
					return true;
				});

				const found = ref.value;
				if (!found) {
					return ed.commands.insertPromptView();
				}

				const preservedAttrs = {
					prompt: found.attrs.prompt,
					agentId: found.attrs.agentId,
					files: found.attrs.files,
				};

				return ed
					.chain()
					.deleteRange({ from: found.pos, to: found.pos + found.size })
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
