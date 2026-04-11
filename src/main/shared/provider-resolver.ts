import type { StoreService } from '../services/store';

/**
 * Resolved provider configuration.
 * Result of resolving a provider ID and model ID through stored provider settings.
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
 *   1. Exact match by provider
 *   2. First configured provider in StoreService
 *
 * Validates that an API key exists in StoreService.
 */
export class ProviderResolver {
	private readonly DEFAULT_MODEL = 'gpt-4o-mini';

	constructor(private readonly storeService: StoreService) {}

	/**
	 * Resolve provider configuration from StoreService with fallback chain.
	 *
	 * @param options - Optional provider and model overrides
	 * @returns Resolved provider configuration
	 * @throws Error if no providers are configured or no API key is set
	 */
	resolve(options?: { providerId?: string; modelId?: string }): ResolvedProvider {
		const providerId = options?.providerId?.trim();

		const found = providerId
			? this.storeService.getServiceByProviderId(providerId)
			: this.storeService.getFirstService();

		if (!found) {
			throw new Error('No providers configured. Please add a provider in the Providers page.');
		}

		const apiKey = found.apikey.trim();

		if (!apiKey) {
			throw new Error(
				`No API key configured for provider "${found.name}". ` +
					'Please configure the API key in the Providers page.'
			);
		}

		const modelName = options?.modelId || import.meta.env.VITE_OPENAI_MODEL || this.DEFAULT_MODEL;

		return {
			apiKey,
			modelName,
			providerId: found.name,
			baseUrl: found.baseurl || undefined,
		};
	}
}
