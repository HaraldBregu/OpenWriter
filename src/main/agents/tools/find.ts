import { spawn } from 'node:child_process';
import type { AgentTool, JSONSchema } from './types.js';
import { resolveToCwd } from './path-utils.js';
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	type TruncationResult,
	truncateHead,
} from './truncate.js';

export interface FindToolInput {
	path?: string;
	glob?: string;
	type?: 'file' | 'directory';
	limit?: number;
}

export interface FindToolDetails {
	truncation?: TruncationResult;
	command: string[];
}

const findSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		path: { type: 'string', description: 'Directory to search (default: cwd)' },
		glob: { type: 'string', description: "Glob filter, e.g. '**/*.ts'" },
		type: { type: 'string', enum: ['file', 'directory'], description: 'Filter by entry kind' },
		limit: { type: 'number', description: 'Max results' },
	},
};

function resolveFindBinary(): string {
	return process.env.PI_FIND_BIN || 'fd';
}

export function createFindTool(cwd: string): AgentTool<FindToolInput, FindToolDetails | undefined> {
	return {
		name: 'find',
		label: 'find',
		description: `Find files by path/name using fd-compatible syntax. Respects .gitignore. Output capped at ${DEFAULT_MAX_LINES} lines / ${DEFAULT_MAX_BYTES / 1024}KB.`,
		parameters: findSchema,
		async execute(_id, { path, glob, type, limit }, signal) {
			if (signal?.aborted) throw new Error('Operation aborted');
			const bin = resolveFindBinary();
			const args = ['--hidden', '--color=never'];
			if (type === 'file') args.push('-t', 'f');
			if (type === 'directory') args.push('-t', 'd');
			if (limit) args.push('--max-results', String(limit));
			if (glob) args.push('-g', glob);
			else args.push('.');
			if (path) args.push(resolveToCwd(path, cwd));

			return new Promise((resolve, reject) => {
				const child = spawn(bin, args, { cwd, env: process.env });
				let stdout = '';
				let stderr = '';
				child.stdout.on('data', (d) => (stdout += d.toString('utf-8')));
				child.stderr.on('data', (d) => (stderr += d.toString('utf-8')));
				const onAbort = () => child.kill('SIGKILL');
				signal?.addEventListener('abort', onAbort, { once: true });
				child.on('error', (err) => {
					signal?.removeEventListener('abort', onAbort);
					reject(err);
				});
				child.on('close', (code) => {
					signal?.removeEventListener('abort', onAbort);
					if (signal?.aborted) return reject(new Error('Operation aborted'));
					if (code !== 0) return reject(new Error(stderr.trim() || `find exited with ${code}`));
					const trunc = truncateHead(stdout);
					let output = trunc.content || '(no matches)';
					if (trunc.truncated) output += `\n\n[Truncated at ${trunc.outputLines} lines]`;
					resolve({
						content: [{ type: 'text', text: output }],
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

export const findTool = createFindTool(process.cwd());
