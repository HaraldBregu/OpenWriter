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
import type { NodeContext } from './node';
import type { AssistantAgentInput } from '../types';
import type { AssistantSnapshot } from '../state';

const DEFAULT_INNER_ITERATIONS = 10;
const CONTENT_FILE_NAME = 'content.md';

const SYSTEM_PROMPT = [
	'You are the text worker for the OpenWriter assistant.',
	'You receive a focused instruction from the controller and apply it to the active document by calling tools.',
	`The active document is stored in the file "${CONTENT_FILE_NAME}" inside the document folder.`,
	'Use the "read" tool to inspect the current document, and "edit" or "write" tools to modify it.',
	'Prefer targeted "edit" replacements over full "write" rewrites when only part of the document changes.',
	'Append new content to the end of the document unless the instruction specifies otherwise.',
	'When finished with this instruction, reply with a short summary of what you wrote or changed (one or two sentences). The controller will decide the next step.',
].join(' ');

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export class TextNode {
	readonly name = 'text' as const;

	async run(ctx: NodeContext, instruction: string): Promise<void> {
		const { input, agentCtx, state } = ctx;
		const step = state.beginStep(this.name, instruction);

		try {
			const documentFolder = path.dirname(input.documentPath);
			const tools: AgentTool[] = [
				createReadTool(documentFolder),
				createEditTool(documentFolder),
				createWriteTool(documentFolder),
			];
			const openaiTools = toOpenAITools(tools);
			const maxIterations = input.maxIterations ?? DEFAULT_INNER_ITERATIONS;

			const client = createOpenAIClient(input.providerId, input.apiKey);
			const effectiveTemp = isReasoningModel(input.modelName) ? undefined : input.temperature;

			const messages: ChatMessageParam[] = [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: buildUserContent(input, instruction, state.snapshot()) },
			];

			let iteration = 0;
			let finalText = '';
			let completed = false;

			while (iteration < maxIterations) {
				if (agentCtx.signal.aborted) {
					throw new DOMException('Aborted', 'AbortError');
				}
				iteration += 1;

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
					finalText = assistant.content ?? '';
					completed = true;
					break;
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
					state.addToolCall({
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

			if (!completed) {
				throw new Error(`Text node exceeded inner iteration limit (${maxIterations})`);
			}

			state.bumpIterations(iteration);
			if (finalText.trim()) {
				state.appendText(finalText);
			}
			state.completeStep(step, { iterations: iteration, summary: finalText });
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			state.failStep(step, msg);
			throw error;
		}
	}
}

function buildUserContent(
	input: AssistantAgentInput,
	instruction: string,
	snapshot: AssistantSnapshot
): string {
	const sections: string[] = [
		`Document id: ${input.documentId}`,
		`Document file: ${CONTENT_FILE_NAME}`,
		`Original user request: ${input.prompt}`,
	];

	if (snapshot.images.length > 0) {
		const refs = snapshot.images
			.map((img, i) => `  ${i + 1}. ${img.relativePath} — ${img.prompt}`)
			.join('\n');
		sections.push(
			`Images already generated and appended to ${CONTENT_FILE_NAME}:\n${refs}\nDo not re-add these images. You may reference them in surrounding text.`
		);
	}

	if (snapshot.textSegments.length > 0) {
		sections.push(`Text segments written so far: ${snapshot.textSegments.length}.`);
	}

	const fileSummary = (input.files ?? [])
		.map((f, i) => `  ${i + 1}. ${f.name}${f.mimeType ? ` (${f.mimeType})` : ''}`)
		.join('\n');
	if (fileSummary) sections.push(`Attached files:\n${fileSummary}`);

	sections.push('', 'Controller instruction for this step:', instruction);
	return sections.join('\n');
}
