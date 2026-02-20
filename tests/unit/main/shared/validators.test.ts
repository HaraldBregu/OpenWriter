/**
 * Tests for StoreValidators and AgentValidators.
 *
 * These validators are security-critical: they prevent injection attacks
 * and malformed data from reaching services.
 */

import { StoreValidators, AgentValidators } from '../../../../src/main/shared/validators'

describe('StoreValidators', () => {
  describe('validateProviderId', () => {
    it('should accept valid provider IDs', () => {
      const validProviders = ['anthropic', 'openai', 'google', 'meta', 'mistral']
      for (const providerId of validProviders) {
        expect(() => StoreValidators.validateProviderId(providerId)).not.toThrow()
      }
    })

    it('should reject invalid provider IDs', () => {
      expect(() => StoreValidators.validateProviderId('invalid')).toThrow(
        'Invalid provider ID: invalid'
      )
      expect(() => StoreValidators.validateProviderId('')).toThrow('Invalid provider ID')
      expect(() => StoreValidators.validateProviderId('OPENAI')).toThrow('Invalid provider ID')
    })
  })

  describe('validateApiToken', () => {
    it('should accept valid tokens', () => {
      expect(() => StoreValidators.validateApiToken('sk-abc123')).not.toThrow()
      expect(() => StoreValidators.validateApiToken('token-with-hyphens')).not.toThrow()
    })

    it('should reject tokens longer than 500 characters', () => {
      const longToken = 'a'.repeat(501)
      expect(() => StoreValidators.validateApiToken(longToken)).toThrow(
        'exceeds maximum length of 500'
      )
    })

    it('should reject tokens with dangerous characters', () => {
      expect(() => StoreValidators.validateApiToken('token<script>')).toThrow(
        'invalid characters'
      )
      expect(() => StoreValidators.validateApiToken("token'injection")).toThrow(
        'invalid characters'
      )
      expect(() => StoreValidators.validateApiToken('token"double')).toThrow(
        'invalid characters'
      )
      expect(() => StoreValidators.validateApiToken('token;semicolon')).toThrow(
        'invalid characters'
      )
      expect(() => StoreValidators.validateApiToken('token`backtick')).toThrow(
        'invalid characters'
      )
    })

    it('should accept tokens at the maximum length', () => {
      const maxToken = 'a'.repeat(500)
      expect(() => StoreValidators.validateApiToken(maxToken)).not.toThrow()
    })
  })

  describe('validateModelName', () => {
    it('should accept valid model names', () => {
      expect(() => StoreValidators.validateModelName('gpt-4')).not.toThrow()
      expect(() => StoreValidators.validateModelName('claude-3.5-sonnet')).not.toThrow()
      expect(() => StoreValidators.validateModelName('meta/llama-3')).not.toThrow()
      expect(() => StoreValidators.validateModelName('model_v2')).not.toThrow()
    })

    it('should reject empty model names', () => {
      expect(() => StoreValidators.validateModelName('')).toThrow(
        'must be between 1 and 200 characters'
      )
    })

    it('should reject model names over 200 characters', () => {
      const longName = 'a'.repeat(201)
      expect(() => StoreValidators.validateModelName(longName)).toThrow(
        'must be between 1 and 200 characters'
      )
    })

    it('should reject model names with invalid characters', () => {
      expect(() => StoreValidators.validateModelName('model with spaces')).toThrow(
        'contains invalid characters'
      )
      expect(() => StoreValidators.validateModelName('model<script>')).toThrow(
        'contains invalid characters'
      )
    })
  })

  describe('getValidProviders', () => {
    it('should return a copy of the valid providers list', () => {
      const providers = StoreValidators.getValidProviders()
      expect(providers).toEqual(['anthropic', 'openai', 'google', 'meta', 'mistral'])

      // Ensure it is a copy, not the original
      providers.push('fake')
      expect(StoreValidators.getValidProviders()).not.toContain('fake')
    })
  })
})

describe('AgentValidators', () => {
  describe('validateMessages', () => {
    it('should accept valid message arrays', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
      expect(() => AgentValidators.validateMessages(messages)).not.toThrow()
    })

    it('should reject empty arrays', () => {
      expect(() => AgentValidators.validateMessages([])).toThrow('cannot be empty')
    })

    it('should reject arrays exceeding max count', () => {
      const messages = Array.from({ length: 1001 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`
      }))
      expect(() => AgentValidators.validateMessages(messages)).toThrow('exceeds maximum count')
    })

    it('should reject messages without role or content', () => {
      expect(() => AgentValidators.validateMessages([{ role: 'user' }])).toThrow(
        "must have 'role' and 'content'"
      )
      expect(() => AgentValidators.validateMessages([{ content: 'hello' }])).toThrow(
        "must have 'role' and 'content'"
      )
    })

    it('should reject non-object messages', () => {
      expect(() => AgentValidators.validateMessages(['string'])).toThrow('must be an object')
      expect(() => AgentValidators.validateMessages([null])).toThrow('must be an object')
    })

    it('should reject messages with content exceeding max length', () => {
      const bigContent = 'x'.repeat(100001)
      expect(() =>
        AgentValidators.validateMessages([{ role: 'user', content: bigContent }])
      ).toThrow('exceeds maximum length')
    })
  })

  describe('validateRunId', () => {
    it('should accept valid run IDs', () => {
      expect(() => AgentValidators.validateRunId('run-123')).not.toThrow()
      expect(() => AgentValidators.validateRunId('abc_def')).not.toThrow()
      expect(() => AgentValidators.validateRunId('RUN1')).not.toThrow()
    })

    it('should reject empty run IDs', () => {
      expect(() => AgentValidators.validateRunId('')).toThrow('must be between 1 and 100')
    })

    it('should reject run IDs with invalid characters', () => {
      expect(() => AgentValidators.validateRunId('run id with spaces')).toThrow(
        'contains invalid characters'
      )
      expect(() => AgentValidators.validateRunId('run/id')).toThrow('contains invalid characters')
    })
  })

  describe('validateSessionId', () => {
    it('should accept valid session IDs', () => {
      expect(() => AgentValidators.validateSessionId('session-1')).not.toThrow()
      expect(() => AgentValidators.validateSessionId('sess_abc')).not.toThrow()
    })

    it('should reject empty session IDs', () => {
      expect(() => AgentValidators.validateSessionId('')).toThrow('must be between 1 and 100')
    })

    it('should reject session IDs with invalid characters', () => {
      expect(() => AgentValidators.validateSessionId('session.with.dots')).toThrow(
        'contains invalid characters'
      )
    })
  })
})
