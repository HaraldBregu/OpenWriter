import { existsSync, readdirSync, statSync } from 'node:fs';
import nodePath from 'node:path';
import type { AgentTool, JSONSchema } from './types.js';
import { resolveToCwd } from './path-utils.js';
import { DEFAULT_MAX_BYTES, formatSize, type TruncationResult, truncateHead } from './truncate.js';

export interface LsToolInput {
	path?: string;
	limit?: number;
}

const DEFAULT_LIMIT = 500;

export interface LsToolDetails {
	truncation?: TruncationResult;
	entryLimitReached?: number;
}

const lsSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		path: { type: 'string', description: 'Directory to list (default: cwd)' },
		limit: { type: 'number', description: `Max entries (default: ${DEFAULT_LIMIT})` },
	},
};

export function createLsTool(cwd: string): AgentTool<LsToolInput, LsToolDetails | undefined> {
	return {
		name: 'ls',
		label: 'ls',
		description: `List directory contents. Returns entries alphabetically with '/' suffix for directories. Includes dotfiles. Capped at ${DEFAULT_LIMIT} entries or ${DEFAULT_MAX_BYTES / 1024}KB.`,
		parameters: lsSchema,
		async execute(_id, { path, limit }, signal) {
			if (signal?.aborted) throw new Error('Operation aborted');
			const dirPath = resolveToCwd(path || '.', cwd);
			if (!existsSync(dirPath)) throw new Error(`Path not found: ${dirPath}`);
			const stat = statSync(dirPath);
			if (!stat.isDirectory()) throw new Error(`Not a directory: ${dirPath}`);

			const entries = readdirSync(dirPath);
			entries.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

			const effectiveLimit = limit ?? DEFAULT_LIMIT;
			const results: string[] = [];
			let entryLimitReached = false;
			for (const entry of entries) {
				if (results.length >= effectiveLimit) {
					entryLimitReached = true;
					break;
				}
				const fullPath = nodePath.join(dirPath, entry);
				let suffix = '';
				try {
					if (statSync(fullPath).isDirectory()) suffix = '/';
				} catch {
					continue;
				}
				results.push(entry + suffix);
			}

			if (results.length === 0) {
				return { content: [{ type: 'text', text: '(empty directory)' }], details: undefined };
			}

			const rawOutput = results.join('\n');
			const truncation = truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
			let output = truncation.content;
			const details: LsToolDetails = {};
			const notices: string[] = [];
			if (entryLimitReached) {
				notices.push(
					`${effectiveLimit} entries limit reached. Use limit=${effectiveLimit * 2} for more`
				);
				details.entryLimitReached = effectiveLimit;
			}
			if (truncation.truncated) {
				notices.push(`${formatSize(DEFAULT_MAX_BYTES)} limit reached`);
				details.truncation = truncation;
			}
			if (notices.length > 0) output += `\n\n[${notices.join('. ')}]`;

			return {
				content: [{ type: 'text', text: output }],
				details: Object.keys(details).length > 0 ? details : undefined,
			};
		},
	};
}

export const lsTool = createLsTool(process.cwd());
