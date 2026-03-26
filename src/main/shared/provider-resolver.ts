import type { StoreService } from '../services/store';

/**
 * Resolved provider configuration.
 * Result of resolving a provider ID and model ID through the model list.
 */
export interface ResolvedProvider {
	/** API key for authentication with the provider */
	apiKey: string;
	/** Model name/ID to use */
	modelName: string;
	/** Provider ID (e.g., 'openai', 'anthropic', etc.) */
	providerId: string;
	/** Optional base URL override for the provider's API */
	baseUrl?: string;
}

/**
 * ProviderResolver -- Strategy pattern for AI provider configuration resolution.
 *
 * Consolidates provider/model resolution logic used by:
 *   - ChatAgent
 *   - EnhanceAgent
 *   - AIChatHandler
 *   - AIEnhanceHandler
 *
 * Resolution order (first match wins):
 *   1. Exact match by provider + model
 *   2. First model matching provider
 *   3. Default model (ModelConfig.default === true)
 *   4. First available model in the list
 *
 * Validates that an API key exists and is not the placeholder default.
 */
export class ProviderResolver {
	private readonly PLACEHOLDER_API_KEY = 'your-openai-api-key-here';
	private readonly DEFAULT_MODEL = 'gpt-4o-mini';

	constructor(private readonly storeService: StoreService) {}

	/**
	 * Resolve provider configuration from the model list with fallback chain.
	 *
	 * @param options - Optional provider and model overrides
	 * @returns Resolved provider configuration
	 * @throws Error if no models are configured or no API key is set
	 */
	resolve(options?: { providerId?: string; modelId?: string }): ResolvedProvider {
		const models = this.storeService.getModels();

		// Try exact match by provider + model
		let found =
			options?.providerId && options?.modelId
				? models.find((m) => m.provider === options.providerId && m.model === options.modelId)
				: undefined;

		// Try match by provider only
		if (!found && options?.providerId) {
			found = models.find((m) => m.provider === options.providerId);
		}

		// Fall back to default model
		if (!found) {
			found = models.find((m) => m.default);
		}

		// Fall back to first available model
		if (!found) {
			found = models[0];
		}

		if (!found) {
			throw new Error('No models configured. Please add a model in the Models page.');
		}

		const apiKey = found.apikey || import.meta.env.VITE_OPENAI_API_KEY;

		if (!apiKey || apiKey === this.PLACEHOLDER_API_KEY) {
			throw new Error(
				`No API key configured for model "${found.model}" (${found.provider}). ` +
					'Please configure the API key in the Models page.'
			);
		}

		const modelName = options?.modelId || found.model;

		return {
			apiKey,
			modelName,
			providerId: found.provider,
			baseUrl: found.baseurl || undefined,
		};
	}
}
