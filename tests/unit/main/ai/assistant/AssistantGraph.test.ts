jest.mock('../../../../../src/main/ai/agents/assistant/UNDERSTAND_SYSTEM.md?raw', () => 'Route', {
	virtual: true,
});
jest.mock(
	'../../../../../src/main/ai/agents/assistant/CONVERSATION_SYSTEM.md?raw',
	() => 'Conversation',
	{ virtual: true }
);
jest.mock('../../../../../src/main/ai/agents/assistant/WRITING_SYSTEM.md?raw', () => 'Writing', {
	virtual: true,
});
jest.mock('../../../../../src/main/ai/agents/assistant/EDITING_SYSTEM.md?raw', () => 'Editing', {
	virtual: true,
});
jest.mock('../../../../../src/main/ai/agents/assistant/RESEARCH_SYSTEM.md?raw', () => 'Research', {
	virtual: true,
});
jest.mock('../../../../../src/main/ai/agents/assistant/IMAGE_SYSTEM.md?raw', () => 'Image', {
	virtual: true,
});

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { buildGraph, ASSISTANT_NODE } from '../../../../../src/main/ai/agents/assistant/graph';
import type { RagRetriever } from '../../../../../src/main/ai/agents/assistant/nodes/rag-retriever';

function makeInvokeModel(content: string) {
	return {
		invoke: jest.fn().mockResolvedValue({ content }),
	} as unknown as BaseChatModel & { invoke: jest.Mock };
}

function makeStreamModel(...chunks: string[]) {
	return {
		stream: jest.fn().mockResolvedValue(
			(async function* () {
				for (const chunk of chunks) {
					yield { content: chunk };
				}
			})()
		),
	} as unknown as BaseChatModel & { stream: jest.Mock };
}

function makeRetriever(pageContents: string[]): RagRetriever {
	return {
		retrieve: jest.fn().mockResolvedValue(
			pageContents.map((pageContent, index) => ({
				pageContent,
				metadata: { source: `doc-${index}.md` },
				score: 1 - index * 0.1,
			}))
		),
	} as unknown as RagRetriever;
}

describe('buildAssistantGraph', () => {
	it('routes writing requests to the writing specialist node', async () => {
		const understandModel = makeInvokeModel('writing');
		const conversationModel = makeStreamModel('unused');
		const writingModel = makeStreamModel('Draft', ' ready');
		const editingModel = makeStreamModel('unused');
		const researchModel = makeStreamModel('unused');
		const imageModel = makeStreamModel('unused');

		const graph = buildGraph({
			[ASSISTANT_NODE.UNDERSTAND]: understandModel,
			[ASSISTANT_NODE.CONVERSATION]: conversationModel,
			[ASSISTANT_NODE.WRITING]: writingModel,
			[ASSISTANT_NODE.EDITING]: editingModel,
			[ASSISTANT_NODE.RESEARCH]: researchModel,
			[ASSISTANT_NODE.IMAGE]: imageModel,
		});

		const result = await graph.invoke({
			prompt: 'Write a product intro for a new notebook.',
			history: [],
			intent: 'conversation',
			phaseLabel: 'Understanding request...',
			response: '',
		});

		expect(result.intent).toBe('writing');
		expect(result.response).toBe('Draft ready');
		expect(writingModel.stream).toHaveBeenCalledTimes(1);
		expect(conversationModel.stream).not.toHaveBeenCalled();
		expect(imageModel.stream).not.toHaveBeenCalled();
	});

	it('routes image requests to the image specialist node', async () => {
		const understandModel = makeInvokeModel('image');
		const conversationModel = makeStreamModel('unused');
		const writingModel = makeStreamModel('unused');
		const editingModel = makeStreamModel('unused');
		const researchModel = makeStreamModel('unused');
		const imageModel = makeStreamModel('Painter prompt');

		const graph = buildGraph({
			[ASSISTANT_NODE.UNDERSTAND]: understandModel,
			[ASSISTANT_NODE.CONVERSATION]: conversationModel,
			[ASSISTANT_NODE.WRITING]: writingModel,
			[ASSISTANT_NODE.EDITING]: editingModel,
			[ASSISTANT_NODE.RESEARCH]: researchModel,
			[ASSISTANT_NODE.IMAGE]: imageModel,
		});

		const result = await graph.invoke({
			prompt: 'Create a cinematic poster concept of a lone astronaut on Mars.',
			history: [],
			intent: 'conversation',
			phaseLabel: 'Understanding request...',
			response: '',
		});

		expect(result.intent).toBe('image');
		expect(result.response).toBe('Painter prompt');
		expect(imageModel.stream).toHaveBeenCalledTimes(1);
		expect(writingModel.stream).not.toHaveBeenCalled();
		expect(researchModel.stream).not.toHaveBeenCalled();
	});

	it('passes retrieved workspace context to the specialist prompt', async () => {
		const understandModel = makeInvokeModel('writing');
		const conversationModel = makeStreamModel('unused');
		const writingModel = makeStreamModel('Draft', ' ready');
		const editingModel = makeStreamModel('unused');
		const researchModel = makeStreamModel('unused');
		const imageModel = makeStreamModel('unused');
		const retriever = makeRetriever([
			'Notebook specs: recycled paper, lay-flat binding.',
			'Target audience: students and researchers.',
		]);

		const graph = buildGraph(
			{
				[ASSISTANT_NODE.UNDERSTAND]: understandModel,
				[ASSISTANT_NODE.CONVERSATION]: conversationModel,
				[ASSISTANT_NODE.WRITING]: writingModel,
				[ASSISTANT_NODE.EDITING]: editingModel,
				[ASSISTANT_NODE.RESEARCH]: researchModel,
				[ASSISTANT_NODE.IMAGE]: imageModel,
			},
			retriever
		);

		const result = await graph.invoke({
			prompt: 'Write a launch blurb for the notebook.',
			history: [],
			intent: 'conversation',
			phaseLabel: 'Understanding request...',
			response: '',
			ragContext: '',
		});

		const messages = writingModel.stream.mock.calls[0][0] as Array<{ content: string }>;
		const userMessage = messages[messages.length - 1];

		expect(result.ragContext).toContain('Notebook specs: recycled paper, lay-flat binding.');
		expect(userMessage.content).toContain('Retrieved workspace context:');
		expect(userMessage.content).toContain('Notebook specs: recycled paper, lay-flat binding.');
		expect(userMessage.content).toContain('Target audience: students and researchers.');
		expect(retriever.retrieve as jest.Mock).toHaveBeenCalledWith(
			'Write a launch blurb for the notebook.'
		);
	});
});
