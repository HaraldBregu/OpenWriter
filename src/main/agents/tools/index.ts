import type { AgentTool } from "../lib/agent/index.js";
import { bashTool, createBashTool } from "./bash.js";
import { createEditTool, editTool } from "./edit.js";
import { createFindTool, findTool } from "./find.js";
import { createGrepTool, grepTool } from "./grep.js";
import { createLsTool, lsTool } from "./ls.js";
import { createReadTool, readTool } from "./read.js";
import { createWriteTool, writeTool } from "./write.js";

export { bashTool, createBashTool } from "./bash.js";
export { createEditTool, editTool } from "./edit.js";
export { createFindTool, findTool } from "./find.js";
export { createGrepTool, grepTool } from "./grep.js";
export { createLsTool, lsTool } from "./ls.js";
export { createReadTool, readTool } from "./read.js";
export { createWriteTool, writeTool } from "./write.js";

export type Tool = AgentTool<any>;

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
