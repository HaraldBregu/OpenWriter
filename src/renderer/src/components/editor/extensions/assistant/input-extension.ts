import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AssistantNodeView } from './NodeView';

export interface AssistantOptions {
	onSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		assistant: {
			insertAssistant: () => ReturnType;
		};
	}
}

export const AssistantExtension = Node.create<AssistantOptions>({
	name: 'assistant',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			onSubmit: (_before: string, _after: string, _cursorPos: number, _prompt: string) => {},
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
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="assistant"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'assistant' })];
	},

	addCommands() {
		return {
			insertAssistant:
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

				return ed.commands.insertAssistant();
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(AssistantNodeView);
	},
});
