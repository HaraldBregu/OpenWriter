/**
 * AgentTool — self-contained tool contract used by TextAgent's
 * tool-calling loop. Parameter schemas are plain JSON Schema, shaped
 * to match the OpenAI Chat Completions `tools[].function.parameters`
 * field verbatim (no conversion step needed).
 */

export type JSONSchema = Record<string, unknown>;

export interface ToolTextContent {
	type: 'text';
	text: string;
}

export type ToolContent = ToolTextContent;

export interface ToolResult<Details = unknown> {
	content: ToolContent[];
	details?: Details;
}

export interface AgentTool<Input = unknown, Details = unknown> {
	name: string;
	label?: string;
	description: string;
	parameters: JSONSchema;
	executionMode?: 'parallel' | 'sequential';
	prepareArguments?: (input: unknown) => Input;
	execute(
		callId: string,
		input: Input,
		signal?: AbortSignal,
		onUpdate?: (partial: ToolResult<Details>) => void
	): Promise<ToolResult<Details>>;
}
