import { constants } from "node:fs";
import { access as fsAccess, readFile as fsReadFile } from "node:fs/promises";
import { type Static, Type } from "@sinclair/typebox";
import type { AgentTool } from "../lib/agent/index.js";
import { resolveReadPath } from "./path-utils.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, type TruncationResult, truncateHead } from "./truncate.js";

const readSchema = Type.Object({
	path: Type.String({ description: "Absolute or relative path to the file" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to return" })),
});

export type ReadToolInput = Static<typeof readSchema>;

export interface ReadToolDetails {
	truncation?: TruncationResult;
}

export function createReadTool(cwd: string): AgentTool<typeof readSchema, ReadToolDetails | undefined> {
	return {
		name: "read",
		label: "read",
		description: `Read a file from the filesystem. Returns up to ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever hits first). Use offset/limit for pagination.`,
		parameters: readSchema,
		async execute(_id, { path, offset, limit }, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");

			const abs = resolveReadPath(path, cwd);
			try {
				await fsAccess(abs, constants.R_OK);
			} catch {
				throw new Error(`Cannot read file: ${abs}`);
			}

			const raw = await fsReadFile(abs, "utf-8");
			let content = raw;

			if (offset !== undefined || limit !== undefined) {
				const lines = raw.split("\n");
				const start = Math.max(0, (offset ?? 1) - 1);
				const end = limit !== undefined ? start + limit : lines.length;
				content = lines.slice(start, end).join("\n");
			}

			const trunc = truncateHead(content);
			const details: ReadToolDetails = {};
			let output = trunc.content;
			if (trunc.truncated) {
				details.truncation = trunc;
				output += `\n\n[Truncated at ${trunc.outputLines} lines]`;
			}

			return {
				content: [{ type: "text", text: output }],
				details: Object.keys(details).length > 0 ? details : (undefined as any),
			};
		},
	};
}

export const readTool = createReadTool(process.cwd());
