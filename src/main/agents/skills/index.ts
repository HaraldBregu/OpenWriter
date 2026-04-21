/**
 * Skills — portable workflow packages loaded dynamically from the
 * user's application data folder.
 *
 * Runtime layout (mirrors themes):
 *   {userData}/skills/<skillId>/SKILL.md
 *
 * Skills are never hardcoded in source. They are authored as standalone
 * Markdown files with YAML frontmatter and loaded at runtime through
 * the Repository + Source + Parser pipeline below:
 *
 *   SkillParser    — Factory that builds a Skill from SKILL.md text
 *   SkillSource    — Strategy that produces a batch of skills from a backend
 *   SkillRepository— Aggregate root for list/import/delete over a storage
 *   SkillRegistry  — In-memory lookup map populated from the repository
 *
 * Inspired by OpenClaw's skill catalog (docs/ANALYSIS_AGENTS_SKILLS_TOOLS.md),
 * pared down to what the OpenWriter assistant needs in-process.
 */

export type {
	Skill,
	SkillEntry,
	SkillMetadata,
	SkillExposure,
	SkillScope,
	SkillSnapshot,
} from './types';

export { SkillRegistry } from './skill-registry';
export {
	SkillError,
	SkillLoadError,
	SkillNotFoundError,
	SkillValidationError,
} from './skill-errors';
export {
	buildSkillsPrompt,
	buildSkillsSnapshot,
	renderSkillInstructions,
} from './skill-prompt';

export { SkillParser } from './skill-parser';
export type { ParsedSkill, ParseSkillOptions } from './skill-parser';

export { FileSystemSkillSource } from './skill-source';
export type { SkillSource, SkillLoadRecord, FileSystemSkillSourceOptions } from './skill-source';

export { FileSystemSkillRepository } from './skill-repository';
export type { SkillRepository, FileSystemSkillRepositoryOptions } from './skill-repository';
