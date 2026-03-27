// ---------------------------------------------------------------------------
// Re-exports from shared model constants — kept for backward compatibility.
// Prefer importing directly from '../../../shared/provider-constants'.
// ---------------------------------------------------------------------------

import { getProvidersForDisplay } from '../../../shared/provider-constants';
import type { ProviderDescriptor, ModelDescriptor } from '../../../shared/provider-constants';

export type AIProvider = ProviderDescriptor;
export type ModelOption = ModelDescriptor;

export const aiProviders: readonly ProviderDescriptor[] = getProvidersForDisplay();
