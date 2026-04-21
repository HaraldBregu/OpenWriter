import type { AgentContext } from '../../core/agent';
import type { AssistantAgentInput, AssistantToolCallRecord } from '../types';

export type Intent = 'image' | 'text' | 'both' | 'none';
export type Order = 'image_first' | 'text_first';
export type NodeName = 'intent' | 'planner' | 'image' | 'text';
export type NodeStatus = 'running' | 'done' | 'error' | 'skipped';

export interface NodeEvent {
	node: NodeName;
	status: NodeStatus;
	data?: unknown;
	error?: string;
}

export interface ImageNodeResult {
	relativePath: string;
	prompt: string;
}

export interface NodeState {
	intent?: Intent;
	order?: Order;
	imageResult?: ImageNodeResult;
	textResult?: string;
	toolCalls: AssistantToolCallRecord[];
	iterations: number;
}

export interface NodeContext {
	readonly input: AssistantAgentInput;
	readonly agentCtx: AgentContext;
	readonly emit: (event: NodeEvent) => void;
	readonly state: NodeState;
}

export interface AssistantNode {
	readonly name: NodeName;
	run(ctx: NodeContext): Promise<void>;
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
