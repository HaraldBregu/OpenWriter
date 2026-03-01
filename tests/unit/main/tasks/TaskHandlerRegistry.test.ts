/**
 * Tests for TaskHandlerRegistry.
 *
 * Testing strategy:
 *  - A fresh registry is created in beforeEach to guarantee isolation.
 *  - All methods are exercised through their public API only.
 *
 * Cases covered:
 *  - register(): adds a handler and makes it retrievable
 *  - register(): throws on duplicate type identifier
 *  - register(): allows multiple distinct types to coexist
 *  - get(): returns the registered handler instance
 *  - get(): throws for an unknown type
 *  - get(): throws on an empty registry
 *  - get(): retrieves each handler independently after bulk registration
 *  - has(): returns true for a registered type
 *  - has(): returns false for an unknown type
 *  - has(): returns false on an empty registry
 *  - listTypes(): returns [] for empty registry
 *  - listTypes(): contains all registered type identifiers
 *  - listTypes(): reflects incremental registrations
 *  - clear(): removes all handlers
 *  - clear(): allows re-registration after clearing
 *  - clear(): is a no-op on an empty registry
 */

import { TaskHandlerRegistry } from '../../../../src/main/taskManager/TaskHandlerRegistry'
import type { TaskHandler } from '../../../../src/main/taskManager/TaskHandler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal TaskHandler stub with the given type identifier. */
function makeHandler(type: string): TaskHandler {
  return {
    type,
    execute: jest.fn().mockResolvedValue({ result: 'ok' }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskHandlerRegistry', () => {
  let registry: TaskHandlerRegistry

  beforeEach(() => {
    registry = new TaskHandlerRegistry()
  })

  // -------------------------------------------------------------------------
  // register()
  // -------------------------------------------------------------------------

  describe('register()', () => {
    it('registers a handler and makes it accessible via has()', () => {
      registry.register(makeHandler('file-download'))

      expect(registry.has('file-download')).toBe(true)
    })

    it('throws when registering a duplicate type identifier', () => {
      registry.register(makeHandler('ai-chat'))

      expect(() => registry.register(makeHandler('ai-chat'))).toThrow(
        'Task handler already registered: ai-chat'
      )
    })

    it('allows multiple handlers with distinct types to coexist', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))
      registry.register(makeHandler('file-download'))

      expect(registry.has('ai-chat')).toBe(true)
      expect(registry.has('ai-enhance')).toBe(true)
      expect(registry.has('file-download')).toBe(true)
    })

    it('does not affect other types when one type is registered', () => {
      registry.register(makeHandler('type-a'))

      expect(registry.has('type-b')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns the exact handler instance that was registered', () => {
      const handler = makeHandler('ai-chat')
      registry.register(handler)

      expect(registry.get('ai-chat')).toBe(handler)
    })

    it('returns a handler with the correct type property', () => {
      registry.register(makeHandler('ai-chat'))

      expect(registry.get('ai-chat').type).toBe('ai-chat')
    })

    it('throws for an unknown type', () => {
      expect(() => registry.get('nonexistent')).toThrow(
        'Unknown task type: nonexistent'
      )
    })

    it('throws for any type on an empty registry', () => {
      expect(() => registry.get('anything')).toThrow(
        'Unknown task type: anything'
      )
    })

    it('retrieves each handler independently when multiple are registered', () => {
      const chatHandler = makeHandler('ai-chat')
      const enhanceHandler = makeHandler('ai-enhance')

      registry.register(chatHandler)
      registry.register(enhanceHandler)

      expect(registry.get('ai-chat')).toBe(chatHandler)
      expect(registry.get('ai-enhance')).toBe(enhanceHandler)
    })
  })

  // -------------------------------------------------------------------------
  // has()
  // -------------------------------------------------------------------------

  describe('has()', () => {
    it('returns true for a registered handler', () => {
      registry.register(makeHandler('ai-chat'))

      expect(registry.has('ai-chat')).toBe(true)
    })

    it('returns false for an unregistered type', () => {
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('returns false on an empty registry', () => {
      expect(registry.has('ai-chat')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // listTypes()
  // -------------------------------------------------------------------------

  describe('listTypes()', () => {
    it('returns an empty array for an empty registry', () => {
      expect(registry.listTypes()).toEqual([])
    })

    it('returns all registered type identifiers', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))
      registry.register(makeHandler('file-download'))

      const types = registry.listTypes()

      expect(types).toHaveLength(3)
      expect(types).toContain('ai-chat')
      expect(types).toContain('ai-enhance')
      expect(types).toContain('file-download')
    })

    it('reflects each incremental registration', () => {
      expect(registry.listTypes()).toHaveLength(0)

      registry.register(makeHandler('step-one'))
      expect(registry.listTypes()).toEqual(['step-one'])

      registry.register(makeHandler('step-two'))
      expect(registry.listTypes()).toHaveLength(2)
      expect(registry.listTypes()).toContain('step-one')
      expect(registry.listTypes()).toContain('step-two')
    })

    it('does not expose internal details beyond type strings', () => {
      registry.register(makeHandler('t1'))
      registry.register(makeHandler('t2'))

      const types = registry.listTypes()
      for (const t of types) {
        expect(typeof t).toBe('string')
      }
    })
  })

  // -------------------------------------------------------------------------
  // clear()
  // -------------------------------------------------------------------------

  describe('clear()', () => {
    it('removes all registered handlers', () => {
      registry.register(makeHandler('ai-chat'))
      registry.register(makeHandler('ai-enhance'))

      registry.clear()

      expect(registry.listTypes()).toEqual([])
      expect(registry.has('ai-chat')).toBe(false)
      expect(registry.has('ai-enhance')).toBe(false)
    })

    it('allows re-registration of the same type after clearing', () => {
      const handler = makeHandler('ai-chat')
      registry.register(handler)

      registry.clear()

      expect(() => registry.register(handler)).not.toThrow()
      expect(registry.has('ai-chat')).toBe(true)
    })

    it('is a no-op on an empty registry', () => {
      expect(() => registry.clear()).not.toThrow()
      expect(registry.listTypes()).toEqual([])
    })

    it('causes get() to throw after clearing', () => {
      registry.register(makeHandler('ai-chat'))
      registry.clear()

      expect(() => registry.get('ai-chat')).toThrow(
        'Unknown task type: ai-chat'
      )
    })
  })
})
