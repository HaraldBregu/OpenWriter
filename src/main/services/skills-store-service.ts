import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { LoggerService } from './logger';
import type { SkillInfo } from '../../shared/types';
import {
	bundledSkills,
	parseSkillMarkdown,
	type Skill,
} from '../agents/skills';

const SKILL_FILE_NAME = 'SKILL.md';
const SKILLS_FOLDER = 'skills';

/**
 * Service that manages user-installed skills under
 * `{userData}/skills/{skillId}/SKILL.md`.
 *
 * Mirrors ThemeService: idempotent directory creation, folder-name as
 * stable id, directory-based import. Bundled skills are merged in from
 * `src/main/agents/skills/bundled` for a unified listing.
 */
export class SkillsStoreService {
	private readonly logger: LoggerService;

	constructor(logger: LoggerService) {
		this.logger = logger;
	}

	getSkillsDirectory(): string {
		const skillsDir = path.join(app.getPath('userData'), SKILLS_FOLDER);
		fs.mkdirSync(skillsDir, { recursive: true });
		return skillsDir;
	}

	listSkills(): SkillInfo[] {
		const bundled = bundledSkills.map((skill) => this.toInfo(skill, skill.name));
		const user = this.listUserSkills();
		return [...bundled, ...user];
	}

	private listUserSkills(): SkillInfo[] {
		const skillsDir = this.getSkillsDirectory();
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(skillsDir, { withFileTypes: true });
		} catch (err) {
			this.logger.error('SkillsStoreService', 'Failed to read skills directory', err);
			return [];
		}

		const skills: SkillInfo[] = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const skillDir = path.join(skillsDir, entry.name);
			const skillFile = path.join(skillDir, SKILL_FILE_NAME);
			if (!fs.existsSync(skillFile)) continue;

			try {
				const raw = fs.readFileSync(skillFile, 'utf8');
				const { skill } = parseSkillMarkdown(raw, {
					scope: 'user',
					filePath: skillFile,
					fallbackName: entry.name,
				});
				skills.push(this.toInfo(skill, entry.name));
			} catch (err) {
				this.logger.warn('SkillsStoreService', `Skipping invalid skill "${entry.name}"`, err);
			}
		}
		return skills;
	}

	/**
	 * Import one or more skills from an on-disk folder.
	 *
	 * Two layouts are supported:
	 *  - A single-skill folder (contains `SKILL.md` directly).
	 *  - A collection folder (each subdirectory is a skill with its own `SKILL.md`).
	 *
	 * Returns the SkillInfo entries that were imported.
	 */
	importSkillsFromPath(sourcePath: string): SkillInfo[] {
		const stat = fs.statSync(sourcePath);
		if (!stat.isDirectory()) {
			throw new Error('Selected path is not a directory');
		}

		const candidates = this.resolveSkillCandidates(sourcePath);
		if (candidates.length === 0) {
			throw new Error(`No ${SKILL_FILE_NAME} found in the selected folder`);
		}

		const imported: SkillInfo[] = [];
		for (const candidate of candidates) {
			try {
				imported.push(this.importOne(candidate));
			} catch (err) {
				this.logger.warn(
					'SkillsStoreService',
					`Skipping skill "${path.basename(candidate)}" during import`,
					err
				);
			}
		}

		if (imported.length === 0) {
			throw new Error('No valid skills found in the selected folder');
		}
		return imported;
	}

	deleteSkill(id: string): void {
		const skillsDir = this.getSkillsDirectory();
		const skillDir = path.join(skillsDir, id);

		if (!skillDir.startsWith(skillsDir + path.sep)) {
			throw new Error('Invalid skill id');
		}
		if (!fs.existsSync(skillDir)) {
			throw new Error(`Skill "${id}" not found`);
		}

		fs.rmSync(skillDir, { recursive: true });
		this.logger.info('SkillsStoreService', `Deleted skill "${id}"`);
	}

	private resolveSkillCandidates(sourcePath: string): string[] {
		const direct = path.join(sourcePath, SKILL_FILE_NAME);
		if (fs.existsSync(direct)) return [sourcePath];

		const children = fs.readdirSync(sourcePath, { withFileTypes: true });
		return children
			.filter((entry) => entry.isDirectory())
			.map((entry) => path.join(sourcePath, entry.name))
			.filter((dir) => fs.existsSync(path.join(dir, SKILL_FILE_NAME)));
	}

	private importOne(sourceDir: string): SkillInfo {
		const skillFile = path.join(sourceDir, SKILL_FILE_NAME);
		const raw = fs.readFileSync(skillFile, 'utf8');
		const { skill } = parseSkillMarkdown(raw, {
			scope: 'user',
			fallbackName: path.basename(sourceDir),
		});

		const folderName = this.sanitizeFolderName(skill.name);
		if (folderName.length === 0) {
			throw new Error('Skill name results in an empty folder name after sanitization');
		}

		const destPath = path.join(this.getSkillsDirectory(), folderName);
		fs.cpSync(sourceDir, destPath, { recursive: true });

		this.logger.info('SkillsStoreService', `Imported skill "${skill.name}" to ${destPath}`);

		return this.toInfo(
			{
				...skill,
				filePath: path.join(destPath, SKILL_FILE_NAME),
				scope: 'user',
			},
			folderName
		);
	}

	private toInfo(skill: Skill, id: string): SkillInfo {
		return {
			id,
			name: skill.name,
			description: skill.description,
			scope: skill.scope,
			emoji: skill.metadata?.emoji,
			tags: skill.metadata?.tags,
			filePath: skill.filePath,
		};
	}

	private sanitizeFolderName(name: string): string {
		return name
			.replace(/[<>:"/\\|?*\p{Cc}]/gu, '')
			.replace(/\s+/g, '_')
			.trim();
	}
}
