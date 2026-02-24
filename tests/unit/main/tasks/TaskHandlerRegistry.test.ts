/**
 * Tests for TaskHandlerRegistry.
 *
 * Validates handler registration, lookup, collision detection, existence checks,
 * type listing, and the clear utility used in test teardown.
 *
 * TaskHandlerRegistry mirrors the AgentRegistry pattern — so tests follow the
 * same structure as AgentRegistry.test.ts.
 */
import { TaskHandlerRegistry } from '../../../../src/main/tasks/TaskHandlerRegistry'
import type { TaskHandler, ProgressReporter } from '../../../../src/main/tasks/TaskHandler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal TaskHandler implementation with the given type identifier. */
function makeHandler(type: string): TaskHandler {
  return {
    type,
    execute: jest.fn().mockResolvedValue({ result: 'ok' }) as unknown as (
      input: unknown,
      signal: AbortSignal,
      reporter: ProgressReporter
    ) => Promise<unknown>
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskHandlerRegistry', () => {
  let registry: TaskHandlerRegistry

  beforeEach(() => {
    jest.clearAllMocks()
    registry = new TaskHandlerRegistry()
  })

  // ---- register ------------------------------------------------------------

  describe('register', () => {
    it('should register a handler successfully', () => {
      const handler = makeHandler('file-download')

      registry.register(handler)

      expect(registry.has('file-download')).toBe(true)
    })

    it('should throw when registering a duplicate type', () => {
      const handler1 = makeHandler('ai-chat')
      const handler2 = makeHandler('ai-chat')

      registry.register(handler1)

      expect(() => registry.register(handler2)).toThrow(
        'Task handler already registered: ai-chat'
      )
    })

    it('should register multiple handlers with different types', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))
      registry.register(makeHandler('file-download'))

      expect(registry.has('ai-chat')).toBe(true)
      expect(registry.has('ai-enhance')).toBe(true)
      expect(registry.has('file-download')).toBe(true)
    })
  })

  // ---- get -----------------------------------------------------------------

  describe('get', () => {
    it('should return the registered handler by type', () => {
      const handler = makeHandler('ai-chat')
      registry.register(handler)

      const retrieved = registry.get('ai-chat')

      expect(retrieved).toBe(handler)
      expect(retrieved.type).toBe('ai-chat')
    })

    it('should throw when type is not registered', () => {
      expect(() => registry.get('nonexistent')).toThrow('Unknown task type: nonexistent')
    })

    it('should throw for any unknown type on an empty registry', () => {
      expect(() => registry.get('anything')).toThrow('Unknown task type: anything')
    })

    it('should retrieve each handler independently after multiple registrations', () => {
      const chatHandler = makeHandler('ai-chat')
      const enhanceHandler = makeHandler('ai-enhance')

      registry.register(chatHandler)
      registry.register(enhanceHandler)

      expect(registry.get('ai-chat')).toBe(chatHandler)
      expect(registry.get('ai-enhance')).toBe(enhanceHandler)
    })
  })

  // ---- has -----------------------------------------------------------------

  describe('has', () => {
    it('should return true for a registered handler', () => {
      registry.register(makeHandler('ai-chat'))

      expect(registry.has('ai-chat')).toBe(true)
    })

    it('should return false for an unregistered type', () => {
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('should return false on an empty registry', () => {
      expect(registry.has('ai-chat')).toBe(false)
    })
  })

  // ---- listTypes -----------------------------------------------------------

  describe('listTypes', () => {
    it('should return an empty array for an empty registry', () => {
      expect(registry.listTypes()).toEqual([])
    })

    it('should return all registered type identifiers', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))
      registry.register(makeHandler('file-download'))

      const types = registry.listTypes()

      expect(types).toHaveLength(3)
      expect(types).toContain('ai-chat')
      expect(types).toContain('ai-enhance')
      expect(types).toContain('file-download')
    })

    it('should reflect changes after each registration', () => {
      expect(registry.listTypes()).toHaveLength(0)

      registry.register(makeHandler('step-one'))
      expect(registry.listTypes()).toEqual(['step-one'])

      registry.register(makeHandler('step-two'))
      expect(registry.listTypes()).toHaveLength(2)
      expect(registry.listTypes()).toContain('step-one')
      expect(registry.listTypes()).toContain('step-two')
    })
  })

  // ---- clear ---------------------------------------------------------------

  describe('clear', () => {
    it('should remove all registered handlers', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))

      registry.clear()

      expect(registry.listTypes()).toEqual([])
      expect(registry.has('ai-chat')).toBe(false)
      expect(registry.has('ai-enhance')).toBe(false)
    })

    it('should allow re-registration after clearing', () => {
      const handler = makeHandler('ai-chat')

      registry.register(handler)
      registry.clear()

      // Should not throw after clear
      expect(() => registry.register(handler)).not.toThrow()
      expect(registry.has('ai-chat')).toBe(true)
    })

    it('should be a no-op on an empty registry', () => {
      expect(() => registry.clear()).not.toThrow()
      expect(registry.listTypes()).toEqual([])
    })
  })
})
