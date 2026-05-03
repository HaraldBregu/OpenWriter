import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const TEMPLATE_FILES = ['AGENTS.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'MEMORY.md', 'SOUL.md', 'USER.md'];

/**
 * Per-assistant markdown memory. Lives in userData/assistant-workspace/<id>/.
 * Seeds template files from src/main/assistant/templates on first init when
 * the source directory is reachable; otherwise starts empty.
 */
export class MemoryManager {
	readonly workspace: string;
	private readonly templatesDir: string;

	constructor(assistantId: string) {
		this.workspace = path.join(app.getPath('userData'), 'assistant-workspace', assistantId);
		this.templatesDir = path.join(__dirname, 'templates');
	}

	async init(): Promise<void> {
		await fs.mkdir(this.workspace, { recursive: true });
		await this.seedTemplates();
	}

	private async seedTemplates(): Promise<void> {
		let entries: string[];
		try {
			entries = await fs.readdir(this.templatesDir);
		} catch {
			return;
		}
		const isFresh = !(await this.exists(path.join(this.workspace, 'SOUL.md')));
		for (const filename of entries) {
			if (filename === 'BOOTSTRAP.md' && !isFresh) continue;
			const dest = path.join(this.workspace, filename);
			if (!(await this.exists(dest))) {
				await fs.copyFile(path.join(this.templatesDir, filename), dest);
			}
		}
	}

	private async exists(p: string): Promise<boolean> {
		try {
			await fs.access(p);
			return true;
		} catch {
			return false;
		}
	}

	async readAll(): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const filename of TEMPLATE_FILES) {
			const p = path.join(this.workspace, filename);
			try {
				const content = (await fs.readFile(p, 'utf8')).trim();
				if (content) {
					result[path.parse(filename).name.toLowerCase()] = content;
				}
			} catch {
				// missing file -- skip
			}
		}
		return result;
	}
}
