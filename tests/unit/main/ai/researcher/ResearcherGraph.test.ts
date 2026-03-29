import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { buildResearcherGraph, RESEARCHER_NODE } from '../../../../../src/main/ai/agents/researcher/graph';
import { RESEARCHER_STATE_MESSAGES } from '../../../../../src/main/ai/agents/researcher/messages';
import { evaluateNode } from '../../../../../src/main/ai/agents/researcher/nodes/evaluate-node';

function makeInvokeModel(content: string) {
	return {
		invoke: jest.fn().mockResolvedValue({ content }),
	} as unknown as BaseChatModel & { invoke: jest.Mock };
}

function makeStreamModel(chunks: string[]) {
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

describe('evaluateNode', () => {
	it('falls back to a brief direct-response strategy for casual conversation', async () => {
		const model = makeInvokeModel('Reply casually and keep it short.');

		const result = await evaluateNode(
			{
				prompt: 'Hello how are you?',
				intent: 'A casual greeting.',
				strategy: '',
				requiresResearch: false,
				responseLength: 'medium',
				plan: [],
				research: '',
				stateMessage: '',
				response: '',
			},
			model
		);

		expect(result.requiresResearch).toBe(false);
		expect(result.responseLength).toBe('short');
		expect(result.stateMessage).toBe(RESEARCHER_STATE_MESSAGES.COMPOSE);
		expect(result.strategy).toMatch(/briefly|conversationally|short/i);
	});
});

describe('buildResearcherGraph', () => {
	it('skips plan and research nodes when explicit research is not needed', async () => {
		const understandModel = makeInvokeModel('The user is making casual conversation.');
		const evaluateModel = makeInvokeModel(
			JSON.stringify({
				needsResearch: false,
				responseLength: 'short',
				strategy: 'Respond briefly and conversationally.',
			})
		);
		const planModel = {
			invoke: jest.fn().mockResolvedValue({ content: '["unused"]' }),
		} as unknown as BaseChatModel & { invoke: jest.Mock };
		const researchModel = {
			invoke: jest.fn().mockResolvedValue({ content: 'unused' }),
		} as unknown as BaseChatModel & { invoke: jest.Mock };
		const composeModel = makeStreamModel(['I am doing well, thanks for asking.']);

		const graph = buildResearcherGraph({
			[RESEARCHER_NODE.UNDERSTAND]: understandModel,
			[RESEARCHER_NODE.EVALUATE]: evaluateModel,
			[RESEARCHER_NODE.PLAN]: planModel,
			[RESEARCHER_NODE.RESEARCH]: researchModel,
			[RESEARCHER_NODE.COMPOSE]: composeModel,
		});

		const result = await graph.invoke({ prompt: 'Hello how are you?' });

		expect(planModel.invoke).not.toHaveBeenCalled();
		expect(researchModel.invoke).not.toHaveBeenCalled();
		expect(result.requiresResearch).toBe(false);
		expect(result.responseLength).toBe('short');
		expect(result.response).toBe('I am doing well, thanks for asking.');
	});

	it('still executes the research branch for explicit research requests', async () => {
		const understandModel = makeInvokeModel('The user wants a researched comparison.');
		const evaluateModel = makeInvokeModel(
			JSON.stringify({
				needsResearch: true,
				responseLength: 'long',
				strategy: 'Provide a structured comparison backed by explicit research.',
			})
		);
		const planModel = {
			invoke: jest
				.fn()
				.mockResolvedValue({ content: '["Compare the core models", "Assess trade-offs"]' }),
		} as unknown as BaseChatModel & { invoke: jest.Mock };
		const researchModel = {
			invoke: jest.fn().mockResolvedValue({ content: 'Research synthesis goes here.' }),
		} as unknown as BaseChatModel & { invoke: jest.Mock };
		const composeModel = makeStreamModel(['Here is the comparison.']);

		const graph = buildResearcherGraph({
			[RESEARCHER_NODE.UNDERSTAND]: understandModel,
			[RESEARCHER_NODE.EVALUATE]: evaluateModel,
			[RESEARCHER_NODE.PLAN]: planModel,
			[RESEARCHER_NODE.RESEARCH]: researchModel,
			[RESEARCHER_NODE.COMPOSE]: composeModel,
		});

		const result = await graph.invoke({ prompt: 'Research and compare GPT-4o and Claude.' });

		expect(planModel.invoke).toHaveBeenCalledTimes(1);
		expect(researchModel.invoke).toHaveBeenCalledTimes(1);
		expect(result.requiresResearch).toBe(true);
		expect(result.responseLength).toBe('long');
		expect(result.plan).toEqual(['Compare the core models', 'Assess trade-offs']);
		expect(result.research).toBe('Research synthesis goes here.');
		expect(result.response).toBe('Here is the comparison.');
	});
});
