import { readFile } from 'node:fs/promises';
import type { TextGeneratorV1SkillIdEntry } from './types';

/**
 * SkillIdRegistry — maps skill NAME → uploaded skill_id.
 *
 * Separate from the in-process `SkillRegistry` (which holds local Skill objects).
 * This registry holds only the name→id mapping needed to reference uploaded
 * skills via `{ type: 'skill_reference', skill_id }` in a Responses API call.
 *
 * Sources:
 *   - inline map via `fromMap({...})`
 *   - JSON file via `fromFile(path)` with shape `{ "skill-name": "skill_..." }`
 */
export class SkillIdRegistry {
	private readonly map = new Map<string, string>();

	static fromMap(mapping: Record<string, string>): SkillIdRegistry {
		const registry = new SkillIdRegistry();
		for (const [name, id] of Object.entries(mapping)) registry.set(name, id);
		return registry;
	}

	static async fromFile(filePath: string): Promise<SkillIdRegistry> {
		const raw = await readFile(filePath, 'utf-8');
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(`SkillIdRegistry: ${filePath} must contain a JSON object`);
		}
		const mapping: Record<string, string> = {};
		for (const [name, id] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof id !== 'string' || !id.trim()) {
				throw new Error(`SkillIdRegistry: value for "${name}" must be a non-empty string`);
			}
			mapping[name] = id;
		}
		return SkillIdRegistry.fromMap(mapping);
	}

	set(name: string, skillId: string): void {
		if (!name.trim()) throw new Error('SkillIdRegistry: name must be non-empty');
		if (!skillId.trim()) throw new Error('SkillIdRegistry: skillId must be non-empty');
		this.map.set(name, skillId);
	}

	get(name: string): string | undefined {
		return this.map.get(name);
	}

	has(name: string): boolean {
		return this.map.has(name);
	}

	list(): TextGeneratorV1SkillIdEntry[] {
		return Array.from(this.map.entries()).map(([name, skillId]) => ({ name, skillId }));
	}

	size(): number {
		return this.map.size;
	}
}
