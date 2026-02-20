/**
 * Tests for ServiceContainer - the main process service registry.
 *
 * ServiceContainer is the central dependency registry for the application.
 * It manages service lifecycle, including ordered shutdown of disposable services.
 */

import { ServiceContainer, type Disposable } from '../../../../src/main/core/ServiceContainer'

describe('ServiceContainer', () => {
  let container: ServiceContainer

  beforeEach(() => {
    container = new ServiceContainer()
  })

  describe('register', () => {
    it('should register and retrieve a service by key', () => {
      // Arrange
      const service = { name: 'test-service' }

      // Act
      container.register('myService', service)
      const retrieved = container.get<typeof service>('myService')

      // Assert
      expect(retrieved).toBe(service)
    })

    it('should return the registered instance', () => {
      // Arrange
      const service = { value: 42 }

      // Act
      const returned = container.register('answer', service)

      // Assert
      expect(returned).toBe(service)
    })

    it('should throw when registering a duplicate key', () => {
      // Arrange
      container.register('dup', { a: 1 })

      // Act & Assert
      expect(() => container.register('dup', { a: 2 })).toThrow(
        'Service "dup" is already registered'
      )
    })
  })

  describe('get', () => {
    it('should throw when retrieving an unregistered service', () => {
      // Act & Assert
      expect(() => container.get('nonexistent')).toThrow(
        'Service "nonexistent" not found. Was it registered?'
      )
    })

    it('should retrieve services with correct typing', () => {
      // Arrange
      interface MyService {
        doWork(): string
      }
      const service: MyService = { doWork: () => 'done' }
      container.register('worker', service)

      // Act
      const retrieved = container.get<MyService>('worker')

      // Assert
      expect(retrieved.doWork()).toBe('done')
    })
  })

  describe('has', () => {
    it('should return true for registered services', () => {
      // Arrange
      container.register('exists', {})

      // Act & Assert
      expect(container.has('exists')).toBe(true)
    })

    it('should return false for unregistered services', () => {
      // Act & Assert
      expect(container.has('ghost')).toBe(false)
    })
  })

  describe('shutdown', () => {
    it('should call destroy() on disposable services', async () => {
      // Arrange
      const destroyFn = jest.fn()
      const disposable: Disposable = { destroy: destroyFn }
      container.register('disposable', disposable)

      // Act
      await container.shutdown()

      // Assert
      expect(destroyFn).toHaveBeenCalledTimes(1)
    })

    it('should not call destroy() on non-disposable services', async () => {
      // Arrange
      const plainService = { name: 'plain' }
      container.register('plain', plainService)

      // Act & Assert (should not throw)
      await container.shutdown()
    })

    it('should destroy services in reverse registration order', async () => {
      // Arrange
      const order: string[] = []
      const serviceA: Disposable = { destroy: () => order.push('A') }
      const serviceB: Disposable = { destroy: () => order.push('B') }
      const serviceC: Disposable = { destroy: () => order.push('C') }

      container.register('a', serviceA)
      container.register('b', serviceB)
      container.register('c', serviceC)

      // Act
      await container.shutdown()

      // Assert - reverse order: C, B, A
      expect(order).toEqual(['C', 'B', 'A'])
    })

    it('should continue shutdown even if a service throws during destroy', async () => {
      // Arrange
      const destroyOk = jest.fn()
      const destroyFail: Disposable = {
        destroy: () => {
          throw new Error('boom')
        }
      }
      const destroyAfter: Disposable = { destroy: destroyOk }

      container.register('fail', destroyFail)
      container.register('after', destroyAfter)

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Act
      await container.shutdown()

      // Assert - the second service's destroy was still called
      expect(destroyOk).toHaveBeenCalledTimes(1)
      consoleSpy.mockRestore()
    })

    it('should clear all services after shutdown', async () => {
      // Arrange
      container.register('service1', { destroy: jest.fn() })
      container.register('service2', {})

      // Act
      await container.shutdown()

      // Assert
      expect(container.has('service1')).toBe(false)
      expect(container.has('service2')).toBe(false)
    })
  })
})
