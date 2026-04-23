import { readFile } from 'node:fs/promises';
import type { TextGeneratorV2SkillIdEntry } from './types';

export class SkillRegistry {
	private readonly map = new Map<string, string>();

	static fromMap(mapping: Record<string, string>): SkillRegistry {
		const registry = new SkillRegistry();
		for (const [name, skillId] of Object.entries(mapping)) registry.set(name, skillId);
		return registry;
	}

	static async fromFile(filePath: string): Promise<SkillRegistry> {
		const raw = await readFile(filePath, 'utf-8');
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(`SkillRegistry: ${filePath} must contain a JSON object`);
		}

		const mapping: Record<string, string> = {};
		for (const [name, skillId] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof skillId !== 'string' || !skillId.trim()) {
				throw new Error(`SkillRegistry: value for "${name}" must be a non-empty string`);
			}
			mapping[name] = skillId;
		}

		return SkillRegistry.fromMap(mapping);
	}

	set(name: string, skillId: string): void {
		if (!name.trim()) throw new Error('SkillRegistry: name must be non-empty');
		if (!skillId.trim()) throw new Error('SkillRegistry: skillId must be non-empty');
		this.map.set(name, skillId);
	}

	get(name: string): string | undefined {
		return this.map.get(name);
	}

	list(): TextGeneratorV2SkillIdEntry[] {
		return Array.from(this.map.entries()).map(([name, skillId]) => ({ name, skillId }));
	}
}

