import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AssistantNodeView } from './NodeView';
import type { AssistantAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';

export interface AssistantOptions {
	onGenerateTextSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
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
			onGenerateTextSubmit: (
				_before: string,
				_after: string,
				_cursorPos: number,
				_prompt: string
			) => {},
			onGenerateImageSubmit: (
				_before: string,
				_after: string,
				_cursorPos: number,
				_prompt: string,
				_files: File[]
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
				default: 'writer' as AssistantAgentId,
				parseHTML: (element) => {
					const value = element.getAttribute('data-agent-id');
					return value === 'image' ? 'image' : 'writer';
				},
				renderHTML: (attributes) => ({
					'data-agent-id': attributes.agentId as AssistantAgentId,
				}),
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
			'Mod-/': ({ editor: ed }) => {
				return ed.commands.insertAssistant();
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(AssistantNodeView);
	},
});
