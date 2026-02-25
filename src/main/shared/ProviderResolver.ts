import type { StoreService } from '../services/store'

/**
 * Resolved provider configuration.
 * Result of resolving a provider ID and model ID through multiple fallback sources.
 */
export interface ResolvedProvider {
  /** API key for authentication with the provider */
  apiKey: string
  /** Model name/ID to use */
  modelName: string
  /** Provider ID (e.g., 'openai', 'anthropic', etc.) */
  providerId: string
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
 * Resolution order:
 *   - Provider ID: input.providerId → 'openai' (default)
 *   - API Key: storeService.getModelSettings(providerId).apiToken → VITE_OPENAI_API_KEY env var
 *   - Model: input.modelId → storeService.getModelSettings().selectedModel → VITE_OPENAI_MODEL → 'gpt-4o-mini'
 *
 * Validates that an API key exists and is not the placeholder default.
 *
 * Benefits:
 *   - Single source of truth for provider resolution
 *   - Adding support for new providers only requires updates here
 *   - Eliminates ~70 lines of duplicate code across 4 files
 */
export class ProviderResolver {
  private readonly DEFAULT_PROVIDER = 'openai'
  private readonly DEFAULT_MODEL = 'gpt-4o-mini'
  private readonly PLACEHOLDER_API_KEY = 'your-openai-api-key-here'

  constructor(private readonly storeService: StoreService) {}

  /**
   * Resolve provider configuration from multiple fallback sources.
   *
   * @param options - Optional provider and model overrides
   * @returns Resolved provider configuration
   * @throws Error if no valid API key is configured
   */
  resolve(options?: { providerId?: string; modelId?: string }): ResolvedProvider {
    // Resolve provider ID
    const providerId = options?.providerId || this.DEFAULT_PROVIDER

    // Fetch settings for this provider
    const settings = this.storeService.getModelSettings(providerId)

    // Resolve API key with fallback to environment variable
    const apiKey = settings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY

    // Validate API key
    if (!apiKey || apiKey === this.PLACEHOLDER_API_KEY) {
      throw new Error(
        `No API key configured for provider "${providerId}". ` +
          'Please configure your API key in Settings or set the VITE_OPENAI_API_KEY environment variable.'
      )
    }

    // Resolve model name with fallback to environment variable and default
    const modelName =
      options?.modelId ||
      settings?.selectedModel ||
      import.meta.env.VITE_OPENAI_MODEL ||
      this.DEFAULT_MODEL

    return { apiKey, modelName, providerId }
  }

  /**
   * Get the default provider ID.
   */
  getDefaultProviderId(): string {
    return this.DEFAULT_PROVIDER
  }

  /**
   * Get the default model name.
   */
  getDefaultModelName(): string {
    return this.DEFAULT_MODEL
  }
}
