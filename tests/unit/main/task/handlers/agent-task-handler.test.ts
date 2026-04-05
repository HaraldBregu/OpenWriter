import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockExecuteAIAgentsStream = jest.fn();

jest.mock('../../../../../src/main/agents', () => ({
	executeAIAgentsStream: (...args: unknown[]) => mockExecuteAIAgentsStream(...args),
}));

import { AgentTaskHandler } from '../../../../../src/main/task/handlers/agent-task-handler';
import type { ProgressReporter, StreamReporter } from '../../../../../src/main/task/task-handler';

function makeReporter(): jest.Mocked<ProgressReporter> {
	return { progress: jest.fn() };
}

function makeStreamReporter(): jest.Mocked<StreamReporter> {
	return { stream: jest.fn() };
}

describe('AgentTaskHandler', () => {
	let tempDir: string;

	beforeEach(() => {
		jest.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-task-handler-'));
		mockExecuteAIAgentsStream.mockImplementation(async function* () {
			yield { type: 'token', token: 'A', runId: 'run-1' };
			yield { type: 'done', content: 'Answer', tokenCount: 1, runId: 'run-1' };
		});
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it('loads persisted chat history and forwards only completed user and assistant turns', async () => {
		const sessionDir = path.join(tempDir, 'chats', 'session-123');
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(
			path.join(sessionDir, 'messages.json'),
			JSON.stringify(
				{
					version: 2,
					sessionId: 'session-123',
					createdAt: '2026-03-30T10:00:00.000Z',
					messages: [
						{
							id: 'm-1',
							role: 'user',
							content: 'Earlier question',
							timestamp: '2026-03-30T10:00:00.000Z',
							taskId: null,
							status: 'completed',
						},
						{
							id: 'm-2',
							role: 'assistant',
							content: 'Earlier answer',
							timestamp: '2026-03-30T10:00:10.000Z',
							taskId: 'task-1',
							status: 'completed',
						},
						{
							id: 'm-3',
							role: 'system',
							content: 'Researching',
							timestamp: '2026-03-30T10:00:11.000Z',
							taskId: 'task-1',
							status: 'running',
						},
						{
							id: 'm-4',
							role: 'assistant',
							content: 'The previous task failed.',
							timestamp: '2026-03-30T10:00:12.000Z',
							taskId: 'task-1',
							status: 'error',
						},
						{
							id: 'm-5',
							role: 'user',
							content: 'New prompt',
							timestamp: '2026-03-30T10:00:20.000Z',
							taskId: null,
							status: 'completed',
						},
						{
							id: 'm-6',
							role: 'assistant',
							content: '',
							timestamp: '2026-03-30T10:00:20.000Z',
							taskId: 'task-2',
							status: 'idle',
						},
					],
				},
				null,
				2
			)
		);

		const providerResolver = {
			resolve: jest.fn().mockReturnValue({
				providerId: 'openai',
				apiKey: 'sk-test',
				modelName: 'gpt-4o',
			}),
		};
		const workspaceManager = {
			getDocumentFolderPath: jest.fn().mockReturnValue(tempDir),
		};
		const windowContextManager = {
			tryGet: jest.fn().mockReturnValue({
				container: {
					get: jest.fn().mockReturnValue(workspaceManager),
				},
			}),
		};
		const agentsRegistry = {
			has: jest.fn().mockReturnValue(true),
			get: jest.fn().mockReturnValue({
				id: 'researcher',
				name: 'Researcher',
				category: 'analysis',
			}),
		};
		const handler = new AgentTaskHandler(
			'researcher',
			agentsRegistry as never,
			providerResolver as never,
			windowContextManager as never
		);

		const result = await handler.execute(
			{
				prompt: 'New prompt',
				windowId: 17,
			},
			new AbortController().signal,
			makeReporter(),
			makeStreamReporter(),
			{
				documentId: 'doc-1',
				chatId: 'session-123',
			}
		);

		expect(result).toEqual({
			content: 'Answer',
			tokenCount: 1,
			agentId: 'researcher',
		});
		expect(mockExecuteAIAgentsStream).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt: 'New prompt',
				history: [
					{ role: 'user', content: 'Earlier question' },
					{ role: 'assistant', content: 'Earlier answer' },
				],
				metadata: {
					documentId: 'doc-1',
					chatId: 'session-123',
				},
			})
		);
	});

	it('falls back to an empty history when the chat transcript does not exist', async () => {
		const providerResolver = {
			resolve: jest.fn().mockReturnValue({
				providerId: 'openai',
				apiKey: 'sk-test',
				modelName: 'gpt-4o',
			}),
		};
		const windowContextManager = {
			tryGet: jest.fn().mockReturnValue({
				container: {
					get: jest.fn().mockReturnValue({
						getDocumentFolderPath: jest.fn().mockReturnValue(tempDir),
					}),
				},
			}),
		};
		const agentsRegistry = {
			has: jest.fn().mockReturnValue(true),
			get: jest.fn().mockReturnValue({
				id: 'researcher',
				name: 'Researcher',
				category: 'analysis',
			}),
		};
		const handler = new AgentTaskHandler(
			'researcher',
			agentsRegistry as never,
			providerResolver as never,
			windowContextManager as never
		);

		await handler.execute(
			{
				prompt: 'Prompt without history',
				windowId: 17,
			},
			new AbortController().signal,
			makeReporter(),
			makeStreamReporter(),
			{
				documentId: 'doc-1',
				chatId: 'missing-session',
			}
		);

		expect(mockExecuteAIAgentsStream).toHaveBeenCalledWith(
			expect.objectContaining({
				history: [],
			})
		);
	});
});
