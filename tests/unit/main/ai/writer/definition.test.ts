jest.mock('../../../../../src/main/ai/agents/text_writer/WRITE_SYSTEM.md?raw', () => 'Write', {
	virtual: true,
});

import { WriterAgent } from '../../../../../src/main/ai/agents/writer/definition';

describe('WriterAgent', () => {
	it('exposes the writer identity and text completion output contract', () => {
		expect(WriterAgent.id).toBe('writer');
		expect(WriterAgent.name).toBe('Writer');
		expect(WriterAgent.category).toBe('writing');

		const initialState = WriterAgent.buildGraphInput?.({
			prompt: 'Write an introduction about electric trains.',
			apiKey: 'sk-test',
			modelName: 'gpt-4o',
			providerId: 'openai',
			temperature: 0.7,
			history: [{ role: 'user', content: 'Keep it concise.' }],
			metadata: { source: 'unit-test' },
		});

		expect(initialState).toEqual({
			prompt: 'Write an introduction about electric trains.',
			history: [{ role: 'user', content: 'Keep it concise.' }],
			completion: '',
			apiKey: 'sk-test',
			modelName: 'gpt-4o',
			providerId: 'openai',
		});

		expect(WriterAgent.extractGraphOutput?.({ completion: 'Draft ready.' })).toBe('Draft ready.');
		expect(WriterAgent.extractGraphOutput?.({})).toBe('');
	});
});
