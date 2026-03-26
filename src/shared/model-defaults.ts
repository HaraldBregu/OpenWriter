// ---------------------------------------------------------------------------
// Shared Model Configuration Types & Defaults
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

export interface ModelConfig {
	id: string;
	provider: string;
	model: string;
	apikey: string;
	baseurl: string;
	default: boolean;
}

export const DEFAULT_MODELS: readonly ModelConfig[] = [
	{ id: 'preset-claude-opus', provider: 'anthropic', model: 'claude-opus-4-6', apikey: '', baseurl: '', default: false },
	{ id: 'preset-claude-sonnet', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', apikey: '', baseurl: '', default: false },
	{ id: 'preset-claude-haiku', provider: 'anthropic', model: 'claude-haiku-4-5-20251001', apikey: '', baseurl: '', default: false },
	{ id: 'preset-gpt-4o', provider: 'openai', model: 'gpt-4o', apikey: '', baseurl: '', default: true },
	{ id: 'preset-gpt-4o-mini', provider: 'openai', model: 'gpt-4o-mini', apikey: '', baseurl: '', default: false },
	{ id: 'preset-o1', provider: 'openai', model: 'o1', apikey: '', baseurl: '', default: false },
	{ id: 'preset-gemini-flash', provider: 'google', model: 'gemini-2-0-flash', apikey: '', baseurl: '', default: false },
	{ id: 'preset-gemini-pro', provider: 'google', model: 'gemini-2-0-pro', apikey: '', baseurl: '', default: false },
	{ id: 'preset-mistral-large', provider: 'mistral', model: 'mistral-large-2', apikey: '', baseurl: '', default: false },
] as const;
