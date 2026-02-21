/**
 * Tests for AgentRegistry.
 * Validates agent registration, lookup, and collision detection.
 */
import { AgentRegistry } from '../../../../src/main/pipeline/AgentRegistry'
import type { Agent, AgentInput, AgentEvent } from '../../../../src/main/pipeline/AgentBase'

// Mock agent for testing
class MockAgent implements Agent {
  readonly name: string

  constructor(name: string) {
    this.name = name
  }

  async *run(
    _input: AgentInput,
    runId: string,
    _signal: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    yield { type: 'token', data: { runId, token: 'test' } }
    yield { type: 'done', data: { runId } }
  }
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    registry = new AgentRegistry()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('register', () => {
    it('should register an agent successfully', () => {
      const agent = new MockAgent('test-agent')

      registry.register(agent)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AgentRegistry] Registered agent: test-agent'
      )
      expect(registry.has('test-agent')).toBe(true)
    })

    it('should throw on duplicate agent name', () => {
      const agent1 = new MockAgent('duplicate')
      const agent2 = new MockAgent('duplicate')

      registry.register(agent1)

      expect(() => registry.register(agent2)).toThrow(
        '[AgentRegistry] Agent "duplicate" is already registered'
      )
    })

    it('should register multiple agents with different names', () => {
      const agent1 = new MockAgent('agent-1')
      const agent2 = new MockAgent('agent-2')
      const agent3 = new MockAgent('agent-3')

      registry.register(agent1)
      registry.register(agent2)
      registry.register(agent3)

      expect(registry.has('agent-1')).toBe(true)
      expect(registry.has('agent-2')).toBe(true)
      expect(registry.has('agent-3')).toBe(true)
    })
  })

  describe('get', () => {
    it('should return registered agent', () => {
      const agent = new MockAgent('test-agent')
      registry.register(agent)

      const retrieved = registry.get('test-agent')

      expect(retrieved).toBe(agent)
      expect(retrieved?.name).toBe('test-agent')
    })

    it('should return undefined for non-existent agent', () => {
      const retrieved = registry.get('nonexistent')

      expect(retrieved).toBeUndefined()
    })

    it('should return undefined for empty registry', () => {
      const retrieved = registry.get('any-name')

      expect(retrieved).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered agent', () => {
      const agent = new MockAgent('test-agent')
      registry.register(agent)

      expect(registry.has('test-agent')).toBe(true)
    })

    it('should return false for non-existent agent', () => {
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('should return false for empty registry', () => {
      expect(registry.has('any-name')).toBe(false)
    })
  })

  describe('listNames', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.listNames()).toEqual([])
    })

    it('should return all registered agent names', () => {
      const agent1 = new MockAgent('echo')
      const agent2 = new MockAgent('counter')
      const agent3 = new MockAgent('chat')

      registry.register(agent1)
      registry.register(agent2)
      registry.register(agent3)

      const names = registry.listNames()

      expect(names).toHaveLength(3)
      expect(names).toContain('echo')
      expect(names).toContain('counter')
      expect(names).toContain('chat')
    })

    it('should reflect changes after registration', () => {
      expect(registry.listNames()).toEqual([])

      registry.register(new MockAgent('first'))
      expect(registry.listNames()).toEqual(['first'])

      registry.register(new MockAgent('second'))
      expect(registry.listNames()).toContain('first')
      expect(registry.listNames()).toContain('second')
      expect(registry.listNames()).toHaveLength(2)
    })
  })
})
