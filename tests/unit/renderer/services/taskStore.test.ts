/**
 * Tests for taskStore (renderer-side singleton).
 *
 * Testing strategy:
 *  - taskStore is a module-level singleton. To achieve test isolation we reset
 *    state between tests by removing tasks with removeTask (via internal API)
 *    or by re-importing the module fresh using jest.resetModules().
 *  - We use jest.isolateModules() so each describe block can import a clean
 *    module instance without cross-test state pollution.
 *  - window.tasksManager is NOT exercised here (ensureListening is not called);
 *    we exercise the pure store API directly: addTask, applyEvent,
 *    getTaskSnapshot, subscribe, getTrackedIds.
 *
 * Cases covered:
 *  - addTask(): creates a TrackedTaskState with queued status and default progress
 *  - addTask(): is idempotent (second call with same taskId is a no-op)
 *  - addTask(): notifies listeners on the specific taskId key and 'ALL'
 *  - applyEvent('queued'): updates queuePosition
 *  - applyEvent('started'): transitions status to 'running', clears queuePosition
 *  - applyEvent('progress'): updates progress percent, message, detail
 *  - applyEvent('completed'): sets status, result, durationMs, 100% progress
 *  - applyEvent('error'): sets status to 'error' and error message
 *  - applyEvent('cancelled'): sets status to 'cancelled'
 *  - applyEvent('stream'): keeps status 'running', appends event record (no content field)
 *  - applyEvent('priority-changed'): updates priority and queuePosition
 *  - applyEvent('queue-position'): updates queuePosition only
 *  - applyEvent(): ignores events for unknown taskId (non-queued events)
 *  - applyEvent('queued'): auto-creates a task entry if taskId not tracked yet
 *  - subscribe(): fires callback when patched
 *  - subscribe(): returns an unsubscribe function that stops notifications
 *  - getTrackedIds(): reflects added tasks
 *  - TrackedTaskState has NO streamedContent, content, or seedContent fields
 *  - events ring-buffer: oldest event is dropped once MAX_EVENT_HISTORY is reached
 */

// We use jest.isolateModules to get a fresh singleton for each test group.

// ---------------------------------------------------------------------------
// Helper: build a fresh store
// ---------------------------------------------------------------------------

function loadFreshStore() {
  // We require inside isolateModules — but tests call this helper
  // inside a jest.isolateModules block, so each call gets a fresh module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../../../src/renderer/src/services/taskStore')
}

// ---------------------------------------------------------------------------
// addTask()
// ---------------------------------------------------------------------------

describe('taskStore — addTask()', () => {
  it('creates a TrackedTaskState with queued status and default progress', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t1', 'demo', 'normal')

      const snap = store.getTaskSnapshot('t1')
      expect(snap).toBeDefined()
      expect(snap.taskId).toBe('t1')
      expect(snap.type).toBe('demo')
      expect(snap.status).toBe('queued')
      expect(snap.priority).toBe('normal')
      expect(snap.progress).toEqual({ percent: 0 })
      expect(Array.isArray(snap.events)).toBe(true)
    })
  })

  it('defaults priority to normal when not specified', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t-default', 'type-x')

      const snap = store.getTaskSnapshot('t-default')
      expect(snap.priority).toBe('normal')
    })
  })

  it('is idempotent — second call with same taskId does not overwrite', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('dup', 'demo', 'high')
      // Apply an event to mutate state
      store.applyEvent({ type: 'started', data: { taskId: 'dup' } })

      // Second addTask should be a no-op
      store.addTask('dup', 'demo', 'high')

      const snap = store.getTaskSnapshot('dup')
      expect(snap.status).toBe('running') // not reset to 'queued'
    })
  })

  it('notifies subscribers on the taskId key and ALL after addTask', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      const specificCb = jest.fn()
      const allCb = jest.fn()
      store.subscribe('t-notify', specificCb)
      store.subscribe('ALL', allCb)

      store.addTask('t-notify', 'demo', 'normal')

      expect(specificCb).toHaveBeenCalledTimes(1)
      expect(allCb).toHaveBeenCalledTimes(1)
    })
  })

  it('TrackedTaskState has no streamedContent, content, or seedContent fields', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('check-fields', 'demo', 'normal')

      const snap = store.getTaskSnapshot('check-fields')
      expect(snap).not.toHaveProperty('streamedContent')
      expect(snap).not.toHaveProperty('content')
      expect(snap).not.toHaveProperty('seedContent')
    })
  })
})

// ---------------------------------------------------------------------------
// applyEvent()
// ---------------------------------------------------------------------------

describe('taskStore — applyEvent()', () => {
  it("auto-creates the task entry on a 'queued' event for an unknown taskId", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.applyEvent({ type: 'queued', data: { taskId: 'auto-q', position: 3 } })

      const snap = store.getTaskSnapshot('auto-q')
      expect(snap).toBeDefined()
      expect(snap.status).toBe('queued')
      expect(snap.queuePosition).toBe(3)
    })
  })

  it("updates queuePosition on 'queued' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'queued', data: { taskId: 't', position: 5 } })

      expect(store.getTaskSnapshot('t').queuePosition).toBe(5)
    })
  })

  it("transitions status to 'running' and clears queuePosition on 'started'", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'queued', data: { taskId: 't', position: 2 } })
      store.applyEvent({ type: 'started', data: { taskId: 't' } })

      const snap = store.getTaskSnapshot('t')
      expect(snap.status).toBe('running')
      expect(snap.queuePosition).toBeUndefined()
    })
  })

  it("updates progress fields on 'progress' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({
        type: 'progress',
        data: { taskId: 't', percent: 42, message: 'Halfway there', detail: { step: 2 } }
      })

      const snap = store.getTaskSnapshot('t')
      expect(snap.status).toBe('running')
      expect(snap.progress.percent).toBe(42)
      expect(snap.progress.message).toBe('Halfway there')
      expect(snap.progress.detail).toEqual({ step: 2 })
    })
  })

  it("sets status 'completed', result, durationMs, and 100% progress on 'completed'", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({
        type: 'completed',
        data: { taskId: 't', result: { answer: 42 }, durationMs: 1234 }
      })

      const snap = store.getTaskSnapshot('t')
      expect(snap.status).toBe('completed')
      expect(snap.result).toEqual({ answer: 42 })
      expect(snap.durationMs).toBe(1234)
      expect(snap.progress.percent).toBe(100)
      expect(snap.queuePosition).toBeUndefined()
    })
  })

  it("sets status 'error' and stores error message on 'error' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({
        type: 'error',
        data: { taskId: 't', message: 'Something failed', code: 'ERR_001' }
      })

      const snap = store.getTaskSnapshot('t')
      expect(snap.status).toBe('error')
      expect(snap.error).toBe('Something failed')
      expect(snap.queuePosition).toBeUndefined()
    })
  })

  it("sets status 'cancelled' and clears queuePosition on 'cancelled' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'queued', data: { taskId: 't', position: 1 } })
      store.applyEvent({ type: 'cancelled', data: { taskId: 't' } })

      const snap = store.getTaskSnapshot('t')
      expect(snap.status).toBe('cancelled')
      expect(snap.queuePosition).toBeUndefined()
    })
  })

  it("keeps status 'running' on 'stream' event and records the event (no content field)", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'started', data: { taskId: 't' } })
      store.applyEvent({ type: 'stream', data: { taskId: 't', data: 'chunk-1' } })
      store.applyEvent({ type: 'stream', data: { taskId: 't', data: 'chunk-2' } })

      const snap = store.getTaskSnapshot('t')

      // Status stays 'running'
      expect(snap.status).toBe('running')

      // Each stream event is recorded in the events ring-buffer
      const streamEvents = snap.events.filter((e: { type: string }) => e.type === 'stream')
      expect(streamEvents.length).toBe(2)

      // TrackedTaskState must NOT have any content-accumulation fields
      expect(snap).not.toHaveProperty('streamedContent')
      expect(snap).not.toHaveProperty('content')
      expect(snap).not.toHaveProperty('seedContent')
    })
  })

  it("updates priority and queuePosition on 'priority-changed' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({
        type: 'priority-changed',
        data: { taskId: 't', priority: 'high', position: 1 }
      })

      const snap = store.getTaskSnapshot('t')
      expect(snap.priority).toBe('high')
      expect(snap.queuePosition).toBe(1)
    })
  })

  it("updates queuePosition only on 'queue-position' event", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'queue-position', data: { taskId: 't', position: 4 } })

      const snap = store.getTaskSnapshot('t')
      expect(snap.queuePosition).toBe(4)
    })
  })

  it('ignores non-queued events for an unknown taskId', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      // 'started' for a taskId that was never added should be silently dropped
      store.applyEvent({ type: 'started', data: { taskId: 'ghost-task' } })

      expect(store.getTaskSnapshot('ghost-task')).toBeUndefined()
    })
  })

  it('records each event in the events array', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')
      store.applyEvent({ type: 'started', data: { taskId: 't' } })
      store.applyEvent({ type: 'progress', data: { taskId: 't', percent: 50 } })

      const snap = store.getTaskSnapshot('t')
      expect(snap.events.length).toBeGreaterThanOrEqual(2)

      const types = snap.events.map((e: { type: string }) => e.type)
      expect(types).toContain('started')
      expect(types).toContain('progress')
    })
  })

  it('drops the oldest event when the ring-buffer is full (MAX_EVENT_HISTORY = 50)', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()
      const MAX = 50

      store.addTask('t', 'demo', 'normal')

      // Overflow the buffer by one
      for (let i = 0; i < MAX + 1; i++) {
        store.applyEvent({
          type: 'progress',
          data: { taskId: 't', percent: i }
        })
      }

      const snap = store.getTaskSnapshot('t')
      expect(snap.events.length).toBe(MAX)
      // The oldest event (percent=0) should have been evicted
      const firstPercent = (snap.events[0].data as { percent: number }).percent
      expect(firstPercent).toBeGreaterThan(0)
    })
  })
})

// ---------------------------------------------------------------------------
// subscribe()
// ---------------------------------------------------------------------------

describe('taskStore — subscribe()', () => {
  it('fires callback immediately when store state changes for subscribed key', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')

      const cb = jest.fn()
      store.subscribe('t', cb)

      store.applyEvent({ type: 'started', data: { taskId: 't' } })

      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  it("fires 'ALL' subscriber on every patch", () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')

      const allCb = jest.fn()
      store.subscribe('ALL', allCb)

      store.applyEvent({ type: 'started', data: { taskId: 't' } })
      store.applyEvent({ type: 'completed', data: { taskId: 't', result: null, durationMs: 10 } })

      expect(allCb).toHaveBeenCalledTimes(2)
    })
  })

  it('unsubscribes correctly — callback no longer fires after unsub()', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t', 'demo', 'normal')

      const cb = jest.fn()
      const unsub = store.subscribe('t', cb)

      // Fire once
      store.applyEvent({ type: 'started', data: { taskId: 't' } })
      expect(cb).toHaveBeenCalledTimes(1)

      // Unsubscribe and fire again
      unsub()
      store.applyEvent({ type: 'progress', data: { taskId: 't', percent: 50 } })

      expect(cb).toHaveBeenCalledTimes(1) // no additional calls
    })
  })

  it('does not call other subscribers when an unrelated task is patched', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('t-a', 'demo', 'normal')
      store.addTask('t-b', 'demo', 'normal')

      const cbA = jest.fn()
      store.subscribe('t-a', cbA)

      store.applyEvent({ type: 'started', data: { taskId: 't-b' } })

      expect(cbA).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// getTrackedIds()
// ---------------------------------------------------------------------------

describe('taskStore — getTrackedIds()', () => {
  it('returns an empty Set before any tasks are added', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      expect(store.getTrackedIds().size).toBe(0)
    })
  })

  it('reflects tasks after addTask()', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('x', 'demo', 'normal')
      store.addTask('y', 'demo', 'normal')

      const ids = store.getTrackedIds()
      expect(ids.has('x')).toBe(true)
      expect(ids.has('y')).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// getAllTasksSnapshot()
// ---------------------------------------------------------------------------

describe('taskStore — getAllTasksSnapshot()', () => {
  it('returns an array of TaskInfo objects for all tracked tasks', () => {
    jest.isolateModules(() => {
      const store = loadFreshStore()

      store.addTask('a', 'type-a', 'high')
      store.addTask('b', 'type-b', 'low')

      const all = store.getAllTasksSnapshot()
      expect(all.length).toBe(2)

      const ids = all.map((t: { taskId: string }) => t.taskId)
      expect(ids).toContain('a')
      expect(ids).toContain('b')
    })
  })
})
