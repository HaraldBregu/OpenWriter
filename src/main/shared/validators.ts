/**
 * Input validators for preventing injection attacks and malformed data.
 * Used by StoreIpc and AgentService to validate user inputs.
 */
export class StoreValidators {
  private static readonly VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'meta', 'mistral']
  private static readonly MAX_TOKEN_LENGTH = 500
  private static readonly DANGEROUS_CHARS = /[<>;"'`]/

  /**
   * Validates that a provider ID is one of the supported providers
   * @param providerId - The provider ID to validate
   * @throws Error if provider ID is invalid
   */
  static validateProviderId(providerId: string): void {
    if (!this.VALID_PROVIDERS.includes(providerId)) {
      throw new Error(
        `Invalid provider ID: ${providerId}. Must be one of: ${this.VALID_PROVIDERS.join(', ')}`
      )
    }
  }

  /**
   * Validates an API token for security issues
   * @param token - The API token to validate
   * @throws Error if token is invalid or contains dangerous characters
   */
  static validateApiToken(token: string): void {
    if (typeof token !== 'string') {
      throw new Error('API token must be a string')
    }
    if (token.length > this.MAX_TOKEN_LENGTH) {
      throw new Error(`API token exceeds maximum length of ${this.MAX_TOKEN_LENGTH} characters`)
    }
    if (this.DANGEROUS_CHARS.test(token)) {
      throw new Error('API token contains invalid characters')
    }
  }

  /**
   * Validates a model name string
   * @param modelName - The model name to validate
   * @throws Error if model name is invalid
   */
  static validateModelName(modelName: string): void {
    if (typeof modelName !== 'string') {
      throw new Error('Model name must be a string')
    }
    if (modelName.length === 0 || modelName.length > 200) {
      throw new Error('Model name must be between 1 and 200 characters')
    }
    // Allow alphanumeric, hyphens, underscores, dots, and forward slashes (for model paths like "meta/llama-3")
    if (!/^[a-zA-Z0-9\-_.\/]+$/.test(modelName)) {
      throw new Error('Model name contains invalid characters')
    }
  }

  /**
   * Get the list of valid provider IDs
   * @returns Array of valid provider IDs
   */
  static getValidProviders(): string[] {
    return [...this.VALID_PROVIDERS]
  }

  /**
   * Validates an inference temperature value
   * @param value - The temperature to validate
   * @throws Error if value is not a number in the range [0, 2]
   */
  static validateTemperature(value: unknown): void {
    if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 2) {
      throw new Error('Temperature must be a number between 0 and 2')
    }
  }

  /**
   * Validates a maxTokens value
   * @param value - The maxTokens to validate
   * @throws Error if value is not null and not a non-negative integer <= 1,000,000
   */
  static validateMaxTokens(value: unknown): void {
    if (value === null) return
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 1_000_000
    ) {
      throw new Error('maxTokens must be null or a non-negative integer no greater than 1,000,000')
    }
  }

  /**
   * Validates a reasoning flag value
   * @param value - The reasoning flag to validate
   * @throws Error if value is not a boolean
   */
  static validateReasoning(value: unknown): void {
    if (typeof value !== 'boolean') {
      throw new Error('Reasoning must be a boolean')
    }
  }
}

/**
 * Validators for agent service inputs
 */
export class AgentValidators {
  private static readonly MAX_MESSAGE_LENGTH = 100000 // ~100KB
  private static readonly MAX_MESSAGES_COUNT = 1000

  /**
   * Validates an array of messages for the agent
   * @param messages - The messages array to validate
   * @throws Error if messages array is invalid
   */
  static validateMessages(messages: unknown[]): void {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array')
    }
    if (messages.length === 0) {
      throw new Error('Messages array cannot be empty')
    }
    if (messages.length > this.MAX_MESSAGES_COUNT) {
      throw new Error(`Messages array exceeds maximum count of ${this.MAX_MESSAGES_COUNT}`)
    }

    // Validate each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (typeof message !== 'object' || message === null) {
        throw new Error(`Message at index ${i} must be an object`)
      }
      if (!('role' in message) || !('content' in message)) {
        throw new Error(`Message at index ${i} must have 'role' and 'content' properties`)
      }
      if (typeof message.content === 'string' && message.content.length > this.MAX_MESSAGE_LENGTH) {
        throw new Error(
          `Message at index ${i} exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`
        )
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
      throw new Error('Run ID must be a string')
    }
    if (runId.length === 0 || runId.length > 100) {
      throw new Error('Run ID must be between 1 and 100 characters')
    }
    // Allow alphanumeric, hyphens, and underscores only
    if (!/^[a-zA-Z0-9\-_]+$/.test(runId)) {
      throw new Error('Run ID contains invalid characters')
    }
  }

  /**
   * Validates a session ID
   * @param sessionId - The session ID to validate
   * @throws Error if session ID is invalid
   */
  static validateSessionId(sessionId: string): void {
    if (typeof sessionId !== 'string') {
      throw new Error('Session ID must be a string')
    }
    if (sessionId.length === 0 || sessionId.length > 100) {
      throw new Error('Session ID must be between 1 and 100 characters')
    }
    if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
      throw new Error('Session ID contains invalid characters')
    }
  }
}
