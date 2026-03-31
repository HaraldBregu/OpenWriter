import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../../core/definition';
import { AssistantState } from './state';
import { understandNode, type AssistantIntent } from './nodes/understand-node';
import { conversationNode } from './nodes/conversation-node';
import { writingNode } from './nodes/writing-node';
import { editingNode } from './nodes/editing-node';
import { researchNode } from './nodes/research-node';
import { imageNode } from './nodes/image-node';

export const ASSISTANT_NODE = {
	UNDERSTAND: 'understand',
	CONVERSATION: 'conversation',
	WRITING: 'writing',
	EDITING: 'editing',
	RESEARCH: 'research',
	IMAGE: 'image',
} as const;

export interface AssistantNodeModels {
	[ASSISTANT_NODE.UNDERSTAND]: BaseChatModel;
	[ASSISTANT_NODE.CONVERSATION]: BaseChatModel;
	[ASSISTANT_NODE.WRITING]: BaseChatModel;
	[ASSISTANT_NODE.EDITING]: BaseChatModel;
	[ASSISTANT_NODE.RESEARCH]: BaseChatModel;
	[ASSISTANT_NODE.IMAGE]: BaseChatModel;
}

function nodeForIntent(intent: string): keyof AssistantNodeModels {
	switch (intent as AssistantIntent) {
		case 'writing':
			return ASSISTANT_NODE.WRITING;
		case 'editing':
			return ASSISTANT_NODE.EDITING;
		case 'research':
			return ASSISTANT_NODE.RESEARCH;
		case 'image':
			return ASSISTANT_NODE.IMAGE;
		default:
			return ASSISTANT_NODE.CONVERSATION;
	}
}

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as unknown as AssistantNodeModels;

	return new StateGraph(AssistantState)
		.addNode(ASSISTANT_NODE.UNDERSTAND, (state: typeof AssistantState.State) =>
			understandNode(state, m[ASSISTANT_NODE.UNDERSTAND])
		)
		.addNode(ASSISTANT_NODE.CONVERSATION, (state: typeof AssistantState.State) =>
			conversationNode(state, m[ASSISTANT_NODE.CONVERSATION])
		)
		.addNode(ASSISTANT_NODE.WRITING, (state: typeof AssistantState.State) =>
			writingNode(state, m[ASSISTANT_NODE.WRITING])
		)
		.addNode(ASSISTANT_NODE.EDITING, (state: typeof AssistantState.State) =>
			editingNode(state, m[ASSISTANT_NODE.EDITING])
		)
		.addNode(ASSISTANT_NODE.RESEARCH, (state: typeof AssistantState.State) =>
			researchNode(state, m[ASSISTANT_NODE.RESEARCH])
		)
		.addNode(ASSISTANT_NODE.IMAGE, (state: typeof AssistantState.State) =>
			imageNode(state, m[ASSISTANT_NODE.IMAGE])
		)
		.addEdge(START, ASSISTANT_NODE.UNDERSTAND)
		.addConditionalEdges(
			ASSISTANT_NODE.UNDERSTAND,
			(state: typeof AssistantState.State) => nodeForIntent(state.intent),
			[
				ASSISTANT_NODE.CONVERSATION,
				ASSISTANT_NODE.WRITING,
				ASSISTANT_NODE.EDITING,
				ASSISTANT_NODE.RESEARCH,
				ASSISTANT_NODE.IMAGE,
			]
		)
		.addEdge(ASSISTANT_NODE.CONVERSATION, END)
		.addEdge(ASSISTANT_NODE.WRITING, END)
		.addEdge(ASSISTANT_NODE.EDITING, END)
		.addEdge(ASSISTANT_NODE.RESEARCH, END)
		.addEdge(ASSISTANT_NODE.IMAGE, END)
		.compile();
}
