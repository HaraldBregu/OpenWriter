import fs from 'node:fs';
import path from 'node:path';
import type { Skill, SkillScope } from './types';
import { SkillParser } from './skill-parser';

/**
 * SkillSource — Strategy for producing a snapshot of skills.
 *
 * Implementations plug into a SkillRepository without it having to know
 * whether skills come from disk, a plugin package, an archive, or an
 * in-memory fixture. Each source owns its own scope default and error
 * handling; the repository merely consumes snapshots.
 */
export interface SkillSource {
	readonly id: string;
	load(): Promise<ReadonlyArray<SkillLoadRecord>>;
}

export interface SkillLoadRecord {
	readonly id: string;
	readonly skill: Skill;
}

export interface FileSystemSkillSourceOptions {
	readonly rootDir: string;
	readonly scope?: SkillScope;
	readonly id?: string;
	readonly onError?: (skillId: string, error: unknown) => void;
}

/**
 * FileSystemSkillSource — scans `{rootDir}/<skillId>/SKILL.md` and yields
 * a record per valid skill. The directory name becomes the stable id
 * used by the repository for CRUD operations; the parsed skill name may
 * differ (frontmatter is authoritative for prompt-facing identity).
 */
export class FileSystemSkillSource implements SkillSource {
	readonly id: string;
	readonly rootDir: string;
	private readonly scope: SkillScope;
	private readonly onError?: (skillId: string, error: unknown) => void;

	constructor(options: FileSystemSkillSourceOptions) {
		this.rootDir = options.rootDir;
		this.scope = options.scope ?? 'user';
		this.id = options.id ?? `fs:${options.rootDir}`;
		this.onError = options.onError;
	}

	async load(): Promise<ReadonlyArray<SkillLoadRecord>> {
		if (!fs.existsSync(this.rootDir)) return [];

		const entries = await fs.promises.readdir(this.rootDir, { withFileTypes: true });
		const records: SkillLoadRecord[] = [];

		await Promise.all(
			entries.map(async (entry) => {
				if (!entry.isDirectory()) return;
				const record = await this.readSkill(entry.name);
				if (record) records.push(record);
			})
		);

		return records.sort((a, b) => a.skill.name.localeCompare(b.skill.name));
	}

	private async readSkill(id: string): Promise<SkillLoadRecord | null> {
		const filePath = path.join(this.rootDir, id, 'SKILL.md');
		try {
			const raw = await fs.promises.readFile(filePath, 'utf8');
			const { skill } = SkillParser.parse(raw, {
				scope: this.scope,
				filePath,
				fallbackName: id,
			});
			return { id, skill };
		} catch (error) {
			if (isEnoent(error)) return null;
			this.onError?.(id, error);
			return null;
		}
	}
}

function isEnoent(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'ENOENT'
	);
}
