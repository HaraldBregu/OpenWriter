/**
 * Skills — packaged workflows an agent can select and follow.
 *
 * Mirrors OpenClaw's agent/skills/tools triad (see
 * docs/ANALYSIS_AGENTS_SKILLS_TOOLS.md): agents = runtime, tools =
 * executable capabilities, skills = portable instruction bundles the
 * model can load when a task matches.
 *
 * This module ships a small bundled catalog (outline, rewrite,
 * summarize, expand, illustrate) and a loader that can parse external
 * SKILL.md files at runtime for future user-space extensions.
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
export { parseSkillMarkdown, loadSkillsFromDir } from './skill-loader';
export {
	bundledSkills,
	outlineSkill,
	rewriteSkill,
	summarizeSkill,
	expandSkill,
	illustrateSkill,
} from './bundled';

import { SkillRegistry } from './skill-registry';
import { bundledSkills } from './bundled';

/**
 * Build a SkillRegistry pre-populated with the bundled catalog. Call
 * this once at startup and pass the registry into the assistant agent.
 */
export function createDefaultSkillRegistry(): SkillRegistry {
	const registry = new SkillRegistry();
	registry.registerMany(bundledSkills);
	return registry;
}
