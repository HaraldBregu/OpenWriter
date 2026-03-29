import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockDispatch = jest.fn();
const mockInitTaskMetadata = jest.fn();
const mockSubscribeToTask = jest.fn();
const mockSubmit = jest.fn();
let taskListener: ((snapshot: {
	status: string;
	streamedContent: string;
	content: string;
	seedContent: string;
	metadata?: Record<string, unknown>;
	result?: unknown;
	error?: string;
}) => void) | null = null;

const mockChatState = {
	messages: [],
	sessionId: null,
	activeTaskId: null,
	activeMessageId: null,
};

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (_key: string, fallback?: string) => fallback ?? '',
	}),
}));

jest.mock('uuid', () => ({
	v7: () => 'session-123',
}));

jest.mock('../../../../../src/renderer/src/services/task-event-bus', () => ({
	initTaskMetadata: (...args: unknown[]) => mockInitTaskMetadata(...args),
	subscribeToTask: (...args: unknown[]) => mockSubscribeToTask(...args),
}));

jest.mock('../../../../../src/renderer/src/pages/document/hooks', () => ({
	useDocumentState: () => ({
		documentId: 'doc-1',
		chat: mockChatState,
	}),
	useDocumentDispatch: () => mockDispatch,
}));

jest.mock('../../../../../src/renderer/src/pages/document/panels/chat/hooks', () => ({
	useChatDispatch: () => mockDispatch,
	useChatState: () => mockChatState,
}));

jest.mock('../../../../../src/renderer/src/pages/document/panels/chat/components', () => ({
	ChatHeader: () => <div>header</div>,
	ChatMessage: ({
		id,
		showStatusLoader,
	}: {
		id: string;
		showStatusLoader?: boolean;
	}) => (
		<div data-testid={`message-${id}`} data-loader={showStatusLoader ? 'true' : 'false'}>
			message
		</div>
	),
	ChatInput: ({
		onSend,
		disabled,
	}: {
		onSend: (message: string) => void;
		disabled?: boolean;
	}) => (
		<button type="button" onClick={() => onSend('Analyze the code')} disabled={disabled}>
			send
		</button>
	),
}));

import Chat from '../../../../../src/renderer/src/pages/document/panels/chat';

describe('Chat', () => {
	beforeEach(() => {
		mockDispatch.mockReset();
		mockInitTaskMetadata.mockReset();
		mockSubscribeToTask.mockReset();
		mockSubmit.mockReset();
		taskListener = null;
		mockChatState.messages = [];
		mockChatState.sessionId = null;
		mockChatState.activeTaskId = null;
		mockChatState.activeMessageId = null;
		mockSubscribeToTask.mockImplementation((_taskId: string, cb: typeof taskListener) => {
			taskListener = cb;
			return jest.fn();
		});
		(window as typeof window & { task?: unknown }).task = {
			submit: mockSubmit,
		} as Window['task'];
	});

	it('submits the chat task from the panel and persists the active task binding', async () => {
		mockSubmit.mockResolvedValue({
			success: true,
			data: { taskId: 'task-123' },
		});

		render(<Chat />);

		fireEvent.click(screen.getByRole('button', { name: 'send' }));

		await waitFor(() => {
			expect(mockSubmit).toHaveBeenCalledWith(
				'agent-researcher',
				{ prompt: 'Analyze the code' },
				{ documentId: 'doc-1', agentId: 'researcher' }
			);
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_SESSION_STARTED',
			sessionId: 'session-123',
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_ACTIVE_MESSAGE_SET',
			messageId: expect.any(String),
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_ACTIVE_TASK_SET',
			taskId: 'task-123',
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_MESSAGE_UPDATED',
			id: expect.any(String),
			patch: {
				taskId: 'task-123',
				status: 'queued',
			},
		});
		expect(mockInitTaskMetadata).toHaveBeenCalledWith('task-123', {
			documentId: 'doc-1',
			agentId: 'researcher',
		});
	});

	it('listens for active chat task updates in the panel and updates the timeline', () => {
		mockChatState.messages = [
			{
				id: 'assistant-1',
				content: '',
				role: 'assistant',
				timestamp: '2026-03-29T12:00:00.000Z',
				taskId: 'task-123',
				status: 'queued',
			},
		];
		mockChatState.activeTaskId = 'task-123';
		mockChatState.activeMessageId = 'assistant-1';

		render(<Chat />);

		expect(mockSubscribeToTask).toHaveBeenCalledWith('task-123', expect.any(Function));
		expect(taskListener).not.toBeNull();

		taskListener?.({
			status: 'running',
			streamedContent: '',
			content: 'Working draft',
			seedContent: '',
			metadata: {
				documentId: 'doc-1',
				statusText: 'Researching sources',
			},
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_MESSAGE_INSERTED_BEFORE',
			beforeId: 'assistant-1',
			message: {
				id: expect.any(String),
				content: 'Researching sources',
				role: 'system',
				timestamp: expect.any(String),
				taskId: 'task-123',
				status: 'running',
			},
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_MESSAGE_UPDATED',
			id: 'assistant-1',
			patch: {
				taskId: 'task-123',
				status: 'running',
				content: 'Working draft',
			},
		});

		taskListener?.({
			status: 'completed',
			streamedContent: '',
			content: '',
			seedContent: '',
			metadata: {
				documentId: 'doc-1',
				statusText: 'Completed',
			},
			result: {
				content: 'Final answer',
			},
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_MESSAGE_UPDATED',
			id: 'assistant-1',
			patch: {
				content: 'Final answer',
				taskId: 'task-123',
				status: 'completed',
			},
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_ACTIVE_TASK_SET',
			taskId: null,
		});
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'CHAT_ACTIVE_MESSAGE_SET',
			messageId: null,
		});
	});

	it('shows the loader only on the latest non-completed system status message', () => {
		mockChatState.messages = [
			{
				id: 'system-1',
				content: 'Queued',
				role: 'system',
				timestamp: '2026-03-29T12:00:00.000Z',
				taskId: 'task-123',
				status: 'queued',
			},
			{
				id: 'system-2',
				content: 'Researching',
				role: 'system',
				timestamp: '2026-03-29T12:00:01.000Z',
				taskId: 'task-123',
				status: 'running',
			},
			{
				id: 'assistant-1',
				content: 'Draft',
				role: 'assistant',
				timestamp: '2026-03-29T12:00:02.000Z',
				taskId: 'task-123',
				status: 'running',
			},
		];

		render(<Chat />);

		expect(screen.getByTestId('message-system-1')).toHaveAttribute('data-loader', 'false');
		expect(screen.getByTestId('message-system-2')).toHaveAttribute('data-loader', 'true');
		expect(screen.getByTestId('message-assistant-1')).toHaveAttribute('data-loader', 'false');
	});

	it('does not show a loader when the latest system status is completed', () => {
		mockChatState.messages = [
			{
				id: 'system-1',
				content: 'Queued',
				role: 'system',
				timestamp: '2026-03-29T12:00:00.000Z',
				taskId: 'task-123',
				status: 'queued',
			},
			{
				id: 'system-2',
				content: 'Completed',
				role: 'system',
				timestamp: '2026-03-29T12:00:01.000Z',
				taskId: 'task-123',
				status: 'completed',
			},
		];

		render(<Chat />);

		expect(screen.getByTestId('message-system-1')).toHaveAttribute('data-loader', 'false');
		expect(screen.getByTestId('message-system-2')).toHaveAttribute('data-loader', 'false');
	});
});
