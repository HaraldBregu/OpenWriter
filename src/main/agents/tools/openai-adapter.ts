/**
 * Adapters between AgentTool and the OpenAI Chat Completions tool API.
 */

import type OpenAI from 'openai';
import type { AgentTool } from './types.js';

export type OpenAIChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

export function toOpenAITools(tools: AgentTool[]): OpenAIChatTool[] {
	return tools.map((tool) => ({
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	}));
}

export interface ParsedToolCall {
	id: string;
	name: string;
	argumentsRaw: string;
}

export interface ToolExecutionResult {
	callId: string;
	name: string;
	argumentsRaw: string;
	output: string;
	error?: string;
}

async function runSingle(
	call: ParsedToolCall,
	registry: Map<string, AgentTool>,
	signal?: AbortSignal
): Promise<ToolExecutionResult> {
	const base: Omit<ToolExecutionResult, 'output'> = {
		callId: call.id,
		name: call.name,
		argumentsRaw: call.argumentsRaw,
	};
	const tool = registry.get(call.name);
	if (!tool) {
		return { ...base, output: `Error: unknown tool '${call.name}'`, error: 'unknown_tool' };
	}
	let parsed: unknown;
	try {
		parsed = call.argumentsRaw ? JSON.parse(call.argumentsRaw) : {};
	} catch (err) {
		return {
			...base,
			output: `Error parsing tool arguments: ${(err as Error).message}`,
			error: 'parse_error',
		};
	}
	try {
		const prepared = tool.prepareArguments ? tool.prepareArguments(parsed) : parsed;
		const result = await tool.execute(call.id, prepared as never, signal);
		const text = result.content.map((c) => c.text).join('\n');
		return { ...base, output: text || '(no output)' };
	} catch (err) {
		return { ...base, output: `Error: ${(err as Error).message}`, error: 'execution_error' };
	}
}

/**
 * Execute one batch of tool calls emitted by a single assistant turn.
 * Calls flagged sequential (or if any in the batch is sequential) run serially;
 * otherwise they run in parallel.
 */
export async function executeToolCalls(
	calls: ParsedToolCall[],
	tools: AgentTool[],
	signal?: AbortSignal
): Promise<ToolExecutionResult[]> {
	const registry = new Map<string, AgentTool>(tools.map((t) => [t.name, t]));
	const needsSequential = calls.some((c) => registry.get(c.name)?.executionMode === 'sequential');
	if (needsSequential) {
		const out: ToolExecutionResult[] = [];
		for (const call of calls) {
			if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
			out.push(await runSingle(call, registry, signal));
		}
		return out;
	}
	return Promise.all(calls.map((call) => runSingle(call, registry, signal)));
}
