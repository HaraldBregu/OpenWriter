import path from 'node:path';
import type OpenAI from 'openai';
import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { classifyError, isReasoningModel, toUserMessage } from '../../shared/ai-utils';
import { executeToolCalls, toOpenAITools, type AgentTool, type ParsedToolCall } from '../tools';
import { createReadTool } from '../tools/read';
import { createEditTool } from '../tools/edit';
import { createWriteTool } from '../tools/write';
import { createGenerateImageTool } from '../tools/generate-image';
import type { AssistantAgentInput, AssistantAgentOutput, AssistantToolCallRecord } from './types';

const DEFAULT_MAX_ITERATIONS = 10;
const CONTENT_FILE_NAME = 'content.md';

const SYSTEM_PROMPT = [
	'You are the OpenWriter assistant agent.',
	'You receive a user request about the current document and decide how to fulfil it by calling tools.',
	`The active document is stored in the file named "${CONTENT_FILE_NAME}" inside the document folder.`,
	'Use the "read" tool to inspect the document, and the "edit" or "write" tools to modify it.',
	'Prefer targeted "edit" replacements over full "write" rewrites when only part of the document changes.',
	'When the user explicitly asks you to generate or create an image, call the "generate_image" tool with a vivid prompt.',
	'The tool saves the image under "images/<filename>.png" inside the document folder and returns the relative path.',
	'After generating an image you MUST insert a markdown image reference "![alt](images/<filename>.png)" into content.md using the "edit" tool (or "write" if the file is empty) so the user sees it embedded in the document.',
	'Never call "generate_image" unless the user explicitly requests an image.',
	'After finishing the user task, reply with a short confirmation message summarising what you did.',
].join(' ');

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export class AssistantAgent extends BaseAgent<AssistantAgentInput, AssistantAgentOutput> {
	readonly type = 'assistant';

	validate(input: AssistantAgentInput): void {
		if (!input.prompt?.trim()) {
			throw new AgentValidationError(this.type, 'prompt required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
		if (!input.providerId?.trim()) {
			throw new AgentValidationError(this.type, 'providerId required');
		}
		if (!input.documentPath?.trim()) {
			throw new AgentValidationError(this.type, 'documentPath required');
		}
		if (input.maxIterations !== undefined && input.maxIterations <= 0) {
			throw new AgentValidationError(this.type, 'maxIterations must be positive');
		}
	}

	protected async run(
		input: AssistantAgentInput,
		ctx: AgentContext
	): Promise<AssistantAgentOutput> {
		try {
			return await this.runToolLoop(input, ctx);
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') throw error;
			const raw = error instanceof Error ? error.message : String(error);
			throw new Error(toUserMessage(kind, raw));
		}
	}

	private buildTools(documentFolder: string, input: AssistantAgentInput): AgentTool[] {
		const tools: AgentTool[] = [
			createReadTool(documentFolder),
			createEditTool(documentFolder),
			createWriteTool(documentFolder),
		];
		if (input.imageModelName && input.imageApiKey && input.imageProviderId) {
			tools.push(
				createGenerateImageTool({
					cwd: documentFolder,
					providerId: input.imageProviderId,
					apiKey: input.imageApiKey,
					modelName: input.imageModelName,
					contentFilePath: input.documentPath,
				})
			);
		}
		return tools;
	}

	private buildUserContent(input: AssistantAgentInput): string {
		const fileSummary = (input.files ?? [])
			.map((f, i) => `  ${i + 1}. ${f.name}${f.mimeType ? ` (${f.mimeType})` : ''}`)
			.join('\n');
		const sections: string[] = [
			`Document id: ${input.documentId}`,
			`Document file: ${CONTENT_FILE_NAME}`,
		];
		if (fileSummary) sections.push(`Attached files:\n${fileSummary}`);
		sections.push('', 'User request:', input.prompt);
		return sections.join('\n');
	}

	private async runToolLoop(
		input: AssistantAgentInput,
		ctx: AgentContext
	): Promise<AssistantAgentOutput> {
		const documentFolder = path.dirname(input.documentPath);
		const tools = this.buildTools(documentFolder, input);
		const openaiTools = toOpenAITools(tools);
		const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;

		const client = createOpenAIClient(input.providerId, input.apiKey);
		const effectiveTemp = isReasoningModel(input.modelName) ? undefined : input.temperature;

		const messages: ChatMessageParam[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: this.buildUserContent(input) },
		];

		const collected: AssistantToolCallRecord[] = [];

		for (let iteration = 1; iteration <= maxIterations; iteration++) {
			this.ensureNotAborted(ctx.signal);
			ctx.progress?.(Math.min(90, (iteration / maxIterations) * 90), `iteration ${iteration}`);

			const response = await client.chat.completions.create(
				{
					model: input.modelName,
					messages,
					tools: openaiTools,
					...(effectiveTemp !== undefined ? { temperature: effectiveTemp } : {}),
					...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
				},
				ctx.signal ? { signal: ctx.signal } : undefined
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
				ctx.progress?.(100, 'done');
				const finalText = assistant.content ?? '';
				ctx.stream?.(finalText);
				return {
					content: finalText,
					toolCalls: collected,
					iterations: iteration,
				};
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

			const results = await executeToolCalls(parsed, tools, ctx.signal);

			for (const result of results) {
				collected.push({
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
