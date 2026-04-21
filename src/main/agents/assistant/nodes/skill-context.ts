import type { Skill } from '../../skills';
import { SkillRegistry, renderSkillInstructions, buildSkillsPrompt } from '../../skills';

/**
 * Build a SkillRegistry from the input.skills array. Duplicates are dropped
 * with the first occurrence winning; invalid entries are skipped silently
 * so a broken skill cannot break the assistant's startup.
 */
export function buildSkillRegistry(skills: readonly Skill[] | undefined): SkillRegistry {
	const registry = new SkillRegistry();
	if (!skills) return registry;
	for (const skill of skills) {
		if (!skill?.name) continue;
		if (registry.has(skill.name)) continue;
		registry.register(skill);
	}
	return registry;
}

export function renderSkillsCatalogSection(registry: SkillRegistry): string {
	const visible = registry.listVisible();
	if (visible.length === 0) return '';
	return buildSkillsPrompt(visible);
}

export function renderSkillSection(skill: Skill): string {
	return [
		'',
		'<active_skill>',
		renderSkillInstructions(skill).trim(),
		'</active_skill>',
		'',
	].join('\n');
}

/** Wrap untrusted content (file contents, web text) with a parser fence. */
export function fenceUntrusted(label: string, body: string): string {
	return `<untrusted source="${escapeAttr(label)}">\n${body}\n</untrusted>`;
}

function escapeAttr(value: string): string {
	return value.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
