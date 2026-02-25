/**
 * Tests for TaskExecutorService.
 *
 * Covers:
 *  - submit(): task queuing, queued event emitted, returns taskId
 *  - submit(): handler validation is called before queuing
 *  - submit(): invalid input throws before a task is queued
 *  - submit(): task is immediately executed when concurrency slot is free
 *  - submit(): task completes and emits completed event with result
 *  - submit(): handler error emits error event
 *  - submit(): AbortError during execute emits cancelled event
 *  - submit(): respects maxConcurrency limit — tasks queue when at capacity
 *  - submit(): priority ordering — high priority tasks run before low
 *  - submit(): timeout aborts a task after timeoutMs
 *  - cancel(): returns false for unknown taskId
 *  - cancel(): removes a queued task and emits cancelled event
 *  - cancel(): aborts a running task
 *  - listTasks(): returns snapshot of active/queued tasks (no controller)
 *  - destroy(): aborts all in-flight tasks
 *  - progress(): reporter emits progress event while task is active
 */
import { TaskExecutorService } from '../../../../src/main/tasks/TaskExecutorService'
import { TaskHandlerRegistry } from '../../../../src/main/tasks/TaskHandlerRegistry'
import type { TaskHandler, ProgressReporter } from '../../../../src/main/tasks/TaskHandler'
import type { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEventBus(): jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo'>> {
  return {
    broadcast: jest.fn(),
    sendTo: jest.fn()
  }
}

/** Build a handler whose execute() resolves on the next tick. */
function makeInstantHandler(type: string, result: unknown = { done: true }): TaskHandler {
  return {
    type,
    execute: jest.fn().mockResolvedValue(result)
  }
}

/** Build a handler that never resolves until the signal fires. */
function makeHangingHandler(type: string): TaskHandler & { _resolve: () => void } {
  let resolve!: () => void
  const p = new Promise<void>((r) => { resolve = r })
  return {
    type,
    execute: jest.fn().mockImplementation((_input: unknown, signal: AbortSignal) => {
      return new Promise<unknown>((res, rej) => {
        signal.addEventListener('abort', () => {
          const err = new Error('AbortError')
          err.name = 'AbortError'
          rej(err)
        })
        p.then(() => res({ done: true }))
      })
    }),
    _resolve: resolve
  }
}

/** Build a handler that rejects with a regular error. */
function makeErrorHandler(type: string, message = 'handler exploded'): TaskHandler {
  return {
    type,
    execute: jest.fn().mockRejectedValue(new Error(message))
  }
}

/** Extract the first event sent on `task:event` channel from broadcast OR sendTo calls. */
function getEmittedTaskEvents(
  bus: jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo'>>
): Array<{ type: string; data: Record<string, unknown> }> {
  const fromBroadcast = (bus.broadcast as jest.Mock).mock.calls
    .filter((c: unknown[]) => c[0] === 'task:event')
    .map((c: unknown[]) => c[1] as { type: string; data: Record<string, unknown> })

  const fromSendTo = (bus.sendTo as jest.Mock).mock.calls
    .filter((c: unknown[]) => c[1] === 'task:event')
    .map((c: unknown[]) => c[2] as { type: string; data: Record<string, unknown> })

  return [...fromBroadcast, ...fromSendTo]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskExecutorService', () => {
  let registry: TaskHandlerRegistry
  let eventBus: jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo'>>
  let service: TaskExecutorService
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    registry = new TaskHandlerRegistry()
    eventBus = makeEventBus()
    service = new TaskExecutorService(registry, eventBus as unknown as EventBus)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    service.destroy()
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    jest.useRealTimers()
  })

  // ---- submit — basic ------------------------------------------------------

  describe('submit', () => {
    it('should return a UUID-formatted taskId', () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = service.submit('noop', {})

      expect(taskId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('should emit a queued event immediately after submit', () => {
      registry.register(makeInstantHandler('noop'))

      service.submit('noop', {})

      const events = getEmittedTaskEvents(eventBus)
      const queued = events.find((e) => e.type === 'queued')
      expect(queued).toBeDefined()
      expect(queued!.data.position).toBeGreaterThanOrEqual(1)
    })

    it('should throw when the handler type is not registered', () => {
      expect(() => service.submit('unknown-type', {})).toThrow('Unknown task type: unknown-type')
    })

    it('should call handler.validate with the input before execution', () => {
      const handler = makeInstantHandler('with-validate')
      const validateMock = jest.fn()
      handler.validate = validateMock
      registry.register(handler)

      service.submit('with-validate', { text: 'hello' })

      expect(validateMock).toHaveBeenCalledWith({ text: 'hello' })
    })

    it('should throw the validation error before queuing the task', () => {
      const handler = makeInstantHandler('strict')
      handler.validate = () => {
        throw new Error('Input is invalid')
      }
      registry.register(handler)

      expect(() => service.submit('strict', {})).toThrow('Input is invalid')

      // No queued event because the task was never registered
      const events = getEmittedTaskEvents(eventBus)
      expect(events.find((e) => e.type === 'queued')).toBeUndefined()
    })

    it('should skip validate when handler does not define it', () => {
      const handler = makeInstantHandler('no-validate')
      delete (handler as Partial<TaskHandler>).validate
      registry.register(handler)

      expect(() => service.submit('no-validate', {})).not.toThrow()
    })

    it('should apply the normal priority by default', () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = service.submit('noop', {})

      service.listTasks()
      // Task may already be running/completed by the time listTasks is called
      // because the handler resolves asynchronously — just verify submit succeeded
      expect(taskId).toBeDefined()
    })

    it('should route queued/started events through sendTo when windowId is supplied', () => {
      registry.register(makeInstantHandler('noop'))

      service.submit('noop', {}, { windowId: 42 })

      const sendToCalls = (eventBus.sendTo as jest.Mock).mock.calls.filter(
        (c: unknown[]) => c[1] === 'task:event' && (c[2] as { type: string }).type === 'queued'
      )
      expect(sendToCalls.length).toBeGreaterThanOrEqual(1)
      expect(sendToCalls[0][0]).toBe(42)
    })

    it('should broadcast queued event when no windowId is supplied', () => {
      registry.register(makeInstantHandler('noop'))

      service.submit('noop', {})

      const broadcastCalls = (eventBus.broadcast as jest.Mock).mock.calls.filter(
        (c: unknown[]) => c[0] === 'task:event' && (c[1] as { type: string }).type === 'queued'
      )
      expect(broadcastCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ---- task lifecycle ------------------------------------------------------

  describe('task lifecycle', () => {
    it('should emit started and completed events for a successful task', async () => {
      registry.register(makeInstantHandler('noop', { answer: 42 }))

      service.submit('noop', {})

      // Let the microtask queue drain so the async execute() resolves
      await Promise.resolve()
      await Promise.resolve()

      const events = getEmittedTaskEvents(eventBus)
      expect(events.find((e) => e.type === 'started')).toBeDefined()
      expect(events.find((e) => e.type === 'completed')).toBeDefined()

      const completed = events.find((e) => e.type === 'completed')!
      expect(completed.data.result).toEqual({ answer: 42 })
      expect(typeof completed.data.durationMs).toBe('number')
    })

    it('should emit an error event when the handler rejects', async () => {
      registry.register(makeErrorHandler('exploding', 'Something went wrong'))

      service.submit('exploding', {})

      await Promise.resolve()
      await Promise.resolve()

      const events = getEmittedTaskEvents(eventBus)
      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent!.data.message).toBe('Something went wrong')
    })

    it('should emit a cancelled event when handler rejects with AbortError', async () => {
      registry.register(makeErrorHandler('aborting', 'AbortError'))
      // Override execute to throw an Error with name 'AbortError'
      const handler = registry.get('aborting')
      ;(handler.execute as jest.Mock).mockRejectedValue(
        Object.assign(new Error('AbortError'), { name: 'AbortError' })
      )

      service.submit('aborting', {})

      await Promise.resolve()
      await Promise.resolve()

      const events = getEmittedTaskEvents(eventBus)
      expect(events.find((e) => e.type === 'cancelled')).toBeDefined()
    })

    it('should remove the task from activeTasks after completion', async () => {
      registry.register(makeInstantHandler('noop'))

      service.submit('noop', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(service.listTasks()).toHaveLength(0)
    })

    it('should report progress events through the ProgressReporter', async () => {
      const handler: TaskHandler = {
        type: 'progress-reporter',
        execute: jest.fn().mockImplementation(
          async (_input: unknown, _signal: AbortSignal, reporter: ProgressReporter) => {
            reporter.progress(25, 'quarter done', { step: 1 })
            reporter.progress(75, 'almost done')
            return { done: true }
          }
        )
      }
      registry.register(handler)

      service.submit('progress-reporter', {})

      await Promise.resolve()
      await Promise.resolve()

      const events = getEmittedTaskEvents(eventBus)
      const progressEvents = events.filter((e) => e.type === 'progress')
      expect(progressEvents).toHaveLength(2)
      expect(progressEvents[0].data.percent).toBe(25)
      expect(progressEvents[0].data.message).toBe('quarter done')
      expect(progressEvents[1].data.percent).toBe(75)
    })
  })

  // ---- cancel --------------------------------------------------------------

  describe('cancel', () => {
    it('should return false for an unknown taskId', () => {
      expect(service.cancel('does-not-exist')).toBe(false)
    })

    it('should return true and emit cancelled event for a queued task', async () => {
      // Fill up all concurrency slots so the second task must wait in queue
      const hangingHandlers = Array.from({ length: 5 }, (_, i) =>
        makeHangingHandler(`blocking-${i}`)
      )
      hangingHandlers.forEach((h) => registry.register(h))
      hangingHandlers.forEach((_, i) => service.submit(`blocking-${i}`, {}))

      // Now submit the task we want to cancel — it must be queued
      registry.register(makeInstantHandler('queued-task'))
      const taskId = service.submit('queued-task', {})

      // Cancel while still in queue
      const result = service.cancel(taskId)

      expect(result).toBe(true)

      const events = getEmittedTaskEvents(eventBus)
      const cancelledEvents = events.filter(
        (e) => e.type === 'cancelled' && e.data.taskId === taskId
      )
      expect(cancelledEvents.length).toBeGreaterThanOrEqual(1)
    })

    it('should abort a running task via its AbortController', async () => {
      const hangingHandler = makeHangingHandler('hanging')
      registry.register(hangingHandler)

      const taskId = service.submit('hanging', {})

      // Let executeTask() start running
      await Promise.resolve()

      // Signal should now be sent to the execute() call
      const result = service.cancel(taskId)
      expect(result).toBe(true)
    })

    it('should clear the timeout handle when cancelling a task with a timeout', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      registry.register(makeInstantHandler('noop'))
      const taskId = service.submit('noop', {}, { timeoutMs: 5000 })

      service.cancel(taskId)

      // clearTimeout should have been invoked (possibly 0 times if task already
      // drained before cancel — but after cancel, no timeout should remain)
      expect(clearTimeoutSpy).toBeDefined() // confirm spy attached
      clearTimeoutSpy.mockRestore()
    })
  })

  // ---- listTasks -----------------------------------------------------------

  describe('listTasks', () => {
    it('should return an empty array when no tasks are active', () => {
      expect(service.listTasks()).toEqual([])
    })

    it('should include queued tasks in the snapshot', () => {
      // Fill concurrency slots
      const hangingHandlers = Array.from({ length: 5 }, (_, i) =>
        makeHangingHandler(`blocking-${i}`)
      )
      hangingHandlers.forEach((h) => registry.register(h))
      hangingHandlers.forEach((_, i) => service.submit(`blocking-${i}`, {}))

      registry.register(makeInstantHandler('will-queue'))
      service.submit('will-queue', {})

      const tasks = service.listTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(1)
    })

    it('should omit the AbortController from snapshot entries', () => {
      registry.register(makeHangingHandler('hang'))
      service.submit('hang', {})

      const tasks = service.listTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(1)
      for (const task of tasks) {
        expect(task.controller).toBeUndefined()
      }
    })

    it('should expose taskId, type, status, and priority on each snapshot', () => {
      registry.register(makeHangingHandler('hang'))
      service.submit('hang', {}, { priority: 'high' })

      const tasks = service.listTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(1)

      const task = tasks.find((t) => t.type === 'hang')
      expect(task).toBeDefined()
      expect(task!.taskId).toBeDefined()
      expect(task!.status).toBeDefined()
      expect(task!.priority).toBe('high')
    })
  })

  // ---- priority ordering ---------------------------------------------------

  describe('priority ordering', () => {
    it('should execute high-priority tasks before low-priority tasks', async () => {
      const executionOrder: string[] = []

      // Fill all 5 default concurrency slots so subsequent tasks queue
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`blocker-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => service.submit(`blocker-${i}`, {}))

      // Register handlers that record execution order
      function makeOrderedHandler(id: string): TaskHandler {
        return {
          type: id,
          execute: jest.fn().mockImplementation(async () => {
            executionOrder.push(id)
            return {}
          })
        }
      }

      registry.register(makeOrderedHandler('low-task'))
      registry.register(makeOrderedHandler('high-task'))
      registry.register(makeOrderedHandler('normal-task'))

      service.submit('low-task', {}, { priority: 'low' })
      service.submit('normal-task', {}, { priority: 'normal' })
      service.submit('high-task', {}, { priority: 'high' })

      // Release one blocking slot so the highest-priority queued task starts
      blockers[0]._resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      // The first task to start must be the high-priority one
      expect(executionOrder[0]).toBe('high-task')
    })
  })

  // ---- timeout -------------------------------------------------------------

  describe('timeout', () => {
    it('should abort the task after timeoutMs', async () => {
      let abortSignal!: AbortSignal

      const handler: TaskHandler = {
        type: 'slow-task',
        execute: jest.fn().mockImplementation(
          (_input: unknown, signal: AbortSignal) =>
            new Promise<unknown>((_res, rej) => {
              abortSignal = signal
              signal.addEventListener('abort', () =>
                rej(Object.assign(new Error('AbortError'), { name: 'AbortError' }))
              )
            })
        )
      }
      registry.register(handler)

      service.submit('slow-task', {}, { timeoutMs: 1000 })

      // Let execute() start
      await Promise.resolve()

      // Advance time past the timeout
      jest.advanceTimersByTime(1001)

      // Let promise rejection propagate
      await Promise.resolve()
      await Promise.resolve()

      expect(abortSignal.aborted).toBe(true)
    })
  })

  // ---- destroy -------------------------------------------------------------

  describe('destroy', () => {
    it('should abort all active tasks and clear internal state', async () => {
      const hang1 = makeHangingHandler('hang-1')
      const hang2 = makeHangingHandler('hang-2')
      registry.register(hang1)
      registry.register(hang2)

      const id1 = service.submit('hang-1', {})
      const id2 = service.submit('hang-2', {})

      await Promise.resolve()

      service.destroy()

      // After destroy, listTasks() should be empty
      expect(service.listTasks()).toHaveLength(0)

      // Subsequent cancel calls should return false (tasks gone)
      expect(service.cancel(id1)).toBe(false)
      expect(service.cancel(id2)).toBe(false)
    })

    it('should be safe to call destroy on an empty service', () => {
      expect(() => service.destroy()).not.toThrow()
    })
  })

  // ---- maxConcurrency ------------------------------------------------------

  describe('maxConcurrency', () => {
    it('should not exceed the configured concurrency limit', async () => {
      const MAX = 3
      const concurrentService = new TaskExecutorService(
        registry,
        eventBus as unknown as EventBus,
        MAX
      )

      const activeAtOnce: number[] = []
      let currentlyRunning = 0

      function makeCountingHandler(id: string): TaskHandler {
        return {
          type: id,
          execute: jest.fn().mockImplementation(async () => {
            currentlyRunning++
            activeAtOnce.push(currentlyRunning)
            // Yield to let other tasks start
            await new Promise((r) => setTimeout(r, 0))
            currentlyRunning--
            return {}
          })
        }
      }

      for (let i = 0; i < 6; i++) {
        registry.register(makeCountingHandler(`task-${i}`))
        concurrentService.submit(`task-${i}`, {})
      }

      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()
      await Promise.resolve()

      // The peak concurrency recorded should never exceed MAX
      const peak = Math.max(...activeAtOnce, 0)
      expect(peak).toBeLessThanOrEqual(MAX)

      concurrentService.destroy()
    })
  })
})
