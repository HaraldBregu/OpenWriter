import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Static, Type } from "@sinclair/typebox";
import type { AgentTool } from "../lib/agent/index.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, type TruncationResult, truncateTail } from "./truncate.js";

const bashSchema = Type.Object({
	command: Type.String({ description: "Bash command to execute" }),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});

export type BashToolInput = Static<typeof bashSchema>;

export interface BashToolDetails {
	truncation?: TruncationResult;
	fullOutputPath?: string;
}

function getTempFilePath(): string {
	return join(tmpdir(), `pi-bash-${randomBytes(8).toString("hex")}.log`);
}

function getShell(): { shell: string; args: string[] } {
	if (process.platform === "win32") {
		return { shell: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c"] };
	}
	return { shell: process.env.SHELL ?? "/bin/bash", args: ["-c"] };
}

export function createBashTool(cwd: string): AgentTool<typeof bashSchema, BashToolDetails | undefined> {
	return {
		name: "bash",
		label: "bash",
		description: `Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.`,
		parameters: bashSchema,
		executionMode: "sequential",
		async execute(_id, { command, timeout }, signal, onUpdate) {
			if (!existsSync(cwd)) {
				throw new Error(`Working directory does not exist: ${cwd}`);
			}
			if (onUpdate) onUpdate({ content: [], details: undefined });

			return new Promise((resolve, reject) => {
				const { shell, args } = getShell();
				const child = spawn(shell, [...args, command], {
					cwd,
					env: process.env,
					stdio: ["ignore", "pipe", "pipe"],
				});

				let tempFilePath: string | undefined;
				let tempFileStream: ReturnType<typeof createWriteStream> | undefined;
				let totalBytes = 0;
				const chunks: Buffer[] = [];
				let chunksBytes = 0;
				const maxChunksBytes = DEFAULT_MAX_BYTES * 2;
				let timedOut = false;
				let timeoutHandle: NodeJS.Timeout | undefined;

				const ensureTempFile = () => {
					if (tempFilePath) return;
					tempFilePath = getTempFilePath();
					tempFileStream = createWriteStream(tempFilePath);
					for (const chunk of chunks) tempFileStream.write(chunk);
				};

				const handleData = (data: Buffer) => {
					totalBytes += data.length;
					if (totalBytes > DEFAULT_MAX_BYTES) ensureTempFile();
					if (tempFileStream) tempFileStream.write(data);
					chunks.push(data);
					chunksBytes += data.length;
					while (chunksBytes > maxChunksBytes && chunks.length > 1) {
						const removed = chunks.shift()!;
						chunksBytes -= removed.length;
					}
					if (onUpdate) {
						const text = Buffer.concat(chunks).toString("utf-8");
						const trunc = truncateTail(text);
						if (trunc.truncated) ensureTempFile();
						onUpdate({
							content: [{ type: "text", text: trunc.content || "" }],
							details: {
								truncation: trunc.truncated ? trunc : undefined,
								fullOutputPath: tempFilePath,
							},
						});
					}
				};

				child.stdout?.on("data", handleData);
				child.stderr?.on("data", handleData);

				if (timeout !== undefined && timeout > 0) {
					timeoutHandle = setTimeout(() => {
						timedOut = true;
						child.kill("SIGKILL");
					}, timeout * 1000);
				}

				const onAbort = () => child.kill("SIGKILL");
				if (signal) {
					if (signal.aborted) onAbort();
					else signal.addEventListener("abort", onAbort, { once: true });
				}

				child.on("error", (err) => {
					if (timeoutHandle) clearTimeout(timeoutHandle);
					if (signal) signal.removeEventListener("abort", onAbort);
					if (tempFileStream) tempFileStream.end();
					reject(err);
				});

				child.on("close", (exitCode) => {
					if (timeoutHandle) clearTimeout(timeoutHandle);
					if (signal) signal.removeEventListener("abort", onAbort);
					if (tempFileStream) tempFileStream.end();

					const fullOutput = Buffer.concat(chunks).toString("utf-8");
					const trunc = truncateTail(fullOutput);
					if (trunc.truncated) ensureTempFile();

					if (signal?.aborted) {
						reject(new Error(`${fullOutput}${fullOutput ? "\n\n" : ""}Command aborted`));
						return;
					}
					if (timedOut) {
						reject(new Error(`${fullOutput}${fullOutput ? "\n\n" : ""}Command timed out after ${timeout} seconds`));
						return;
					}

					let outputText = trunc.content || "(no output)";
					let details: BashToolDetails | undefined;
					if (trunc.truncated) {
						details = { truncation: trunc, fullOutputPath: tempFilePath };
						const startLine = trunc.totalLines - trunc.outputLines + 1;
						const endLine = trunc.totalLines;
						if (trunc.truncatedBy === "lines") {
							outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${trunc.totalLines}. Full output: ${tempFilePath}]`;
						} else {
							outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${trunc.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Full output: ${tempFilePath}]`;
						}
					}

					if (exitCode !== 0 && exitCode !== null) {
						outputText += `\n\nCommand exited with code ${exitCode}`;
						reject(new Error(outputText));
						return;
					}
					resolve({ content: [{ type: "text", text: outputText }], details: details as any });
				});
			});
		},
	};
}

export const bashTool = createBashTool(process.cwd());
