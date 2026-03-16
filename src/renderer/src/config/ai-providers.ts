// ---------------------------------------------------------------------------
// Re-exports from shared model constants — kept for backward compatibility.
// Prefer importing directly from '../../../shared/model-constants'.
// ---------------------------------------------------------------------------

import { getProvidersForDisplay } from '../../../shared/model-constants';
import type { ProviderDescriptor, ModelDescriptor } from '../../../shared/model-constants';

export type AIProvider = ProviderDescriptor;
export type ModelOption = ModelDescriptor;

export const aiProviders: readonly ProviderDescriptor[] = getProvidersForDisplay();
