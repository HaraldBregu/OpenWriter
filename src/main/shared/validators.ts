/**
 * Input validators for preventing injection attacks and malformed data.
 * Used by AppIpc (store handlers) to validate user inputs.
 */

import type { ServiceProvider } from '../../shared/providers';

export class StoreValidators {
	private static readonly MAX_TOKEN_LENGTH = 500;
	private static readonly MAX_FIELD_LENGTH = 200;
	private static readonly DANGEROUS_CHARS = /[<>;"'`]/;

	/**
	 * Validates a model ID string.
	 * @param id - The model ID to validate
	 * @throws Error if the model ID is invalid
	 */
	static validateModelId(id: string): void {
		if (typeof id !== 'string' || id.trim().length === 0) {
			throw new Error('Model ID must be a non-empty string');
		}
		if (id.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Model ID exceeds maximum length');
		}
	}

	/**
	 * Validates a model payload for security and correctness.
	 * @param model - The model config to validate
	 * @throws Error if any field is invalid
	 */
	static validateModelConfig(model: ServiceProvider): void {
		if (typeof model.name !== 'string' || model.name.trim().length === 0) {
			throw new Error('Provider is required');
		}
		if (model.name.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Provider exceeds maximum length');
		}
		if (typeof model.apikey === 'string' && model.apikey.length > 0) {
			if (model.apikey.length > this.MAX_TOKEN_LENGTH) {
				throw new Error(`API key exceeds maximum length of ${this.MAX_TOKEN_LENGTH} characters`);
			}
			if (this.DANGEROUS_CHARS.test(model.apikey)) {
				throw new Error('API key contains invalid characters');
			}
		}
		if (typeof model.baseurl === 'string' && model.baseurl.length > 0) {
			if (model.baseurl.length > this.MAX_FIELD_LENGTH) {
				throw new Error('Base URL exceeds maximum length');
			}
		}
	}

	static validateAgentName(agentName: string): void {
		if (typeof agentName !== 'string' || agentName.trim().length === 0) {
			throw new Error('Agent name must be a non-empty string');
		}
		if (agentName.length > this.MAX_FIELD_LENGTH) {
			throw new Error('Agent name exceeds maximum length');
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

	static validateProviderConfigs(providers: ServiceProvider[]): void {
		if (!Array.isArray(providers)) {
			throw new Error('Providers must be an array');
		}

		providers.forEach((provider) => {
			this.validateModelConfig(provider);
		});
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
