import type { Skill, SkillSnapshot } from './types';

/**
 * Build the available-skills prompt fragment.
 *
 * Shape mirrors OpenClaw's XML-flavored formatter so models trained on
 * agent-skill catalogs decode it cleanly. The body of each skill is
 * surfaced on demand — the assistant sees names + descriptions here and
 * asks for the full skill instructions only when selecting one.
 */
export function buildSkillsPrompt(skills: readonly Skill[]): string {
	if (skills.length === 0) return '';

	const lines: string[] = [
		'',
		'The following skills provide specialized instructions for specific tasks.',
		'When a task matches a skill, load its instructions and follow them.',
		'',
		'<available_skills>',
	];
	for (const skill of skills) {
		lines.push('  <skill>');
		lines.push(`    <name>${escapeXml(skill.name)}</name>`);
		lines.push(`    <description>${escapeXml(skill.description)}</description>`);
		if (skill.filePath) {
			lines.push(`    <location>${escapeXml(skill.filePath)}</location>`);
		}
		lines.push('  </skill>');
	}
	lines.push('</available_skills>');
	return lines.join('\n');
}

export function buildSkillsSnapshot(skills: readonly Skill[]): SkillSnapshot {
	return {
		prompt: buildSkillsPrompt(skills),
		skills: skills.map((s) => ({
			name: s.name,
			description: s.description,
			scope: s.scope,
		})),
	};
}

/**
 * Render a single skill's full instructions for injection into a worker
 * node's system/user prompt once the controller has selected it.
 */
export function renderSkillInstructions(skill: Skill): string {
	const header = `# Skill: ${skill.name}\n\n${skill.description}\n`;
	return `${header}\n${skill.instructions.trim()}\n`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
