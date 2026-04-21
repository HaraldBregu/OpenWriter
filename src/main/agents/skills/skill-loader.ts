import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Skill, SkillMetadata, SkillScope } from './types';
import { SkillLoadError, SkillValidationError } from './skill-errors';

interface ParsedSkillFile {
	readonly skill: Skill;
	readonly frontmatter: Record<string, unknown>;
}

/**
 * Parse a single SKILL.md source string.
 *
 * Frontmatter layout mirrors OpenClaw: top-level `name` / `description`,
 * optional `metadata.openwriter` (or `metadata.openclaw`) block for
 * emoji, required binaries, and other runtime hints.
 */
export function parseSkillMarkdown(
	source: string,
	options: {
		readonly scope?: SkillScope;
		readonly filePath?: string;
		readonly fallbackName?: string;
	} = {}
): ParsedSkillFile {
	const { scope = 'bundled', filePath, fallbackName } = options;

	let parsed: matter.GrayMatterFile<string>;
	try {
		parsed = matter(source);
	} catch (cause) {
		throw new SkillLoadError(fallbackName ?? '(unknown)', 'invalid frontmatter', cause);
	}

	const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
	const name = readString(frontmatter.name) ?? fallbackName?.trim();
	const description = readString(frontmatter.description);
	const instructions = parsed.content.trim();

	if (!name) {
		throw new SkillValidationError(fallbackName ?? '(unknown)', 'skill name required');
	}
	if (!description) {
		throw new SkillValidationError(name, 'skill description required');
	}
	if (!instructions) {
		throw new SkillValidationError(name, 'skill body required');
	}

	const metadata = resolveMetadata(frontmatter);
	const tools = readStringList(frontmatter.tools);

	const skill: Skill = {
		name,
		description,
		instructions,
		scope,
		filePath,
		metadata,
		tools: tools.length > 0 ? tools : undefined,
	};
	return { skill, frontmatter };
}

/**
 * Load every `<dir>/<name>/SKILL.md` under a root directory into a list
 * of Skill objects. Silently skips unreadable or malformed entries
 * (with an onError callback for diagnostics).
 */
export function loadSkillsFromDir(
	rootDir: string,
	options: {
		readonly scope?: SkillScope;
		readonly onError?: (name: string, error: unknown) => void;
	} = {}
): Skill[] {
	const { scope = 'user', onError } = options;
	if (!fs.existsSync(rootDir)) return [];

	const entries = fs.readdirSync(rootDir, { withFileTypes: true });
	const skills: Skill[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const skillDir = path.join(rootDir, entry.name);
		const filePath = path.join(skillDir, 'SKILL.md');
		if (!fs.existsSync(filePath)) continue;

		try {
			const source = fs.readFileSync(filePath, 'utf8');
			const { skill } = parseSkillMarkdown(source, {
				scope,
				filePath,
				fallbackName: entry.name,
			});
			skills.push(skill);
		} catch (error) {
			onError?.(entry.name, error);
		}
	}
	return skills;
}

function resolveMetadata(frontmatter: Record<string, unknown>): SkillMetadata | undefined {
	const metadataRoot = frontmatter.metadata;
	if (!metadataRoot || typeof metadataRoot !== 'object') return undefined;
	const rootRecord = metadataRoot as Record<string, unknown>;
	const block = (rootRecord.openwriter ?? rootRecord.openclaw) as
		| Record<string, unknown>
		| undefined;
	if (!block || typeof block !== 'object') return undefined;

	const requiresRaw = block.requires as Record<string, unknown> | undefined;
	const requires = requiresRaw
		? {
				bins: readStringList(requiresRaw.bins),
				env: readStringList(requiresRaw.env),
			}
		: undefined;

	return {
		emoji: readString(block.emoji),
		homepage: readString(block.homepage),
		skillKey: readString(block.skillKey),
		primaryEnv: readString(block.primaryEnv),
		tags: readStringList(block.tags),
		requires:
			requires && ((requires.bins?.length ?? 0) > 0 || (requires.env?.length ?? 0) > 0)
				? requires
				: undefined,
	};
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}
