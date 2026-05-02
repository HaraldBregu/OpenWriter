import type { Provider, ProviderId } from './types';
export declare const OPENAI: {
    readonly id: "openai";
    readonly name: "OpenAI";
    readonly apiKey: "";
};
export declare const ANTHROPIC: {
    readonly id: "anthropic";
    readonly name: "Anthropic";
    readonly apiKey: "";
};
export declare const PROVIDER_CATALOGUE: readonly Provider[];
export declare const PROVIDER_IDS: readonly ProviderId[];
/** Look up a provider by ID. */
export declare function getProvider(providerId: string): Provider | undefined;
/** Get all providers for UI display. */
export declare function getProvidersForDisplay(): readonly Provider[];
/** Returns `true` if the provider ID is in the catalogue. */
export declare function isKnownProvider(providerId: string): providerId is ProviderId;
