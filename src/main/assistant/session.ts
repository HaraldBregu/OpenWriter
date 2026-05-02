import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Append-only JSONL conversation history per session key.
 * Lives in userData/assistant-sessions/<sessionKey>.jsonl.
 */
export class SessionManager {
	readonly sessionKey: string;
	readonly filePath: string;

	constructor(sessionKey: string) {
		this.sessionKey = sessionKey;
		const dir = path.join(app.getPath('userData'), 'assistant-sessions');
		this.filePath = path.join(dir, `${sessionKey}.jsonl`);
	}

	async init(): Promise<void> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
		try {
			await fs.access(this.filePath);
		} catch {
			const meta = JSON.stringify({
				session_key: this.sessionKey,
				created_at: new Date().toISOString(),
			});
			await fs.writeFile(this.filePath, meta + '\n');
		}
	}

	async load(n = 50): Promise<ChatCompletionMessageParam[]> {
		let raw: string;
		try {
			raw = await fs.readFile(this.filePath, 'utf8');
		} catch {
			return [];
		}
		const lines = raw.split('\n').filter(Boolean);
		const messages: ChatCompletionMessageParam[] = [];
		for (const line of lines.slice(1)) {
			try {
				const entry = JSON.parse(line) as Record<string, unknown> & ChatCompletionMessageParam;
				delete (entry as { timestamp?: string }).timestamp;
				messages.push(entry);
			} catch {
				// skip malformed line
			}
		}
		return messages.slice(-n);
	}

	async append(messages: ChatCompletionMessageParam[]): Promise<void> {
		if (messages.length === 0) return;
		const lines = messages
			.map((m) => JSON.stringify({ ...m, timestamp: new Date().toISOString() }))
			.join('\n');
		await fs.appendFile(this.filePath, lines + '\n');
	}

	async clear(): Promise<void> {
		try {
			await fs.unlink(this.filePath);
		} catch {
			// already gone
		}
		await this.init();
	}
}
