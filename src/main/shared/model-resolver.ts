import type { ModelInfo } from '../../shared/types';
import { AI_MODELS } from '../../shared/models';
import { DEFAULT_TEXT_MODEL_ID } from '../../shared/types';

/**
 * ModelResolver -- resolves a ModelInfo entry from the catalogue by modelId.
 *
 * Falls back to DEFAULT_TEXT_MODEL_ID when no modelId is provided.
 */
export class ModelResolver {
	/**
	 * Resolve a catalogue ModelInfo entry.
	 *
	 * @param options - Optional modelId (falls back to DEFAULT_TEXT_MODEL_ID)
	 * @returns The resolved ModelInfo
	 * @throws Error if the requested modelId is not found in the catalogue
	 */
	resolve(options?: { modelId?: string }): ModelInfo {
		const modelId = options?.modelId?.trim() || DEFAULT_TEXT_MODEL_ID;
		const found = AI_MODELS.find((m) => m.modelId === modelId);
		if (!found) {
			throw new Error(`Unknown model: "${modelId}"`);
		}
		return found;
	}
}
