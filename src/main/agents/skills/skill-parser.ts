import matter from 'gray-matter';
import type { Skill, SkillMetadata, SkillScope } from './types';
import { SkillLoadError, SkillValidationError } from './skill-errors';

/**
 * SkillParser — factory for building Skill domain objects from SKILL.md
 * source content. Pure, synchronous, no I/O. Callers (sources, repositories)
 * feed it raw markdown; it returns a fully-validated Skill or throws a
 * typed error.
 *
 * Keeping the parser pure means alternate Sources (in-memory, network,
 * archive) can reuse it without dragging in filesystem concerns.
 */
export interface ParsedSkill {
	readonly skill: Skill;
	readonly frontmatter: Record<string, unknown>;
}

export interface ParseSkillOptions {
	readonly scope?: SkillScope;
	readonly filePath?: string;
	readonly fallbackName?: string;
}

export class SkillParser {
	static parse(source: string, options: ParseSkillOptions = {}): ParsedSkill {
		const { scope = 'user', filePath, fallbackName } = options;

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
		const resolvedScope = resolveScope(metadata, scope);

		const skill: Skill = {
			name,
			description,
			instructions,
			scope: resolvedScope,
			filePath,
			metadata,
			tools: tools.length > 0 ? tools : undefined,
		};
		return { skill, frontmatter };
	}
}

function resolveScope(metadata: SkillMetadata | undefined, fallback: SkillScope): SkillScope {
	const raw = (metadata as { readonly scope?: unknown } | undefined)?.scope;
	if (raw === 'bundled' || raw === 'user' || raw === 'plugin') return raw;
	return fallback;
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

	const scopeRaw = readString(block.scope);
	const scope: SkillScope | undefined =
		scopeRaw === 'bundled' || scopeRaw === 'user' || scopeRaw === 'plugin' ? scopeRaw : undefined;

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
		...(scope ? { scope } : {}),
	} as SkillMetadata;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}
