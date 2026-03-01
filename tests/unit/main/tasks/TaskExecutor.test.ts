/**
 * Tests for TaskExecutor.
 *
 * Testing strategy:
 *  - TaskExecutor is instantiated with a real TaskHandlerRegistry and a mocked
 *    EventBus (only broadcast/sendTo/emit need to be mocked).
 *  - Fake timers are used for timeout and GC interval tests.
 *  - All async task execution is driven by Promise.resolve() microtask flushes
 *    and jest.runAllTimersAsync() where needed.
 *
 * Cases covered:
 *  - submit(): returns taskId (UUID by default, custom via options)
 *  - submit(): emits queued event immediately
 *  - submit(): starts task right away when a concurrency slot is free
 *  - submit(): queues task when all concurrency slots are full
 *  - submit(): respects maxConcurrency limit
 *  - submit(): high → normal → low priority ordering
 *  - submit(): FIFO within the same priority band
 *  - submit(): custom taskId via options.taskId
 *  - cancel(): returns false for unknown taskId
 *  - cancel(): removes queued task, emits cancelled event
 *  - cancel(): aborts a running task via AbortController
 *  - cancelByWindow(): cancels all tasks for a given windowId
 *  - cancelByWindow(): returns count of cancelled tasks
 *  - updatePriority(): reorders queue, emits priority-changed event
 *  - updatePriority(): returns false for unknown or non-queued task
 *  - getTaskResult(): returns active (queued/running) task
 *  - getTaskResult(): returns completed task within TTL
 *  - getTaskResult(): returns undefined after TTL expires
 *  - getQueueStatus(): returns correct queued/running/completed counts
 *  - listTasks(): returns snapshot without controller
 *  - destroy(): aborts all tasks and clears state
 *  - timeout support: task is aborted after timeoutMs
 *  - progress reporter: emits progress events during execution
 *  - stream reporter: emits stream events with raw data batches
 *  - error handler: emits error event on non-abort error
 *  - abort error: emits cancelled event when handler throws AbortError
 */

import { TaskExecutor } from '../../../../src/main/taskManager/TaskExecutor'
import { TaskHandlerRegistry } from '../../../../src/main/taskManager/TaskHandlerRegistry'
import type { TaskHandler, ProgressReporter, StreamReporter } from '../../../../src/main/taskManager/TaskHandler'
import type { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Mock EventBus
// ---------------------------------------------------------------------------

function makeEventBus(): jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo' | 'emit'>> {
  return {
    broadcast: jest.fn(),
    sendTo: jest.fn(),
    emit: jest.fn(),
  }
}

// ---------------------------------------------------------------------------
// Handler factories
// ---------------------------------------------------------------------------

/** Handler that resolves immediately on the next microtask. */
function makeInstantHandler(type: string, result: unknown = { done: true }): TaskHandler {
  return {
    type,
    execute: jest.fn().mockResolvedValue(result),
  }
}

/** Handler that never resolves until manually released or aborted. */
function makeHangingHandler(type: string): TaskHandler & { _resolve: () => void } {
  let resolveFn!: () => void
  const readyP = new Promise<void>((r) => { resolveFn = r })

  const handler: TaskHandler & { _resolve: () => void } = {
    type,
    execute: jest.fn().mockImplementation((_input: unknown, signal: AbortSignal) =>
      new Promise<unknown>((res, rej) => {
        signal.addEventListener('abort', () => {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          rej(err)
        }, { once: true })
        readyP.then(() => res({ done: true }))
      })
    ),
    _resolve: resolveFn,
  }

  return handler
}

/** Handler that rejects immediately with a regular error. */
function makeErrorHandler(type: string, message = 'handler exploded'): TaskHandler {
  return {
    type,
    execute: jest.fn().mockRejectedValue(new Error(message)),
  }
}

/** Handler that throws an AbortError (to simulate abort-during-execute). */
function makeAbortErrorHandler(type: string): TaskHandler {
  return {
    type,
    execute: jest.fn().mockRejectedValue(
      Object.assign(new Error('AbortError'), { name: 'AbortError' })
    ),
  }
}

// ---------------------------------------------------------------------------
// Event extraction helpers
// ---------------------------------------------------------------------------

/** Collect all task:event payloads from both broadcast and sendTo calls. */
function getTaskEvents(
  bus: jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo' | 'emit'>>
): Array<{ type: string; data: Record<string, unknown> }> {
  const fromBroadcast = (bus.broadcast as jest.Mock).mock.calls
    .filter((c: unknown[]) => c[0] === 'task:event')
    .map((c: unknown[]) => c[1] as { type: string; data: Record<string, unknown> })

  const fromSendTo = (bus.sendTo as jest.Mock).mock.calls
    .filter((c: unknown[]) => c[1] === 'task:event')
    .map((c: unknown[]) => c[2] as { type: string; data: Record<string, unknown> })

  return [...fromBroadcast, ...fromSendTo]
}

function findEvent(
  bus: jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo' | 'emit'>>,
  type: string,
  taskId?: string
) {
  return getTaskEvents(bus).find(
    (e) => e.type === type && (taskId === undefined || e.data.taskId === taskId)
  )
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe('TaskExecutor', () => {
  let registry: TaskHandlerRegistry
  let eventBus: jest.Mocked<Pick<EventBus, 'broadcast' | 'sendTo' | 'emit'>>
  let executor: TaskExecutor
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    registry = new TaskHandlerRegistry()
    eventBus = makeEventBus()
    // Default maxConcurrency = 5 matches the source default
    executor = new TaskExecutor(registry, eventBus as unknown as EventBus)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    executor.destroy()
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    jest.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // submit()
  // -------------------------------------------------------------------------

  describe('submit()', () => {
    it('returns a UUID-formatted taskId by default', () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = executor.submit('noop', {})

      expect(taskId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('uses a custom taskId when provided via options', () => {
      registry.register(makeInstantHandler('noop'))

      const CUSTOM_ID = 'my-custom-id-123'
      const taskId = executor.submit('noop', {}, { taskId: CUSTOM_ID })

      expect(taskId).toBe(CUSTOM_ID)
    })

    it('emits a queued event immediately on submit', () => {
      registry.register(makeInstantHandler('noop'))

      executor.submit('noop', {})

      const queuedEvent = findEvent(eventBus, 'queued')
      expect(queuedEvent).toBeDefined()
      expect(typeof queuedEvent!.data.taskId).toBe('string')
      expect(typeof queuedEvent!.data.position).toBe('number')
      expect(queuedEvent!.data.position).toBeGreaterThanOrEqual(1)
    })

    it('starts task immediately when a concurrency slot is available', async () => {
      registry.register(makeInstantHandler('noop'))

      executor.submit('noop', {})

      // Let the executeTask microtask run
      await Promise.resolve()
      await Promise.resolve()

      const startedEvent = findEvent(eventBus, 'started')
      expect(startedEvent).toBeDefined()
    })

    it('queues task when all concurrency slots are full (maxConcurrency=2)', async () => {
      const customExecutor = new TaskExecutor(registry, eventBus as unknown as EventBus, 2)

      const h1 = makeHangingHandler('h1')
      const h2 = makeHangingHandler('h2')
      registry.register(h1)
      registry.register(h2)
      registry.register(makeInstantHandler('noop'))

      // Fill both slots
      customExecutor.submit('h1', {})
      customExecutor.submit('h2', {})

      await Promise.resolve()

      // Third task should stay queued
      customExecutor.submit('noop', {})

      const status = customExecutor.getQueueStatus()
      expect(status.running).toBe(2)
      expect(status.queued).toBe(1)

      customExecutor.destroy()
    })

    it('respects maxConcurrency — never runs more tasks than the limit', async () => {
      const MAX = 3
      const customExecutor = new TaskExecutor(registry, eventBus as unknown as EventBus, MAX)

      let peak = 0
      let current = 0

      function makeCountingHandler(id: string): TaskHandler {
        return {
          type: id,
          execute: jest.fn().mockImplementation(async () => {
            current++
            peak = Math.max(peak, current)
            await new Promise<void>((r) => setTimeout(r, 0))
            current--
            return {}
          }),
        }
      }

      for (let i = 0; i < 6; i++) {
        registry.register(makeCountingHandler(`task-${i}`))
        customExecutor.submit(`task-${i}`, {})
      }

      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      expect(peak).toBeLessThanOrEqual(MAX)
      customExecutor.destroy()
    })

    it('executes high-priority tasks before low-priority tasks', async () => {
      const execOrder: string[] = []

      // Fill all 5 concurrency slots with hanging tasks
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`blocker-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`blocker-${i}`, {}))

      await Promise.resolve()

      // Queue three tasks with different priorities
      function makeOrderedHandler(id: string): TaskHandler {
        return {
          type: id,
          execute: jest.fn().mockImplementation(async () => { execOrder.push(id); return {} }),
        }
      }

      registry.register(makeOrderedHandler('low-task'))
      registry.register(makeOrderedHandler('normal-task'))
      registry.register(makeOrderedHandler('high-task'))

      executor.submit('low-task', {}, { priority: 'low' })
      executor.submit('normal-task', {}, { priority: 'normal' })
      executor.submit('high-task', {}, { priority: 'high' })

      // Release one blocker slot
      blockers[0]._resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      expect(execOrder[0]).toBe('high-task')
    })

    it('processes tasks FIFO within the same priority band', async () => {
      const execOrder: string[] = []

      // Fill slots
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`b-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`b-${i}`, {}))

      await Promise.resolve()

      // Enqueue three normal-priority tasks in order
      for (let i = 0; i < 3; i++) {
        const id = `normal-${i}`
        registry.register({
          type: id,
          execute: jest.fn().mockImplementation(async () => { execOrder.push(id); return {} }),
        })
      }
      executor.submit('normal-0', {}, { priority: 'normal' })
      executor.submit('normal-1', {}, { priority: 'normal' })
      executor.submit('normal-2', {}, { priority: 'normal' })

      // Release one slot at a time
      blockers[0]._resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      // First completed normal task must be normal-0
      expect(execOrder[0]).toBe('normal-0')
    })

    it('throws for an unknown task type', () => {
      expect(() => executor.submit('does-not-exist', {})).toThrow(
        'Unknown task type: does-not-exist'
      )
    })

    it('calls handler.validate() with the input before queuing', () => {
      const handler = makeInstantHandler('validated')
      const validateSpy = jest.fn()
      handler.validate = validateSpy
      registry.register(handler)

      executor.submit('validated', { key: 'value' })

      expect(validateSpy).toHaveBeenCalledWith({ key: 'value' })
    })

    it('throws the validation error before emitting any event', () => {
      const handler = makeInstantHandler('strict')
      handler.validate = () => { throw new Error('Invalid input') }
      registry.register(handler)

      expect(() => executor.submit('strict', {})).toThrow('Invalid input')
      expect(getTaskEvents(eventBus)).toHaveLength(0)
    })

    it('routes events via sendTo when windowId is provided', () => {
      registry.register(makeInstantHandler('noop'))

      executor.submit('noop', {}, { windowId: 42 })

      const sendToCalls = (eventBus.sendTo as jest.Mock).mock.calls.filter(
        (c: unknown[]) => c[0] === 42 && c[1] === 'task:event'
      )
      expect(sendToCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('broadcasts events when no windowId is provided', () => {
      registry.register(makeInstantHandler('noop'))

      executor.submit('noop', {})

      const broadcastCalls = (eventBus.broadcast as jest.Mock).mock.calls.filter(
        (c: unknown[]) => c[0] === 'task:event'
      )
      expect(broadcastCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('emits task:submitted on the EventBus after queuing', () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = executor.submit('noop', {})

      expect(eventBus.emit).toHaveBeenCalledWith(
        'task:submitted',
        expect.objectContaining({ taskId, taskType: 'noop' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Task lifecycle
  // -------------------------------------------------------------------------

  describe('task lifecycle', () => {
    it('emits started and completed events for a successful task', async () => {
      registry.register(makeInstantHandler('noop', { answer: 42 }))

      const taskId = executor.submit('noop', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(findEvent(eventBus, 'started', taskId)).toBeDefined()
      expect(findEvent(eventBus, 'completed', taskId)).toBeDefined()

      const completedEvent = findEvent(eventBus, 'completed', taskId)!
      expect(completedEvent.data.result).toEqual({ answer: 42 })
      expect(typeof completedEvent.data.durationMs).toBe('number')
    })

    it('emits an error event when the handler rejects with a non-abort error', async () => {
      registry.register(makeErrorHandler('boom', 'Something went wrong'))

      const taskId = executor.submit('boom', {})

      await Promise.resolve()
      await Promise.resolve()

      const errorEvent = findEvent(eventBus, 'error', taskId)
      expect(errorEvent).toBeDefined()
      expect(errorEvent!.data.message).toBe('Something went wrong')
      expect(typeof errorEvent!.data.code).toBe('string')
    })

    it('emits a cancelled event when handler throws an AbortError', async () => {
      registry.register(makeAbortErrorHandler('abort-task'))

      const taskId = executor.submit('abort-task', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(findEvent(eventBus, 'cancelled', taskId)).toBeDefined()
    })

    it('removes completed task from activeTasks (listTasks returns empty)', async () => {
      registry.register(makeInstantHandler('noop'))

      executor.submit('noop', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(executor.listTasks()).toHaveLength(0)
    })

    it('emits progress events via the ProgressReporter', async () => {
      const handler: TaskHandler = {
        type: 'progress-task',
        execute: jest.fn().mockImplementation(
          async (_input: unknown, _signal: AbortSignal, reporter: ProgressReporter) => {
            reporter.progress(25, 'Step 1', { detail: 'extra' })
            reporter.progress(75, 'Step 2')
            return { done: true }
          }
        ),
      }
      registry.register(handler)

      const taskId = executor.submit('progress-task', {})

      await Promise.resolve()
      await Promise.resolve()

      const progressEvents = getTaskEvents(eventBus).filter(
        (e) => e.type === 'progress' && e.data.taskId === taskId
      )
      expect(progressEvents).toHaveLength(2)
      expect(progressEvents[0].data.percent).toBe(25)
      expect(progressEvents[0].data.message).toBe('Step 1')
      expect(progressEvents[1].data.percent).toBe(75)
    })

    it('emits stream events via the StreamReporter with raw data batches', async () => {
      const handler: TaskHandler = {
        type: 'stream-task',
        execute: jest.fn().mockImplementation(
          async (
            _input: unknown,
            _signal: AbortSignal,
            _reporter: ProgressReporter,
            stream?: StreamReporter
          ) => {
            stream?.stream('chunk-A')
            stream?.stream('chunk-B')
            return { done: true }
          }
        ),
      }
      registry.register(handler)

      const taskId = executor.submit('stream-task', {})

      await Promise.resolve()
      await Promise.resolve()

      const streamEvents = getTaskEvents(eventBus).filter(
        (e) => e.type === 'stream' && e.data.taskId === taskId
      )
      expect(streamEvents).toHaveLength(2)
      // Each call delivers the raw batch — no accumulation in the executor
      expect(streamEvents[0].data.data).toBe('chunk-A')
      expect(streamEvents[1].data.data).toBe('chunk-B')
    })

    it('emits task:completed on EventBus for main-process observers', async () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = executor.submit('noop', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(eventBus.emit).toHaveBeenCalledWith(
        'task:completed',
        expect.objectContaining({ taskId, taskType: 'noop' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // cancel()
  // -------------------------------------------------------------------------

  describe('cancel()', () => {
    it('returns false for an unknown taskId', () => {
      expect(executor.cancel('non-existent-id')).toBe(false)
    })

    it('returns true and emits cancelled event for a queued task', () => {
      // Fill all concurrency slots so the next task must queue
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`block-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`block-${i}`, {}))

      registry.register(makeInstantHandler('queued'))
      const taskId = executor.submit('queued', {})

      const result = executor.cancel(taskId)

      expect(result).toBe(true)
      expect(findEvent(eventBus, 'cancelled', taskId)).toBeDefined()
    })

    it('aborts a running task via its AbortController', async () => {
      let capturedSignal!: AbortSignal
      const handler: TaskHandler = {
        type: 'slow',
        execute: jest.fn().mockImplementation(
          (_input: unknown, signal: AbortSignal) =>
            new Promise<unknown>((_res, rej) => {
              capturedSignal = signal
              signal.addEventListener('abort', () => {
                const e = new Error('AbortError'); e.name = 'AbortError'; rej(e)
              })
            })
        ),
      }
      registry.register(handler)

      const taskId = executor.submit('slow', {})

      // Let executeTask() start
      await Promise.resolve()

      executor.cancel(taskId)

      expect(capturedSignal.aborted).toBe(true)
    })

    it('emits task:cancelled on EventBus when cancelling a queued task', () => {
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`blk-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`blk-${i}`, {}))

      registry.register(makeInstantHandler('q'))
      const taskId = executor.submit('q', {})

      executor.cancel(taskId)

      expect(eventBus.emit).toHaveBeenCalledWith(
        'task:cancelled',
        expect.objectContaining({ taskId })
      )
    })
  })

  // -------------------------------------------------------------------------
  // cancelByWindow()
  // -------------------------------------------------------------------------

  describe('cancelByWindow()', () => {
    it('cancels all tasks owned by the given windowId', () => {
      const h1 = makeHangingHandler('win-task-1')
      const h2 = makeHangingHandler('win-task-2')
      const h3 = makeHangingHandler('other-task')
      registry.register(h1)
      registry.register(h2)
      registry.register(h3)

      const id1 = executor.submit('win-task-1', {}, { windowId: 7 })
      const id2 = executor.submit('win-task-2', {}, { windowId: 7 })
      executor.submit('other-task', {}, { windowId: 99 })

      const count = executor.cancelByWindow(7)

      expect(count).toBe(2)
      expect(executor.cancel(id1)).toBe(false) // already cancelled
      expect(executor.cancel(id2)).toBe(false)
    })

    it('returns 0 when no tasks belong to the windowId', () => {
      registry.register(makeHangingHandler('h'))
      executor.submit('h', {}, { windowId: 1 })

      expect(executor.cancelByWindow(999)).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // updatePriority()
  // -------------------------------------------------------------------------

  describe('updatePriority()', () => {
    it('returns false for an unknown taskId', () => {
      expect(executor.updatePriority('bad-id', 'high')).toBe(false)
    })

    it('returns false for a running task (not queued)', async () => {
      const h = makeHangingHandler('hang')
      registry.register(h)

      const taskId = executor.submit('hang', {})
      // Let it start running
      await Promise.resolve()

      expect(executor.updatePriority(taskId, 'high')).toBe(false)
    })

    it('reorders the queue and emits priority-changed event', () => {
      // Fill all concurrency slots so new tasks stay queued
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`pblk-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`pblk-${i}`, {}))

      registry.register(makeInstantHandler('low-q'))
      const taskId = executor.submit('low-q', {}, { priority: 'low' })

      const updated = executor.updatePriority(taskId, 'high')

      expect(updated).toBe(true)
      const event = findEvent(eventBus, 'priority-changed', taskId)
      expect(event).toBeDefined()
      expect(event!.data.priority).toBe('high')
    })
  })

  // -------------------------------------------------------------------------
  // getTaskResult()
  // -------------------------------------------------------------------------

  describe('getTaskResult()', () => {
    it('returns an active (queued) task', () => {
      const blockers = Array.from({ length: 5 }, (_, i) => makeHangingHandler(`gr-blk-${i}`))
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => executor.submit(`gr-blk-${i}`, {}))

      registry.register(makeInstantHandler('q'))
      const taskId = executor.submit('q', {})

      const task = executor.getTaskResult(taskId)
      expect(task).toBeDefined()
      expect(task!.taskId).toBe(taskId)
    })

    it('returns a completed task within its TTL', async () => {
      registry.register(makeInstantHandler('done', { x: 1 }))

      const taskId = executor.submit('done', {})

      await Promise.resolve()
      await Promise.resolve()

      // Task is no longer in activeTasks but should be in completedTasks
      expect(executor.listTasks()).toHaveLength(0)
      const result = executor.getTaskResult(taskId)
      expect(result).toBeDefined()
      expect(result!.status).toBe('completed')
    })

    it('returns undefined after the TTL has expired', async () => {
      registry.register(makeInstantHandler('ttl-task'))

      const taskId = executor.submit('ttl-task', {})

      await Promise.resolve()
      await Promise.resolve()

      // Advance time beyond the 5-minute TTL
      jest.advanceTimersByTime(5 * 60 * 1_000 + 1)

      const result = executor.getTaskResult(taskId)
      expect(result).toBeUndefined()
    })

    it('returns undefined for a completely unknown taskId', () => {
      expect(executor.getTaskResult('totally-unknown')).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // getQueueStatus()
  // -------------------------------------------------------------------------

  describe('getQueueStatus()', () => {
    it('returns all-zeros on an empty executor', () => {
      expect(executor.getQueueStatus()).toEqual({ queued: 0, running: 0, completed: 0 })
    })

    it('counts running and queued tasks correctly', async () => {
      const blockers = Array.from({ length: 2 }, (_, i) => makeHangingHandler(`qs-blk-${i}`))
      const customExecutor = new TaskExecutor(
        registry,
        eventBus as unknown as EventBus,
        2 // maxConcurrency = 2
      )
      blockers.forEach((h) => registry.register(h))
      blockers.forEach((_, i) => customExecutor.submit(`qs-blk-${i}`, {}))

      await Promise.resolve()

      registry.register(makeInstantHandler('q1'))
      customExecutor.submit('q1', {})

      const status = customExecutor.getQueueStatus()
      expect(status.running).toBe(2)
      expect(status.queued).toBe(1)

      customExecutor.destroy()
    })

    it('increments completed count after a task finishes', async () => {
      registry.register(makeInstantHandler('done'))

      executor.submit('done', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(executor.getQueueStatus().completed).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // listTasks()
  // -------------------------------------------------------------------------

  describe('listTasks()', () => {
    it('returns an empty array when no tasks are active', () => {
      expect(executor.listTasks()).toEqual([])
    })

    it('includes active tasks in the snapshot', () => {
      registry.register(makeHangingHandler('hang'))
      executor.submit('hang', {}, { priority: 'high' })

      const tasks = executor.listTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(1)
    })

    it('omits AbortController from snapshot entries (controller is undefined)', () => {
      registry.register(makeHangingHandler('hang'))
      executor.submit('hang', {})

      for (const task of executor.listTasks()) {
        expect(task.controller).toBeUndefined()
      }
    })

    it('exposes taskId, type, status, and priority on each entry', () => {
      registry.register(makeHangingHandler('hang'))
      executor.submit('hang', {}, { priority: 'low' })

      const task = executor.listTasks().find((t) => t.type === 'hang')
      expect(task).toBeDefined()
      expect(task!.taskId).toBeDefined()
      expect(task!.type).toBe('hang')
      expect(task!.status).toBeDefined()
      expect(task!.priority).toBe('low')
    })
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('aborts all in-flight tasks and clears internal state', async () => {
      const h1 = makeHangingHandler('d1')
      const h2 = makeHangingHandler('d2')
      registry.register(h1)
      registry.register(h2)

      const id1 = executor.submit('d1', {})
      const id2 = executor.submit('d2', {})

      await Promise.resolve()

      executor.destroy()

      expect(executor.listTasks()).toHaveLength(0)
      expect(executor.cancel(id1)).toBe(false)
      expect(executor.cancel(id2)).toBe(false)
    })

    it('is safe to call on an empty executor', () => {
      expect(() => executor.destroy()).not.toThrow()
    })

    it('is safe to call multiple times', () => {
      registry.register(makeInstantHandler('noop'))
      executor.submit('noop', {})
      executor.destroy()
      expect(() => executor.destroy()).not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // Timeout support
  // -------------------------------------------------------------------------

  describe('timeout support', () => {
    it('aborts the task after timeoutMs milliseconds', async () => {
      let capturedSignal!: AbortSignal

      const handler: TaskHandler = {
        type: 'slow-timeout',
        execute: jest.fn().mockImplementation(
          (_input: unknown, signal: AbortSignal) =>
            new Promise<unknown>((_res, rej) => {
              capturedSignal = signal
              signal.addEventListener('abort', () => {
                const err = new Error('AbortError'); err.name = 'AbortError'; rej(err)
              })
            })
        ),
      }
      registry.register(handler)

      executor.submit('slow-timeout', {}, { timeoutMs: 1000 })

      // Let execute() start
      await Promise.resolve()

      // Advance time past the timeout
      jest.advanceTimersByTime(1001)

      await Promise.resolve()
      await Promise.resolve()

      expect(capturedSignal.aborted).toBe(true)
    })

    it('emits cancelled event after timeout abort via AbortError', async () => {
      const handler: TaskHandler = {
        type: 'timeout-abort',
        execute: jest.fn().mockImplementation(
          (_input: unknown, signal: AbortSignal) =>
            new Promise<unknown>((_res, rej) => {
              signal.addEventListener('abort', () => {
                const err = new Error('AbortError'); err.name = 'AbortError'; rej(err)
              })
            })
        ),
      }
      registry.register(handler)

      const taskId = executor.submit('timeout-abort', {}, { timeoutMs: 500 })

      await Promise.resolve()
      jest.advanceTimersByTime(501)
      await Promise.resolve()
      await Promise.resolve()

      expect(findEvent(eventBus, 'cancelled', taskId)).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // EventBus main-process lifecycle events
  // -------------------------------------------------------------------------

  describe('EventBus main-process events', () => {
    it('emits task:started on EventBus when a task begins execution', async () => {
      registry.register(makeInstantHandler('noop'))

      const taskId = executor.submit('noop', {})

      await Promise.resolve()

      expect(eventBus.emit).toHaveBeenCalledWith(
        'task:started',
        expect.objectContaining({ taskId, taskType: 'noop' })
      )
    })

    it('emits task:failed on EventBus when handler throws a non-abort error', async () => {
      registry.register(makeErrorHandler('fail', 'oops'))

      const taskId = executor.submit('fail', {})

      await Promise.resolve()
      await Promise.resolve()

      expect(eventBus.emit).toHaveBeenCalledWith(
        'task:failed',
        expect.objectContaining({ taskId, taskType: 'fail', error: 'oops' })
      )
    })
  })
})
