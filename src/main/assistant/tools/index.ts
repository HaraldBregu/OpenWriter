import { ExecTool } from './exec';
import { ReadFileTool, WriteFileTool } from './filesystem';
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import type { Tool } from './base';
import type { CronService } from '../../cron';

export { Tool, type ToolSchema } from './base';
export { ExecTool } from './exec';
export { ReadFileTool, WriteFileTool } from './filesystem';
export { CronAddTool, CronListTool, CronRemoveTool } from './cron';

/**
 * Built-in tools enabled by default for a new Assistant.
 * Pass a `CronService` to include cron scheduling tools.
 */
export function defaultTools(opts: { cron?: CronService } = {}): Tool[] {
	const tools: Tool[] = [new ReadFileTool(), new WriteFileTool(), new ExecTool()];
	if (opts.cron) {
		tools.push(new CronAddTool(opts.cron), new CronListTool(opts.cron), new CronRemoveTool(opts.cron));
	}
	return tools;
}
