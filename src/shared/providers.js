// ---------------------------------------------------------------------------
// Shared AI Provider Constants — Provider Catalogue & lookup helpers
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------
import { PROVIDERS } from './types';
// ---------------------------------------------------------------------------
// Provider constants — sourced from PROVIDERS tuple in ./types
// ---------------------------------------------------------------------------
const findProvider = (id) => PROVIDERS.find((p) => p.id === id);
export const OPENAI = findProvider('openai');
export const ANTHROPIC = findProvider('anthropic');
// ---------------------------------------------------------------------------
// Provider catalogue
// ---------------------------------------------------------------------------
export const PROVIDER_CATALOGUE = PROVIDERS;
export const PROVIDER_IDS = PROVIDERS.map((p) => p.id);
// ---------------------------------------------------------------------------
// Derived lookup map (built once at module load)
// ---------------------------------------------------------------------------
const PROVIDER_MAP = Object.fromEntries(PROVIDER_CATALOGUE.map((p) => [p.id, p]));
// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------
/** Look up a provider by ID. */
export function getProvider(providerId) {
    return PROVIDER_MAP[providerId];
}
/** Get all providers for UI display. */
export function getProvidersForDisplay() {
    return PROVIDER_CATALOGUE;
}
/** Returns `true` if the provider ID is in the catalogue. */
export function isKnownProvider(providerId) {
    return providerId in PROVIDER_MAP;
}
