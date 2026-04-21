import type { Skill } from './types';
import { SkillNotFoundError } from './skill-errors';

/**
 * SkillRegistry — name-to-skill map, parallel to AgentRegistry.
 *
 * Registry is the single source of truth the assistant queries before
 * building the available-skills prompt or invoking a chosen skill.
 */
export class SkillRegistry {
	private readonly skills = new Map<string, Skill>();

	register(skill: Skill): void {
		if (this.skills.has(skill.name)) {
			throw new Error(`Skill already registered: ${skill.name}`);
		}
		this.skills.set(skill.name, skill);
	}

	registerMany(skills: Iterable<Skill>): void {
		for (const skill of skills) this.register(skill);
	}

	get(name: string): Skill {
		const skill = this.skills.get(name);
		if (!skill) throw new SkillNotFoundError(name);
		return skill;
	}

	has(name: string): boolean {
		return this.skills.has(name);
	}

	list(): Skill[] {
		return Array.from(this.skills.values());
	}

	listVisible(): Skill[] {
		return this.list().filter(
			(s) => s.exposure?.includeInAvailableSkillsPrompt !== false
		);
	}

	listNames(): string[] {
		return Array.from(this.skills.keys());
	}

	filter(predicate: (skill: Skill) => boolean): Skill[] {
		return this.list().filter(predicate);
	}

	clear(): void {
		this.skills.clear();
	}
}
