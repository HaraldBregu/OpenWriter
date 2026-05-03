import { ExecTool } from './exec';
import { ReadFileTool, WriteFileTool } from './filesystem';
import type { Tool } from './base';

export { Tool, type ToolSchema } from './base';
export { ExecTool } from './exec';
export { ReadFileTool, WriteFileTool } from './filesystem';
export { CronAddTool, CronListTool, CronRemoveTool } from './cron';

/** Built-in tools enabled by default for a new Assistant. */
export function defaultTools(): Tool[] {
	return [new ReadFileTool(), new WriteFileTool(), new ExecTool()];
}
