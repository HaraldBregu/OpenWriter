import { getProvidersForDisplay } from './provider-constants';
import type { ProviderDescriptor, ModelDescriptor } from './provider-constants';

export type AIProvider = ProviderDescriptor;
export type ModelOption = ModelDescriptor;

export const aiProviders: readonly ProviderDescriptor[] = getProvidersForDisplay();
