import { app } from 'electron';
import path from 'node:path';
import type { LoggerService } from './logger';
import type { SkillInfo } from '../../shared/types';
import {
	FileSystemSkillRepository,
	type Skill,
	type SkillRepository,
} from '../agents/skills';

const SKILLS_FOLDER = 'skills';

/**
 * SkillsStoreService — façade over a SkillRepository that lives at
 * `{userData}/skills/` (same neighborhood as `{userData}/themes/`).
 *
 * The service deliberately stays thin: directory resolution, DTO
 * translation for IPC, logging. The heavy lifting (parsing, listing,
 * import, delete) is delegated to the repository so alternate backends
 * can be swapped in without touching IPC or the renderer.
 *
 * Skills are loaded dynamically. If the folder does not exist or is
 * empty, the service returns an empty list — no bundled defaults are
 * seeded and no TS skill constants are consulted.
 */
export class SkillsStoreService {
	private readonly logger: LoggerService;
	private readonly repository: SkillRepository;

	constructor(logger: LoggerService) {
		this.logger = logger;
		this.repository = new FileSystemSkillRepository({
			rootDir: this.resolveSkillsDirectory(),
			onError: (skillId, err) =>
				this.logger.warn('SkillsStoreService', `Skipping invalid skill "${skillId}"`, err),
		});
	}

	getSkillsDirectory(): string {
		return this.repository.rootDir;
	}

	async listSkills(): Promise<SkillInfo[]> {
		const skills = await this.repository.list();
		return skills.map(toSkillInfo);
	}

	async listSkillEntities(): Promise<Skill[]> {
		return this.repository.list();
	}

	async importSkillsFromPath(sourcePath: string): Promise<SkillInfo[]> {
		const imported = await this.repository.importFromPath(sourcePath);
		for (const skill of imported) {
			this.logger.info(
				'SkillsStoreService',
				`Imported skill "${skill.name}" → ${skill.filePath ?? '(unknown path)'}`
			);
		}
		return imported.map(toSkillInfo);
	}

	async deleteSkill(id: string): Promise<void> {
		await this.repository.delete(id);
		this.logger.info('SkillsStoreService', `Deleted skill "${id}"`);
	}

	private resolveSkillsDirectory(): string {
		return path.join(app.getPath('userData'), SKILLS_FOLDER);
	}
}

function toSkillInfo(skill: Skill): SkillInfo {
	return {
		id: deriveId(skill),
		name: skill.name,
		description: skill.description,
		scope: skill.scope,
		emoji: skill.metadata?.emoji,
		tags: skill.metadata?.tags,
		filePath: skill.filePath,
	};
}

function deriveId(skill: Skill): string {
	if (skill.filePath) {
		return path.basename(path.dirname(skill.filePath));
	}
	return skill.name;
}
