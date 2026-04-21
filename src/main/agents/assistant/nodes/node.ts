import type { AgentContext } from '../../core/agent';
import type { AssistantAgentInput } from '../types';
import type { AssistantState } from '../state';

export interface NodeContext {
	readonly input: AssistantAgentInput;
	readonly agentCtx: AgentContext;
	readonly state: AssistantState;
}

export function extractJsonObject(text: string): Record<string, unknown> {
	const match = /\{[\s\S]*\}/.exec(text);
	if (!match) throw new Error('No JSON object found in model response');
	const parsed: unknown = JSON.parse(match[0]);
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Parsed JSON is not an object');
	}
	return parsed as Record<string, unknown>;
}
