import type { Skill } from '../types';

export const summarizeSkill: Skill = {
	name: 'summarize',
	description:
		'Condense long content into a shorter summary at a target length (bullet list, TL;DR, abstract, executive summary). Use when the user asks for a recap, digest, or shorter version.',
	scope: 'bundled',
	metadata: { emoji: '📝', tags: ['editing', 'compression'] },
	tools: ['read', 'edit', 'write'],
	instructions: [
		'## Summarize Skill',
		'',
		'Produce a faithful summary of the source text at the requested length and format.',
		'',
		'### Length targets',
		'- `tldr`: 1–2 sentences.',
		'- `bullets`: 3–7 bullet points, each one line.',
		'- `abstract`: 1 paragraph, 80–150 words, no bullets.',
		'- `executive`: 3 paragraphs: context, findings, recommendation.',
		'',
		'### Rules',
		'- Cover only what the source actually says — no speculation, no added context.',
		'- Preserve key numbers, names, and dates verbatim.',
		'- Prefer active voice and strong verbs.',
		'- Never quote more than a short phrase; paraphrase the rest.',
		'',
		'### Workflow',
		'1. `read` the source section of `content.md`.',
		'2. Write the summary inline (via `edit`) or to a new section header "## Summary" (via `write`), based on the instruction.',
	].join('\n'),
};
