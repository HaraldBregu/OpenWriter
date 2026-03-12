import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AgentPromptNodeView } from './views/AgentPromptNodeView';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		agentPrompt: {
			insertAgentPrompt: () => ReturnType;
		};
	}
}

export const AgentPromptExtension = Node.create({
	name: 'agentPrompt',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addStorage() {
		return {
			onSubmit: (_prompt: string) => {},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="agent-prompt"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'agent-prompt' })];
	},

	addCommands() {
		return {
			insertAgentPrompt:
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

				return ed.commands.insertAgentPrompt();
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(AgentPromptNodeView);
	},
});
