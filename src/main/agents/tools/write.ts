import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type Static, Type } from "@sinclair/typebox";
import type { AgentTool } from "../lib/agent/index.js";
import { withFileMutationQueue } from "./file-mutation-queue.js";
import { resolveToCwd } from "./path-utils.js";

const writeSchema = Type.Object({
	path: Type.String({ description: "Path to the file" }),
	content: Type.String({ description: "Full contents to write" }),
});

export type WriteToolInput = Static<typeof writeSchema>;

export function createWriteTool(cwd: string): AgentTool<typeof writeSchema, undefined> {
	return {
		name: "write",
		label: "write",
		description: "Write a file to the filesystem, overwriting if it already exists. Creates parent directories as needed.",
		parameters: writeSchema,
		executionMode: "sequential",
		async execute(_id, { path, content }, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			const abs = resolveToCwd(path, cwd);
			return withFileMutationQueue(abs, async () => {
				await fsMkdir(dirname(abs), { recursive: true });
				await fsWriteFile(abs, content, "utf-8");
				return {
					content: [{ type: "text", text: `Wrote ${abs} (${content.length} bytes)` }],
					details: undefined,
				};
			});
		},
	};
}

export const writeTool = createWriteTool(process.cwd());
