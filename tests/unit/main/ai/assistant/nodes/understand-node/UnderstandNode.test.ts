jest.mock(
	'../../../../../../../src/main/ai/agents/assistant/UNDERSTAND_SYSTEM.md?raw',
	() => 'Route',
	{
		virtual: true,
	}
);

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { understandNode } from '../../../../../../../src/main/ai/agents/assistant/nodes/understand-node';

describe('assistant understandNode', () => {
	it('falls back to image intent when the classifier returns descriptive text instead of a raw label', async () => {
		const model = {
			invoke: jest.fn().mockResolvedValue({
				content: 'The user wants help creating an image prompt for artwork.',
			}),
		} as unknown as BaseChatModel;

		const result = await understandNode(
			{
				prompt: 'Make me an image prompt for a fantasy castle.',
				history: [],
				intent: 'conversation',
				phaseLabel: 'Understanding request...',
				response: '',
			},
			model
		);

		expect(result.intent).toBe('image');
		expect(result.phaseLabel).toBe('Preparing image response...');
	});
});
