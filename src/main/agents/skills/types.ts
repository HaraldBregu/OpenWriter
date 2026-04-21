/**
 * Skills — portable, self-contained workflows an agent can follow.
 *
 * A skill bundles a name, a selection description (how the agent decides
 * whether it applies), and a body of instructions the agent can load when
 * chosen. Skills are registered once and surfaced to agents via the
 * available-skills prompt; the agent then "reads" the skill body on demand.
 *
 * Inspired by OpenClaw's skill catalog (docs/ANALYSIS_AGENTS_SKILLS_TOOLS.md),
 * trimmed to what the OpenWriter assistant needs.
 */

export type SkillScope = 'bundled' | 'user' | 'plugin';

export interface SkillMetadata {
	readonly emoji?: string;
	readonly homepage?: string;
	readonly skillKey?: string;
	readonly primaryEnv?: string;
	readonly requires?: {
		readonly bins?: readonly string[];
		readonly env?: readonly string[];
	};
	readonly tags?: readonly string[];
}

export interface SkillExposure {
	readonly includeInAvailableSkillsPrompt: boolean;
	readonly userInvocable: boolean;
	readonly disableModelInvocation: boolean;
}

export interface Skill {
	readonly name: string;
	readonly description: string;
	readonly instructions: string;
	readonly scope: SkillScope;
	readonly filePath?: string;
	readonly metadata?: SkillMetadata;
	readonly exposure?: SkillExposure;
	readonly tools?: readonly string[];
}

export interface SkillEntry {
	readonly skill: Skill;
	readonly frontmatter?: Record<string, unknown>;
}

export interface SkillSnapshot {
	readonly prompt: string;
	readonly skills: ReadonlyArray<{
		readonly name: string;
		readonly description: string;
		readonly scope: SkillScope;
	}>;
}
