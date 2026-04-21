import type { AgentTool } from './types.js';
import { bashTool, createBashTool } from './bash.js';
import { createEditTool, editTool } from './edit.js';
import { createFindTool, findTool } from './find.js';
import { createGrepTool, grepTool } from './grep.js';
import { createLsTool, lsTool } from './ls.js';
import { createReadTool, readTool } from './read.js';
import { createWriteTool, writeTool } from './write.js';

export type { AgentTool, JSONSchema, ToolContent, ToolResult } from './types.js';
export { bashTool, createBashTool } from './bash.js';
export type { BashToolInput, BashToolDetails } from './bash.js';
export { createEditTool, editTool } from './edit.js';
export type { EditToolInput, EditReplacement } from './edit.js';
export { createFindTool, findTool } from './find.js';
export type { FindToolInput, FindToolDetails } from './find.js';
export { createGrepTool, grepTool } from './grep.js';
export type { GrepToolInput, GrepToolDetails } from './grep.js';
export { createLsTool, lsTool } from './ls.js';
export type { LsToolInput, LsToolDetails } from './ls.js';
export { createReadTool, readTool } from './read.js';
export type { ReadToolInput, ReadToolDetails } from './read.js';
export { createWriteTool, writeTool } from './write.js';
export type { WriteToolInput } from './write.js';
export { createGenerateImageTool } from './generate-image.js';
export type {
	GenerateImageToolInput,
	GenerateImageToolDeps,
	GenerateImageSize,
} from './generate-image.js';
export { toOpenAITools, executeToolCalls } from './openai-adapter.js';
export type { OpenAIChatTool, ParsedToolCall, ToolExecutionResult } from './openai-adapter.js';

export type Tool = AgentTool;

export const codingTools: Tool[] = [readTool, bashTool, editTool, writeTool];
export const readOnlyTools: Tool[] = [readTool, grepTool, findTool, lsTool];

export const allTools = {
	read: readTool,
	bash: bashTool,
	edit: editTool,
	write: writeTool,
	grep: grepTool,
	find: findTool,
	ls: lsTool,
};

export type ToolName = keyof typeof allTools;

export function createAllTools(cwd: string): Record<ToolName, Tool> {
	return {
		read: createReadTool(cwd),
		bash: createBashTool(cwd),
		edit: createEditTool(cwd),
		write: createWriteTool(cwd),
		grep: createGrepTool(cwd),
		find: createFindTool(cwd),
		ls: createLsTool(cwd),
	};
}

export function createCodingTools(cwd: string): Tool[] {
	return [createReadTool(cwd), createBashTool(cwd), createEditTool(cwd), createWriteTool(cwd)];
}

export function createReadOnlyTools(cwd: string): Tool[] {
	return [createReadTool(cwd), createGrepTool(cwd), createFindTool(cwd), createLsTool(cwd)];
}
