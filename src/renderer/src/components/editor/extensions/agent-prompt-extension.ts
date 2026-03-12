import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AgentPromptNodeView } from './views/AgentPromptNodeView';

export interface AgentPromptOptions {
	/**
	 * Called when the user submits a non-empty prompt. The node is deleted
	 * from the document immediately after this callback is invoked.
	 */
	onSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		agentPrompt: {
			insertAgentPrompt: () => ReturnType;
		};
	}
}

export const AgentPromptExtension = Node.create<AgentPromptOptions>({
	name: 'agentPrompt',

	group: 'block',

	atom: true,

	selectable: false,

	draggable: false,

	addOptions() {
		return {
			onSubmit: (_before: string, _after: string, _cursorPos: number, _prompt: string) => { },
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
