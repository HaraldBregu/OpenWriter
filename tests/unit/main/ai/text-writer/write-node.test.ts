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

jest.mock('../../../../../src/main/ai/agents/text_writer/WRITE_SYSTEM.md?raw', () => 'Write', {
	virtual: true,
});

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { writeNode } from '../../../../../src/main/ai/agents/text_writer/write-node';

describe('writeNode', () => {
	it('prepends persisted chat history before the current prompt', async () => {
		const model = {
			stream: jest.fn().mockResolvedValue(
				(async function* () {
					yield { content: 'Draft' };
				})()
			),
		} as unknown as BaseChatModel & { stream: jest.Mock };

		await writeNode(
			{
				prompt: 'Continue this story',
				history: [
					{ role: 'user', content: 'Start a short story about a storm.' },
					{ role: 'assistant', content: 'A storm rolled over the harbor at dusk.' },
				],
				completion: '',
				apiKey: 'sk-test',
				modelName: 'gpt-4o',
				providerId: 'openai',
			},
			model
		);

		expect(model.stream).toHaveBeenCalledWith([
			expect.objectContaining({ role: 'system' }),
			{ role: 'human', content: 'Start a short story about a storm.' },
			{ role: 'ai', content: 'A storm rolled over the harbor at dusk.' },
			{ role: 'human', content: 'Continue this story' },
		]);
	});
});
