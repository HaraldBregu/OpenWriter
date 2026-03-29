const mockHumanMessage = jest.fn().mockImplementation(function (this: unknown, content: string) {
	return { role: 'human', content };
});
const mockAIMessage = jest.fn().mockImplementation(function (this: unknown, content: string) {
	return { role: 'ai', content };
});
const mockSystemMessage = jest.fn().mockImplementation(function (this: unknown, content: string) {
	return { role: 'system', content };
});

jest.mock('@langchain/core/messages', () => ({
	HumanMessage: mockHumanMessage,
	AIMessage: mockAIMessage,
	SystemMessage: mockSystemMessage,
}));

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { understandNode } from '../../../../../src/main/ai/agents/researcher/nodes/understand-node';

describe('understandNode', () => {
	it('includes persisted chat history when classifying the next prompt', async () => {
		const model = {
			invoke: jest.fn().mockResolvedValue({ content: 'The user is following up on the prior answer.' }),
		} as unknown as BaseChatModel & { invoke: jest.Mock };

		await understandNode(
			{
				prompt: 'Can you expand on the second point?',
				history: [
					{ role: 'user', content: 'Compare the main trade-offs.' },
					{ role: 'assistant', content: 'Here are the top trade-offs to consider.' },
				],
				intent: '',
				strategy: '',
				requiresResearch: false,
				responseLength: 'medium',
				plan: [],
				research: '',
				phaseLabel: '',
				response: '',
			},
			model
		);

		expect(model.invoke).toHaveBeenCalledWith([
			expect.objectContaining({ role: 'system' }),
			{ role: 'human', content: 'Compare the main trade-offs.' },
			{ role: 'ai', content: 'Here are the top trade-offs to consider.' },
			{ role: 'human', content: 'Can you expand on the second point?' },
		]);
	});
});
