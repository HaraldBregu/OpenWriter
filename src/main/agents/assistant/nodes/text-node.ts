import path from 'node:path';
import type OpenAI from 'openai';
import { createOpenAIClient } from '../../../shared/chat-model-factory';
import { isReasoningModel } from '../../../shared/ai-utils';
import {
	executeToolCalls,
	toOpenAITools,
	type AgentTool,
	type ParsedToolCall,
} from '../../tools';
import { createReadTool } from '../../tools/read';
import { createEditTool } from '../../tools/edit';
import { createWriteTool } from '../../tools/write';
import type { AssistantNode, NodeContext, NodeState } from './node';
import type { AssistantAgentInput } from '../types';

const DEFAULT_MAX_ITERATIONS = 10;
const CONTENT_FILE_NAME = 'content.md';

const SYSTEM_PROMPT = [
	'You are the OpenWriter assistant text node.',
	'You receive a user request about the current document and decide how to fulfil it by calling tools.',
	`The active document is stored in the file named "${CONTENT_FILE_NAME}" inside the document folder.`,
	'Use the "read" tool to inspect the document, and the "edit" or "write" tools to modify it.',
	'Prefer targeted "edit" replacements over full "write" rewrites when only part of the document changes.',
	'After finishing the user task, reply with a short confirmation message summarising what you did.',
].join(' ');

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export class TextNode implements AssistantNode {
	readonly name = 'text' as const;

	async run(ctx: NodeContext): Promise<void> {
		const { input, agentCtx, emit, state } = ctx;
		emit({ node: this.name, status: 'running' });

		const documentFolder = path.dirname(input.documentPath);
		const tools: AgentTool[] = [
			createReadTool(documentFolder),
			createEditTool(documentFolder),
			createWriteTool(documentFolder),
		];
		const openaiTools = toOpenAITools(tools);
		const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;

		const client = createOpenAIClient(input.providerId, input.apiKey);
		const effectiveTemp = isReasoningModel(input.modelName) ? undefined : input.temperature;

		const messages: ChatMessageParam[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: buildUserContent(input, state) },
		];

		for (let iteration = 1; iteration <= maxIterations; iteration++) {
			if (agentCtx.signal.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}

			const response = await client.chat.completions.create(
				{
					model: input.modelName,
					messages,
					tools: openaiTools,
					...(effectiveTemp !== undefined ? { temperature: effectiveTemp } : {}),
					...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
				},
				agentCtx.signal ? { signal: agentCtx.signal } : undefined
			);

			const assistant = response.choices[0]?.message;
			if (!assistant) {
				throw new Error('Empty response from model');
			}

			messages.push({
				role: 'assistant',
				content: assistant.content ?? null,
				...(assistant.tool_calls ? { tool_calls: assistant.tool_calls } : {}),
			} as ChatMessageParam);

			const toolCalls = assistant.tool_calls ?? [];
			if (toolCalls.length === 0) {
				state.iterations += iteration;
				state.textResult = assistant.content ?? '';
				emit({
					node: this.name,
					status: 'done',
					data: { content: state.textResult, iterations: iteration },
				});
				return;
			}

			const parsed: ParsedToolCall[] = toolCalls
				.filter(
					(tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
						tc.type === 'function'
				)
				.map((tc) => ({
					id: tc.id,
					name: tc.function.name,
					argumentsRaw: tc.function.arguments ?? '',
				}));

			const results = await executeToolCalls(parsed, tools, agentCtx.signal);

			for (const result of results) {
				state.toolCalls.push({
					name: result.name,
					argumentsRaw: result.argumentsRaw,
					output: result.output,
					error: result.error,
				});
				messages.push({
					role: 'tool',
					tool_call_id: result.callId,
					content: result.output,
				});
			}
		}

		throw new Error(`Tool loop exceeded max iterations (${maxIterations})`);
	}
}

function buildUserContent(input: AssistantAgentInput, state: NodeState): string {
	const sections: string[] = [
		`Document id: ${input.documentId}`,
		`Document file: ${CONTENT_FILE_NAME}`,
	];

	if (state.imageResult) {
		sections.push(
			`An image has already been generated and appended to ${CONTENT_FILE_NAME} as markdown at "${state.imageResult.relativePath}". Do not re-add the image; reference it in surrounding text if helpful.`
		);
	}

	const fileSummary = (input.files ?? [])
		.map((f, i) => `  ${i + 1}. ${f.name}${f.mimeType ? ` (${f.mimeType})` : ''}`)
		.join('\n');
	if (fileSummary) sections.push(`Attached files:\n${fileSummary}`);

	sections.push('', 'User request:', input.prompt);
	return sections.join('\n');
}
