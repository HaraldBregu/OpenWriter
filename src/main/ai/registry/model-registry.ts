/**
 * ModelRegistry — maps functional roles to model + provider configurations.
 *
 * Each role (supervisor, writer, editor, etc.) is assigned a specific provider,
 * model, and inference parameters. Agents reference a role instead of hardcoding
 * model IDs, making it trivial to swap models across all agents of a given role.
 *
 * Resolution chain (highest priority first):
 *   1. AgentTaskInput overrides (per-request)
 *   2. ModelRegistry.resolve(role) (per-role)
 *   3. ProviderResolver defaults (user's global settings)
 *
 * The registry does NOT create model instances — it returns configuration
 * objects that feed into the existing ProviderResolver → ChatModelFactory chain.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Known functional roles. Extend this union to add new roles.
 * Using a string union (not an enum) keeps the registry open for extension
 * while still providing autocomplete and type safety.
 */
export type ModelRole =
	| 'supervisor'
	| 'writer'
	| 'editor'
	| 'heavy-editor'
	| 'analyzer'
	| 'completer'
	| 'general';

/**
 * Cost tier indicator for budgeting and usage dashboards.
 * Does not affect model selection — purely informational.
 */
export type CostTier = 'economy' | 'standard' | 'premium';

/**
 * Configuration for a single functional role.
 * All fields are required in the defaults map; `Partial<ModelRoleConfig>`
 * is used for runtime overrides so callers can patch individual fields.
 */
export interface ModelRoleConfig {
	/** AI provider identifier (e.g. 'openai', 'anthropic') */
	providerId: string;
	/** Model identifier within the provider (e.g. 'gpt-4o', 'claude-sonnet-4-5-20250929') */
	modelId: string;
	/** Sampling temperature — lower = more deterministic */
	temperature: number;
	/** Maximum response tokens. Undefined = provider/model default. */
	maxTokens?: number;
	/** Human-readable description of this role's purpose */
	description: string;
	/** Cost tier for budgeting/monitoring */
	costTier: CostTier;
}

// ---------------------------------------------------------------------------
// Default role assignments
// ---------------------------------------------------------------------------

/**
 * Sensible defaults for every known role. These are used when no runtime
 * override has been applied. Edit this map to change the baseline model
 * assignments across the entire application.
 */
const DEFAULT_ROLE_ASSIGNMENTS: Record<ModelRole, ModelRoleConfig> = {
	supervisor: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0,
		description: 'Intent classification and routing — deterministic for consistent decisions',
		costTier: 'premium',
	},

	writer: {
		providerId: 'anthropic',
		modelId: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 4096,
		description: 'Creative writing, generation, and continuation',
		costTier: 'premium',
	},

	editor: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 2048,
		description: 'Light editing — grammar, tone adjustments, sentence-level rewrites',
		costTier: 'standard',
	},

	'heavy-editor': {
		providerId: 'anthropic',
		modelId: 'claude-sonnet-4-5-20250929',
		temperature: 0.3,
		maxTokens: 4096,
		description: 'Deep structural editing — reorganisation, content review, rewriting',
		costTier: 'premium',
	},

	analyzer: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.2,
		maxTokens: 2048,
		description: 'Content analysis, summarisation, and classification',
		costTier: 'standard',
	},

	completer: {
		providerId: 'openai',
		modelId: 'gpt-4o-mini',
		temperature: 0.4,
		description: 'Text and sentence completion — fast, low-cost inline suggestions',
		costTier: 'economy',
	},

	general: {
		providerId: 'openai',
		modelId: 'gpt-4o-mini',
		temperature: 0.7,
		maxTokens: 1024,
		description: 'General-purpose fallback for utility and demo agents',
		costTier: 'economy',
	},
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class ModelRegistry {
	/** Immutable baseline assignments (cloned from module-level defaults). */
	private readonly defaults: Record<ModelRole, ModelRoleConfig>;

	/** Runtime overrides applied on top of defaults. */
	private readonly overrides = new Map<ModelRole, Partial<ModelRoleConfig>>();

	constructor(defaults?: Record<ModelRole, ModelRoleConfig>) {
		// Deep-clone defaults so mutations in the registry never affect the module constant.
		this.defaults = defaults
			? structuredClone(defaults)
			: structuredClone(DEFAULT_ROLE_ASSIGNMENTS);
	}

	// -----------------------------------------------------------------------
	// Resolution
	// -----------------------------------------------------------------------

	/**
	 * Resolve the effective configuration for a role.
	 * Merges the baseline defaults with any runtime overrides.
	 *
	 * @param role  The functional role to resolve.
	 * @returns     The merged ModelRoleConfig.
	 * @throws      If the role is unknown and has no override.
	 */
	resolve(role: ModelRole): ModelRoleConfig {
		const base = this.defaults[role];
		if (!base) {
			throw new Error(`[ModelRegistry] Unknown role "${role}". Register it before resolving.`);
		}

		const patch = this.overrides.get(role);
		if (!patch) return { ...base };

		return {
			...base,
			...patch,
			// Ensure undefined patch fields don't erase base values
			providerId: patch.providerId ?? base.providerId,
			modelId: patch.modelId ?? base.modelId,
			temperature: patch.temperature ?? base.temperature,
			description: patch.description ?? base.description,
			costTier: patch.costTier ?? base.costTier,
			// maxTokens can be explicitly set to undefined to clear it
			maxTokens: 'maxTokens' in patch ? patch.maxTokens : base.maxTokens,
		};
	}

	// -----------------------------------------------------------------------
	// Overrides
	// -----------------------------------------------------------------------

	/**
	 * Apply a partial runtime override for a role.
	 * Only the supplied fields are patched; others retain their baseline values.
	 *
	 * Call with an empty object to clear the override for a role.
	 */
	override(role: ModelRole, patch: Partial<ModelRoleConfig>): void {
		if (!this.defaults[role]) {
			throw new Error(`[ModelRegistry] Cannot override unknown role "${role}".`);
		}

		if (Object.keys(patch).length === 0) {
			this.overrides.delete(role);
			return;
		}

		const existing = this.overrides.get(role) ?? {};
		this.overrides.set(role, { ...existing, ...patch });
	}

	/**
	 * Remove all runtime overrides, reverting every role to its baseline.
	 */
	resetOverrides(): void {
		this.overrides.clear();
	}

	// -----------------------------------------------------------------------
	// Queries
	// -----------------------------------------------------------------------

	/** Return the effective config for every known role. */
	list(): Record<ModelRole, ModelRoleConfig> {
		const result = {} as Record<ModelRole, ModelRoleConfig>;
		for (const role of this.roles()) {
			result[role] = this.resolve(role);
		}
		return result;
	}

	/** Return all known role names. */
	roles(): ModelRole[] {
		return Object.keys(this.defaults) as ModelRole[];
	}

	/** Check whether a role is registered. */
	has(role: string): role is ModelRole {
		return role in this.defaults;
	}

	// -----------------------------------------------------------------------
	// Serialisation (for IPC / settings persistence)
	// -----------------------------------------------------------------------

	/**
	 * Export the current overrides as a plain object suitable for
	 * JSON serialisation (e.g. persisting to settings.json).
	 */
	exportOverrides(): Record<string, Partial<ModelRoleConfig>> {
		const out: Record<string, Partial<ModelRoleConfig>> = {};
		for (const [role, patch] of this.overrides) {
			out[role] = { ...patch };
		}
		return out;
	}

	/**
	 * Import previously exported overrides (e.g. loaded from settings.json).
	 * Replaces all current overrides.
	 */
	importOverrides(data: Record<string, Partial<ModelRoleConfig>>): void {
		this.overrides.clear();
		for (const [role, patch] of Object.entries(data)) {
			if (this.has(role)) {
				this.overrides.set(role, patch);
			}
		}
	}
}
