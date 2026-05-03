/**
 * Input validators for preventing injection attacks and malformed data.
 * Used by AppIpc (store handlers) to validate user inputs.
 */

import type { AgentSettings, Channel, Provider } from '../../shared/types';
import { isKnownChannelType } from '../../shared/types';
import { isKnownProvider } from '../../shared/providers';

export class StoreValidators {
	private static readonly MAX_TOKEN_LENGTH = 500;
	private static readonly MAX_FIELD_LENGTH = 200;
	private static readonly DANGEROUS_CHARS = /[<>;"'`]/;

	static validateProviderId(id: string): void {
		if (typeof id !== 'string' || id.trim().length === 0) {
			throw new Error('Provider id must be a non-empty string');
		}
		if (id.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Provider id exceeds maximum length');
		}
	}

	static validateProvider(provider: Provider): void {
		if (typeof provider !== 'object' || provider === null) {
			throw new Error('Provider must be an object');
		}
		if (typeof provider.id !== 'string' || provider.id.trim().length === 0) {
			throw new Error('Provider id is required');
		}
		if (provider.id.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Provider id exceeds maximum length');
		}
		if (!isKnownProvider(provider.id)) {
			throw new Error(`Unknown provider: ${provider.id}`);
		}
		if (typeof provider.name !== 'string' || provider.name.trim().length === 0) {
			throw new Error('Provider name is required');
		}
		if (provider.name.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Provider name exceeds maximum length');
		}

		const { apiKey } = provider;
		if (typeof apiKey !== 'string') {
			throw new Error('Provider apiKey must be a string');
		}
		if (apiKey.length > this.MAX_TOKEN_LENGTH) {
			throw new Error(`API key exceeds maximum length of ${this.MAX_TOKEN_LENGTH} characters`);
		}
		if (apiKey.length > 0 && this.DANGEROUS_CHARS.test(apiKey)) {
			throw new Error('API key contains invalid characters');
		}
	}

	static validateProviders(providers: Provider[]): void {
		if (!Array.isArray(providers)) {
			throw new Error('Providers must be an array');
		}
		providers.forEach((provider) => this.validateProvider(provider));
	}

	static validateAgentName(agentName: string): void {
		if (typeof agentName !== 'string' || agentName.trim().length === 0) {
			throw new Error('Agent name must be a non-empty string');
		}
		if (agentName.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Agent name exceeds maximum length');
		}
	}

	static validateAgentSettings(agent: AgentSettings): void {
		if (typeof agent !== 'object' || agent === null) {
			throw new Error('Agent settings must be an object');
		}
		if (typeof agent.id !== 'string' || agent.id.trim().length === 0) {
			throw new Error('Agent ID must be a non-empty string');
		}
		if (agent.id.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Agent ID exceeds maximum length');
		}
		this.validateAgentName(agent.name);

		if (!Array.isArray(agent.models)) {
			throw new Error('Agent models must be an array');
		}

		for (const model of agent.models) {
			if (typeof model !== 'object' || model === null) {
				throw new Error('Agent model entry must be an object');
			}
			if (typeof model.id !== 'string' || model.id.trim().length === 0) {
				throw new Error('Agent model id must be a non-empty string');
			}
			if (typeof model.providerId !== 'string' || model.providerId.trim().length === 0) {
				throw new Error('Agent model providerId must be a non-empty string');
			}
			if (typeof model.modelId !== 'string' || model.modelId.trim().length === 0) {
				throw new Error('Agent model modelId must be a non-empty string');
			}
			if (
				model.id.length > this.MAX_FIELD_LENGTH ||
				model.providerId.length > this.MAX_FIELD_LENGTH ||
				model.modelId.length > this.MAX_FIELD_LENGTH
			) {
				throw new Error('Agent model field exceeds maximum length');
			}
		}
	}

	static validateProviderName(providerName: string): void {
		if (typeof providerName !== 'string' || providerName.trim().length === 0) {
			throw new Error('Provider name must be a non-empty string');
		}
		if (providerName.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Provider name exceeds maximum length');
		}
	}
}

/**
 * Input validators for Channel store operations.
 */
export class ChannelValidators {
	private static readonly MAX_TOKEN_LENGTH = 500;
	private static readonly MAX_FIELD_LENGTH = 200;
	private static readonly DANGEROUS_CHARS = /[<>;"'`]/;
	private static readonly ID_PATTERN = /^[a-zA-Z0-9\-_]+$/;

	static validateChannelId(id: string): void {
		if (typeof id !== 'string' || id.trim().length === 0) {
			throw new Error('Channel id must be a non-empty string');
		}
		if (id.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Channel id exceeds maximum length');
		}
		if (!this.ID_PATTERN.test(id)) {
			throw new Error('Channel id contains invalid characters');
		}
	}

	static validateChannel(channel: Channel): void {
		if (typeof channel !== 'object' || channel === null) {
			throw new Error('Channel must be an object');
		}
		this.validateChannelId(channel.id);

		if (!isKnownChannelType(channel.type)) {
			throw new Error(`Unknown channel type: ${String(channel.type)}`);
		}

		if (typeof channel.enabled !== 'boolean') {
			throw new Error('Channel enabled must be a boolean');
		}

		if (typeof channel.token !== 'string') {
			throw new Error('Channel token must be a string');
		}
		if (channel.token.length > this.MAX_TOKEN_LENGTH) {
			throw new Error(`Channel token exceeds maximum length of ${this.MAX_TOKEN_LENGTH}`);
		}
		if (channel.token.length > 0 && this.DANGEROUS_CHARS.test(channel.token)) {
			throw new Error('Channel token contains invalid characters');
		}
		if (channel.enabled && channel.token.trim().length === 0) {
			throw new Error('Enabled channel must have a non-empty token');
		}

		if (!Array.isArray(channel.allowFrom)) {
			throw new Error('Channel allowFrom must be an array');
		}
		for (const sender of channel.allowFrom) {
			if (typeof sender !== 'string' || sender.trim().length === 0) {
				throw new Error('Channel allowFrom entries must be non-empty strings');
			}
			if (sender.length > this.MAX_FIELD_LENGTH) {
				throw new Error('Channel allowFrom entry exceeds maximum length');
			}
			if (!this.ID_PATTERN.test(sender)) {
				throw new Error('Channel allowFrom entry contains invalid characters');
			}
		}
	}
}

/**
 * Validators for agent service inputs
 */
export class AgentValidators {
	private static readonly MAX_MESSAGE_LENGTH = 100000; // ~100KB
	private static readonly MAX_MESSAGES_COUNT = 1000;

	/**
	 * Validates an array of messages for the agent
	 * @param messages - The messages array to validate
	 * @throws Error if messages array is invalid
	 */
	static validateMessages(messages: unknown[]): void {
		if (!Array.isArray(messages)) {
			throw new Error('Messages must be an array');
		}
		if (messages.length === 0) {
			throw new Error('Messages array cannot be empty');
		}
		if (messages.length > this.MAX_MESSAGES_COUNT) {
			throw new Error(`Messages array exceeds maximum count of ${this.MAX_MESSAGES_COUNT}`);
		}

		// Validate each message
		for (let i = 0; i < messages.length; i++) {
			const message = messages[i];
			if (typeof message !== 'object' || message === null) {
				throw new Error(`Message at index ${i} must be an object`);
			}
			if (!('role' in message) || !('content' in message)) {
				throw new Error(`Message at index ${i} must have 'role' and 'content' properties`);
			}
			if (typeof message.content === 'string' && message.content.length > this.MAX_MESSAGE_LENGTH) {
				throw new Error(
					`Message at index ${i} exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`
				);
			}
		}
	}

	/**
	 * Validates a run ID for uniqueness and format
	 * @param runId - The run ID to validate
	 * @throws Error if run ID is invalid
	 */
	static validateRunId(runId: string): void {
		if (typeof runId !== 'string') {
			throw new Error('Run ID must be a string');
		}
		if (runId.length === 0 || runId.length > 100) {
			throw new Error('Run ID must be between 1 and 100 characters');
		}
		// Allow alphanumeric, hyphens, and underscores only
		if (!/^[a-zA-Z0-9\-_]+$/.test(runId)) {
			throw new Error('Run ID contains invalid characters');
		}
	}

	/**
	 * Validates a session ID
	 * @param sessionId - The session ID to validate
	 * @throws Error if session ID is invalid
	 */
	static validateSessionId(sessionId: string): void {
		if (typeof sessionId !== 'string') {
			throw new Error('Session ID must be a string');
		}
		if (sessionId.length === 0 || sessionId.length > 100) {
			throw new Error('Session ID must be between 1 and 100 characters');
		}
		if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
			throw new Error('Session ID contains invalid characters');
		}
	}
}
