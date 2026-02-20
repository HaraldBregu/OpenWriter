/**
 * Tests for Observable base class.
 * Provides pub/sub pattern for services that emit events.
 */
import { Observable, type Unsubscribe } from '../../../../src/main/core/Observable'

// Create a concrete subclass to test protected methods
class TestObservable extends Observable<string> {
  public emit(event: string): void {
    this.notify(event)
  }

  public addSubscriber(callback: (event: string) => void): Unsubscribe {
    return this.subscribe(callback)
  }

  public clear(): void {
    this.clearSubscribers()
  }

  public count(): number {
    return this.getSubscriberCount()
  }
}

describe('Observable', () => {
  let observable: TestObservable

  beforeEach(() => {
    observable = new TestObservable()
  })

  it('should start with zero subscribers', () => {
    expect(observable.count()).toBe(0)
  })

  describe('subscribe', () => {
    it('should add a subscriber', () => {
      observable.addSubscriber(jest.fn())
      expect(observable.count()).toBe(1)
    })

    it('should support multiple subscribers', () => {
      observable.addSubscriber(jest.fn())
      observable.addSubscriber(jest.fn())
      observable.addSubscriber(jest.fn())
      expect(observable.count()).toBe(3)
    })

    it('should return an unsubscribe function', () => {
      const unsub = observable.addSubscriber(jest.fn())
      expect(typeof unsub).toBe('function')
    })
  })

  describe('unsubscribe', () => {
    it('should remove a subscriber when unsubscribe is called', () => {
      const unsub = observable.addSubscriber(jest.fn())
      expect(observable.count()).toBe(1)

      unsub()
      expect(observable.count()).toBe(0)
    })

    it('should only remove the specific subscriber', () => {
      const cb1 = jest.fn()
      const cb2 = jest.fn()
      const unsub1 = observable.addSubscriber(cb1)
      observable.addSubscriber(cb2)

      unsub1()
      expect(observable.count()).toBe(1)

      observable.emit('test')
      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).toHaveBeenCalledWith('test')
    })
  })

  describe('notify', () => {
    it('should call all subscribers with the event', () => {
      const cb1 = jest.fn()
      const cb2 = jest.fn()
      observable.addSubscriber(cb1)
      observable.addSubscriber(cb2)

      observable.emit('hello')

      expect(cb1).toHaveBeenCalledWith('hello')
      expect(cb2).toHaveBeenCalledWith('hello')
    })

    it('should not throw when a subscriber throws', () => {
      const errorCb = jest.fn().mockImplementation(() => {
        throw new Error('subscriber error')
      })
      const normalCb = jest.fn()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      observable.addSubscriber(errorCb)
      observable.addSubscriber(normalCb)

      // Should not throw
      expect(() => observable.emit('test')).not.toThrow()
      // Normal callback should still be called
      expect(normalCb).toHaveBeenCalledWith('test')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should do nothing when there are no subscribers', () => {
      expect(() => observable.emit('test')).not.toThrow()
    })
  })

  describe('clearSubscribers', () => {
    it('should remove all subscribers', () => {
      observable.addSubscriber(jest.fn())
      observable.addSubscriber(jest.fn())
      observable.addSubscriber(jest.fn())
      expect(observable.count()).toBe(3)

      observable.clear()
      expect(observable.count()).toBe(0)
    })

    it('should prevent further notifications after clearing', () => {
      const cb = jest.fn()
      observable.addSubscriber(cb)
      observable.clear()
      observable.emit('test')

      expect(cb).not.toHaveBeenCalled()
    })
  })
})
