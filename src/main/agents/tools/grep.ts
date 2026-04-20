import { spawn } from "node:child_process";
import type { AgentTool, JSONSchema } from "./types.js";
import { resolveToCwd } from "./path-utils.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, type TruncationResult, truncateHead } from "./truncate.js";

export interface GrepToolInput {
	pattern: string;
	path?: string;
	glob?: string;
	ignoreCase?: boolean;
	contextLines?: number;
	limit?: number;
}

export interface GrepToolDetails {
	truncation?: TruncationResult;
	command: string[];
}

const grepSchema: JSONSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		pattern: { type: "string", description: "Regular expression to search for" },
		path: { type: "string", description: "File or directory to search (default: cwd)" },
		glob: { type: "string", description: "Glob filter, e.g. '*.ts'" },
		ignoreCase: { type: "boolean", description: "Case-insensitive match" },
		contextLines: { type: "number", description: "Lines of context around each match" },
		limit: { type: "number", description: "Max matches to return" },
	},
	required: ["pattern"],
};

function resolveSearchBinary(): string {
	return process.env.PI_GREP_BIN || "rg";
}

export function createGrepTool(cwd: string): AgentTool<GrepToolInput, GrepToolDetails | undefined> {
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
						},
					});
				});
			});
		},
	};
}

export const grepTool = createGrepTool(process.cwd());
