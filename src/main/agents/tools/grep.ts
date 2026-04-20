import { spawn } from "node:child_process";
import { type Static, Type } from "@sinclair/typebox";
import type { AgentTool } from "../lib/agent/index.js";
import { resolveToCwd } from "./path-utils.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, type TruncationResult, truncateHead } from "./truncate.js";

const grepSchema = Type.Object({
	pattern: Type.String({ description: "Regular expression to search for" }),
	path: Type.Optional(Type.String({ description: "File or directory to search (default: cwd)" })),
	glob: Type.Optional(Type.String({ description: "Glob filter, e.g. '*.ts'" })),
	ignoreCase: Type.Optional(Type.Boolean({ description: "Case-insensitive match" })),
	contextLines: Type.Optional(Type.Number({ description: "Lines of context around each match" })),
	limit: Type.Optional(Type.Number({ description: "Max matches to return" })),
});

export type GrepToolInput = Static<typeof grepSchema>;

export interface GrepToolDetails {
	truncation?: TruncationResult;
	command: string[];
}

function resolveSearchBinary(): string {
	return process.env.PI_GREP_BIN || "rg";
}

export function createGrepTool(cwd: string): AgentTool<typeof grepSchema, GrepToolDetails | undefined> {
	return {
		name: "grep",
		label: "grep",
		description: `Search file contents using ripgrep-compatible syntax. Returns matching lines with path:line:content. Output capped at ${DEFAULT_MAX_LINES} lines / ${DEFAULT_MAX_BYTES / 1024}KB.`,
		parameters: grepSchema,
		async execute(_id, { pattern, path, glob, ignoreCase, contextLines, limit }, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			const bin = resolveSearchBinary();
			const args = ["-n", "--hidden", "--no-heading", "--color=never"];
			if (ignoreCase) args.push("-i");
			if (contextLines) args.push(`-C${contextLines}`);
			if (glob) args.push("-g", glob);
			if (limit) args.push("-m", String(limit));
			args.push(pattern);
			args.push(path ? resolveToCwd(path, cwd) : cwd);

			return new Promise((resolve, reject) => {
				const child = spawn(bin, args, { cwd, env: process.env });
				let stdout = "";
				let stderr = "";
				child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
				child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));
				const onAbort = () => child.kill("SIGKILL");
				signal?.addEventListener("abort", onAbort, { once: true });
				child.on("error", (err) => {
					signal?.removeEventListener("abort", onAbort);
					reject(err);
				});
				child.on("close", (code) => {
					signal?.removeEventListener("abort", onAbort);
					if (signal?.aborted) return reject(new Error("Operation aborted"));
					if (code !== 0 && code !== 1) {
						return reject(new Error(stderr.trim() || `grep exited with ${code}`));
					}
					const trunc = truncateHead(stdout);
					let output = trunc.content || (code === 1 ? "(no matches)" : "");
					if (trunc.truncated) output += `\n\n[Truncated at ${trunc.outputLines} lines]`;
					resolve({
						content: [{ type: "text", text: output }],
						details: {
							command: [bin, ...args],
							truncation: trunc.truncated ? trunc : undefined,
						} as any,
					});
				});
			});
		},
	};
}

export const grepTool = createGrepTool(process.cwd());
