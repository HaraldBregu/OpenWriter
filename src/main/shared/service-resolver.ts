import type { Service } from '../../shared/types';
import type { StoreService } from '../services/store';

/**
 * ServiceResolver -- resolves a configured Service (provider + apiKey) from StoreService.
 *
 * Resolution order (first match wins):
 *   1. Exact match by providerId
 *   2. First configured service in StoreService
 *
 * Validates that an API key exists for the resolved service.
 */
export class ServiceResolver {
	constructor(private readonly storeService: StoreService) {}

	/**
	 * Resolve a Service from StoreService with fallback chain.
	 *
	 * @param options - Optional providerId override
	 * @returns The resolved Service
	 * @throws Error if no services are configured or no API key is set
	 */
	resolve(options?: { providerId?: string }): Service {
		const providerId = options?.providerId?.trim();

		const found = providerId
			? this.storeService.getServiceByProviderId(providerId)
			: this.storeService.getServices()[0];

		if (!found) {
			throw new Error('No services configured. Please add a service in the Providers page.');
		}

		const apiKey = found.apiKey.trim();

		if (!apiKey) {
			throw new Error(
				`No API key configured for provider "${found.provider.name}". ` +
					'Please configure the API key in the Providers page.'
			);
		}

		return { provider: found.provider, apiKey };
	}
}
