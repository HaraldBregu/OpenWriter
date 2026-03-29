import {
	chatReducer,
	type ChatSession,
	type ChatAction,
} from '../../../../../src/renderer/src/pages/document/panels/chat/context';

describe('chatReducer', () => {
	it('inserts system status messages before the assistant reply placeholder', () => {
		const initialState: ChatSession = {
			sessionId: 'session-1',
			activeTaskId: 'task-1',
			activeMessageId: 'assistant-1',
			messages: [
				{
					id: 'user-1',
					content: 'Analyze this file',
					role: 'user',
					timestamp: '2026-03-29T12:00:00.000Z',
					taskId: null,
					status: 'completed',
				},
				{
					id: 'assistant-1',
					content: '',
					role: 'assistant',
					timestamp: '2026-03-29T12:00:01.000Z',
					taskId: 'task-1',
					status: 'idle',
				},
			],
		};

		const action: ChatAction = {
			type: 'CHAT_MESSAGE_INSERTED_BEFORE',
			beforeId: 'assistant-1',
			message: {
				id: 'system-1',
				content: 'Completed',
				role: 'system',
				timestamp: '2026-03-29T12:00:02.000Z',
				taskId: 'task-1',
				status: 'completed',
			},
		};

		const nextState = chatReducer(initialState, action);

		expect(nextState.messages.map((message) => message.id)).toEqual([
			'user-1',
			'system-1',
			'assistant-1',
		]);
	});
});
