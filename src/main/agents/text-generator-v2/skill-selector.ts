import type { TextGeneratorV2Intent, TextGeneratorV2IntentClassification } from './types';

export function selectSkills(classification: TextGeneratorV2IntentClassification): string[] {
	const { intent, style } = classification;

	switch (intent) {
		case 'continue':
			return ['creative-writing'];
		case 'edit':
			return ['anti-slop'];
		case 'rewrite':
			return [pickRewriteSkill(style)];
		case 'summarize':
			return ['summarize'];
		case 'analyze':
			return ['fact-check'];
		default:
			return assertUnreachable(intent);
	}
}

export function resolveSkillIds(
	names: string[],
	lookup: (name: string) => string | undefined
): { names: string[]; ids: string[]; missing: string[] } {
	const resolvedNames: string[] = [];
	const ids: string[] = [];
	const missing: string[] = [];

	for (const name of names) {
		const skillId = lookup(name);
		if (skillId) {
			resolvedNames.push(name);
			ids.push(skillId);
		} else {
			missing.push(name);
		}
	}

	return { names: resolvedNames, ids, missing };
}

function pickRewriteSkill(style: string | undefined): string {
	if (!style) return 'blog-style';

	const normalized = style.toLowerCase();
	if (
		normalized.includes('academ') ||
		normalized.includes('scholar') ||
		normalized.includes('formal')
	) {
		return 'academic-paper';
	}

	return 'blog-style';
}

function assertUnreachable(intent: TextGeneratorV2Intent): never {
	throw new Error(`selectSkills: unhandled intent ${intent}`);
}

