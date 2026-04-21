import fs from 'node:fs';
import path from 'node:path';
import type { Skill } from './types';
import { SkillParser } from './skill-parser';
import { FileSystemSkillSource } from './skill-source';
import { SkillError, SkillNotFoundError } from './skill-errors';

/**
 * SkillRepository — aggregate root for skill persistence.
 *
 * The repository abstracts storage so higher layers (services, UI) talk
 * to a single interface regardless of how skills are stored underneath.
 * The filesystem implementation is the only one in the app right now;
 * alternate backends (remote, encrypted, plugin) can slot in later.
 */
export interface SkillRepository {
	list(): Promise<Skill[]>;
	findById(id: string): Promise<Skill | null>;
	importFromPath(sourcePath: string): Promise<Skill[]>;
	delete(id: string): Promise<void>;
	readonly rootDir: string;
}

const SKILL_FILE_NAME = 'SKILL.md';

export interface FileSystemSkillRepositoryOptions {
	readonly rootDir: string;
	readonly onError?: (skillId: string, error: unknown) => void;
}

/**
 * FileSystemSkillRepository — writes to `{rootDir}/<folder>/SKILL.md`.
 *
 * `folder` is the stable id. Listing delegates to FileSystemSkillSource
 * (so load semantics stay in one place); mutations (import, delete) are
 * filesystem-local and guard against path escape via a prefix check.
 */
export class FileSystemSkillRepository implements SkillRepository {
	readonly rootDir: string;
	private readonly source: FileSystemSkillSource;

	constructor(options: FileSystemSkillRepositoryOptions) {
		this.rootDir = options.rootDir;
		this.ensureRoot();
		this.source = new FileSystemSkillSource({
			rootDir: this.rootDir,
			scope: 'user',
			onError: options.onError,
		});
	}

	async list(): Promise<Skill[]> {
		const records = await this.source.load();
		return records.map((record) => ({ ...record.skill, filePath: record.skill.filePath }));
	}

	async findById(id: string): Promise<Skill | null> {
		const filePath = this.resolveSkillPath(id);
		if (!fs.existsSync(filePath)) return null;
		const raw = await fs.promises.readFile(filePath, 'utf8');
		const { skill } = SkillParser.parse(raw, {
			scope: 'user',
			filePath,
			fallbackName: id,
		});
		return skill;
	}

	async importFromPath(sourcePath: string): Promise<Skill[]> {
		const stat = await fs.promises.stat(sourcePath);
		if (!stat.isDirectory()) {
			throw new SkillError('(import)', 'Selected path is not a directory');
		}

		const candidates = await this.resolveSkillCandidates(sourcePath);
		if (candidates.length === 0) {
			throw new SkillError('(import)', `No ${SKILL_FILE_NAME} found in the selected folder`);
		}

		const imported: Skill[] = [];
		for (const candidate of candidates) {
			const skill = await this.copyIntoRoot(candidate);
			if (skill) imported.push(skill);
		}
		if (imported.length === 0) {
			throw new SkillError('(import)', 'No valid skills found in the selected folder');
		}
		return imported;
	}

	async delete(id: string): Promise<void> {
		const skillDir = this.resolveSkillDir(id);
		if (!fs.existsSync(skillDir)) {
			throw new SkillNotFoundError(id);
		}
		await fs.promises.rm(skillDir, { recursive: true });
	}

	private async resolveSkillCandidates(sourcePath: string): Promise<string[]> {
		const direct = path.join(sourcePath, SKILL_FILE_NAME);
		if (fs.existsSync(direct)) return [sourcePath];

		const children = await fs.promises.readdir(sourcePath, { withFileTypes: true });
		const candidates: string[] = [];
		for (const child of children) {
			if (!child.isDirectory()) continue;
			const childPath = path.join(sourcePath, child.name);
			if (fs.existsSync(path.join(childPath, SKILL_FILE_NAME))) {
				candidates.push(childPath);
			}
		}
		return candidates;
	}

	private async copyIntoRoot(sourceDir: string): Promise<Skill | null> {
		const skillFile = path.join(sourceDir, SKILL_FILE_NAME);
		const raw = await fs.promises.readFile(skillFile, 'utf8');
		const { skill } = SkillParser.parse(raw, {
			scope: 'user',
			fallbackName: path.basename(sourceDir),
		});

		const folderName = sanitizeFolderName(skill.name);
		if (!folderName) {
			throw new SkillError(skill.name, 'Skill name produces an empty folder after sanitization');
		}

		const destDir = this.resolveSkillDir(folderName);
		await fs.promises.cp(sourceDir, destDir, { recursive: true });
		const destFile = path.join(destDir, SKILL_FILE_NAME);
		return { ...skill, filePath: destFile, scope: 'user' };
	}

	private resolveSkillDir(id: string): string {
		const dir = path.join(this.rootDir, id);
		if (!dir.startsWith(this.rootDir + path.sep)) {
			throw new SkillError(id, 'Invalid skill id');
		}
		return dir;
	}

	private resolveSkillPath(id: string): string {
		return path.join(this.resolveSkillDir(id), SKILL_FILE_NAME);
	}

	private ensureRoot(): void {
		fs.mkdirSync(this.rootDir, { recursive: true });
	}
}

function sanitizeFolderName(name: string): string {
	return name
		.replace(/[<>:"/\\|?*\p{Cc}]/gu, '')
		.replace(/\s+/g, '_')
		.trim();
}
