import type { TextGeneratorV1Intent, TextGeneratorV1IntentClassification } from './types';

/**
 * Rule-based skill selector.
 *
 * Deterministic map per spec — the LLM does NOT pick skills, the code does.
 * Unknown intents fall back to an empty list (model runs without skills).
 *
 * "rewrite" considers style hint to choose between academic-paper and blog-style.
 */
export function selectSkills(
	classification: TextGeneratorV1IntentClassification
): string[] {
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

function pickRewriteSkill(style: string | undefined): string {
	if (!style) return 'blog-style';
	const lower = style.toLowerCase();
	if (lower.includes('academ') || lower.includes('scholar') || lower.includes('formal')) {
		return 'academic-paper';
	}
	return 'blog-style';
}

/** Map skill names → skill_ids via registry lookup. Missing names are dropped. */
export function resolveSkillIds(
	names: string[],
	lookup: (name: string) => string | undefined
): { names: string[]; ids: string[]; missing: string[] } {
	const ids: string[] = [];
	const resolvedNames: string[] = [];
	const missing: string[] = [];
	for (const name of names) {
		const id = lookup(name);
		if (id) {
			ids.push(id);
			resolvedNames.push(name);
		} else {
			missing.push(name);
		}
	}
	return { names: resolvedNames, ids, missing };
}

function assertUnreachable(_: TextGeneratorV1Intent): never {
	throw new Error(`selectSkills: unhandled intent ${_}`);
}
