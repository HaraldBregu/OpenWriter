/**
 * Tests for taskStore (renderer-side singleton).
 *
 * Testing strategy:
 *  - taskStore is a module-level singleton with module-level Maps and arrays.
 *    To guarantee isolation between tests we call jest.resetModules() in
 *    beforeEach so every test receives a freshly-loaded module instance.
 *  - We import all functions from the module-level named exports. The
 *    applyEvent function is not exported directly — we access it through
 *    the taskStore convenience object which re-exports all functions.
 *  - window.tasksManager is NOT exercised here (ensureListening is not called);
 *    we exercise the pure store API only.
 *
 * Cases covered:
 *  - addTask(): creates a TrackedTaskState with queued status and default progress
 *  - addTask(): defaults priority to 'normal' when not specified
 *  - addTask(): is idempotent — second call with same taskId is a no-op
 *  - addTask(): notifies listeners on the taskId key and 'ALL'
 *  - TrackedTaskState has no streamedContent, content, or seedContent fields
 *  - applyEvent('queued'): auto-creates task entry if not yet tracked
 *  - applyEvent('queued'): updates queuePosition
 *  - applyEvent('started'): transitions status to 'running', clears queuePosition
 *  - applyEvent('progress'): updates progress percent, message, detail
 *  - applyEvent('completed'): sets status, result, durationMs, 100% progress
 *  - applyEvent('error'): sets status 'error' and error message
 *  - applyEvent('cancelled'): sets status 'cancelled', clears queuePosition
 *  - applyEvent('stream'): keeps status 'running', records event (no content fields)
 *  - applyEvent('priority-changed'): updates priority and queuePosition
 *  - applyEvent('queue-position'): updates queuePosition only
 *  - applyEvent(): ignores events for unknown taskId (non-queued events)
 *  - applyEvent(): records each event in the events array
 *  - events ring-buffer: oldest event is dropped once MAX_EVENT_HISTORY (50) is reached
 *  - subscribe(): fires callback when patched
 *  - subscribe(): fires 'ALL' subscriber on every patch
 *  - subscribe(): returns an unsubscribe function that stops notifications
 *  - subscribe(): does not fire for unrelated taskId patches
 *  - getTrackedIds(): reflects added tasks
 *  - getAllTasksSnapshot(): returns TaskInfo entries for all tracked tasks
 */

// ---------------------------------------------------------------------------
// Types used across tests
// ---------------------------------------------------------------------------

interface TaskStoreModule {
  addTask: (taskId: string, type: string, priority?: string) => void
  getTaskSnapshot: (taskId: string) => Record<string, unknown> | undefined
  getAllTasksSnapshot: () => Array<Record<string, unknown>>
  subscribe: (key: string, listener: () => void) => () => void
  getTrackedIds: () => Set<string>
  taskStore: {
    applyEvent: (event: { type: string; data: Record<string, unknown> }) => void
    addTask: (taskId: string, type: string, priority?: string) => void
    getTaskSnapshot: (taskId: string) => Record<string, unknown> | undefined
    getAllTasksSnapshot: () => Array<Record<string, unknown>>
    subscribe: (key: string, listener: () => void) => () => void
    getTrackedIds: () => Set<string>
    ensureListening: () => void
  }
}

function loadStore(): TaskStoreModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../../../src/renderer/src/services/taskStore') as TaskStoreModule
}

// ---------------------------------------------------------------------------
// Test setup: fresh module per test
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.resetModules()
})

// ---------------------------------------------------------------------------
// addTask()
// ---------------------------------------------------------------------------

describe('taskStore — addTask()', () => {
  it('creates a TrackedTaskState with queued status and default progress', () => {
    const { addTask, getTaskSnapshot } = loadStore()

    addTask('t1', 'demo', 'normal')

    const snap = getTaskSnapshot('t1')
    expect(snap).toBeDefined()
    expect(snap!.taskId).toBe('t1')
    expect(snap!.type).toBe('demo')
    expect(snap!.status).toBe('queued')
    expect(snap!.priority).toBe('normal')
    expect(snap!.progress).toEqual({ percent: 0 })
    expect(Array.isArray(snap!.events)).toBe(true)
  })

  it("defaults priority to 'normal' when not specified", () => {
    const { addTask, getTaskSnapshot } = loadStore()

    addTask('t-default', 'type-x')

    expect(getTaskSnapshot('t-default')!.priority).toBe('normal')
  })

  it('is idempotent — second call with same taskId does not overwrite state', () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('dup', 'demo', 'high')
    taskStore.applyEvent({ type: 'started', data: { taskId: 'dup' } })

    // Second addTask on same id should be a no-op
    addTask('dup', 'demo', 'high')

    expect(getTaskSnapshot('dup')!.status).toBe('running') // not reset to 'queued'
  })

  it('notifies subscribers on the taskId key and ALL after addTask', () => {
    const { addTask, subscribe } = loadStore()

    const specificCb = jest.fn()
    const allCb = jest.fn()
    subscribe('t-notify', specificCb)
    subscribe('ALL', allCb)

    addTask('t-notify', 'demo', 'normal')

    expect(specificCb).toHaveBeenCalledTimes(1)
    expect(allCb).toHaveBeenCalledTimes(1)
  })

  it('TrackedTaskState has no streamedContent, content, or seedContent fields', () => {
    const { addTask, getTaskSnapshot } = loadStore()

    addTask('check-fields', 'demo', 'normal')

    const snap = getTaskSnapshot('check-fields')
    expect(snap).not.toHaveProperty('streamedContent')
    expect(snap).not.toHaveProperty('content')
    expect(snap).not.toHaveProperty('seedContent')
  })
})

// ---------------------------------------------------------------------------
// applyEvent()
// ---------------------------------------------------------------------------

describe("taskStore — applyEvent()", () => {
  it("auto-creates the task entry on a 'queued' event for an unknown taskId", () => {
    const { getTaskSnapshot, taskStore } = loadStore()

    taskStore.applyEvent({ type: 'queued', data: { taskId: 'auto-q', position: 3 } })

    const snap = getTaskSnapshot('auto-q')
    expect(snap).toBeDefined()
    expect(snap!.status).toBe('queued')
    expect(snap!.queuePosition).toBe(3)
  })

  it("updates queuePosition on 'queued' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'queued', data: { taskId: 't', position: 5 } })

    expect(getTaskSnapshot('t')!.queuePosition).toBe(5)
  })

  it("transitions status to 'running' and clears queuePosition on 'started'", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'queued', data: { taskId: 't', position: 2 } })
    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })

    const snap = getTaskSnapshot('t')!
    expect(snap.status).toBe('running')
    expect(snap.queuePosition).toBeUndefined()
  })

  it("updates progress fields on 'progress' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({
      type: 'progress',
      data: { taskId: 't', percent: 42, message: 'Halfway there', detail: { step: 2 } }
    })

    const snap = getTaskSnapshot('t')!
    expect(snap.status).toBe('running')
    expect((snap.progress as { percent: number }).percent).toBe(42)
    expect((snap.progress as { message: string }).message).toBe('Halfway there')
    expect((snap.progress as { detail: unknown }).detail).toEqual({ step: 2 })
  })

  it("sets status 'completed', result, durationMs, and 100% progress on 'completed'", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({
      type: 'completed',
      data: { taskId: 't', result: { answer: 42 }, durationMs: 1234 }
    })

    const snap = getTaskSnapshot('t')!
    expect(snap.status).toBe('completed')
    expect(snap.result).toEqual({ answer: 42 })
    expect(snap.durationMs).toBe(1234)
    expect((snap.progress as { percent: number }).percent).toBe(100)
    expect(snap.queuePosition).toBeUndefined()
  })

  it("sets status 'error' and stores error message on 'error' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({
      type: 'error',
      data: { taskId: 't', message: 'Something failed', code: 'ERR_001' }
    })

    const snap = getTaskSnapshot('t')!
    expect(snap.status).toBe('error')
    expect(snap.error).toBe('Something failed')
    expect(snap.queuePosition).toBeUndefined()
  })

  it("sets status 'cancelled' and clears queuePosition on 'cancelled' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'queued', data: { taskId: 't', position: 1 } })
    taskStore.applyEvent({ type: 'cancelled', data: { taskId: 't' } })

    const snap = getTaskSnapshot('t')!
    expect(snap.status).toBe('cancelled')
    expect(snap.queuePosition).toBeUndefined()
  })

  it("keeps status 'running' on 'stream' event and records event (no content fields)", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })
    taskStore.applyEvent({ type: 'stream', data: { taskId: 't', data: 'chunk-1' } })
    taskStore.applyEvent({ type: 'stream', data: { taskId: 't', data: 'chunk-2' } })

    const snap = getTaskSnapshot('t')!

    // Status stays 'running'
    expect(snap.status).toBe('running')

    // Stream events are recorded in the ring-buffer
    const events = snap.events as Array<{ type: string }>
    const streamEvents = events.filter((e) => e.type === 'stream')
    expect(streamEvents.length).toBe(2)

    // No content-accumulation fields on TrackedTaskState
    expect(snap).not.toHaveProperty('streamedContent')
    expect(snap).not.toHaveProperty('content')
    expect(snap).not.toHaveProperty('seedContent')
  })

  it("updates priority and queuePosition on 'priority-changed' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({
      type: 'priority-changed',
      data: { taskId: 't', priority: 'high', position: 1 }
    })

    const snap = getTaskSnapshot('t')!
    expect(snap.priority).toBe('high')
    expect(snap.queuePosition).toBe(1)
  })

  it("updates queuePosition only on 'queue-position' event", () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'queue-position', data: { taskId: 't', position: 4 } })

    expect(getTaskSnapshot('t')!.queuePosition).toBe(4)
  })

  it('ignores non-queued events for an unknown taskId (event is dropped)', () => {
    const { getTaskSnapshot, taskStore } = loadStore()

    taskStore.applyEvent({ type: 'started', data: { taskId: 'ghost-task' } })

    expect(getTaskSnapshot('ghost-task')).toBeUndefined()
  })

  it('records each applied event in the events array', () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')
    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })
    taskStore.applyEvent({ type: 'progress', data: { taskId: 't', percent: 50 } })

    const snap = getTaskSnapshot('t')!
    const events = snap.events as Array<{ type: string }>
    expect(events.length).toBeGreaterThanOrEqual(2)

    const types = events.map((e) => e.type)
    expect(types).toContain('started')
    expect(types).toContain('progress')
  })

  it('drops oldest event when ring-buffer reaches MAX_EVENT_HISTORY (50)', () => {
    const { addTask, getTaskSnapshot, taskStore } = loadStore()
    const MAX = 50

    addTask('t', 'demo', 'normal')

    // Submit MAX + 1 progress events to overflow the buffer
    for (let i = 0; i < MAX + 1; i++) {
      taskStore.applyEvent({
        type: 'progress',
        data: { taskId: 't', percent: i }
      })
    }

    const snap = getTaskSnapshot('t')!
    const events = snap.events as Array<{ type: string; data: { percent: number } }>
    expect(events.length).toBe(MAX)

    // The very first event (percent=0) must have been evicted
    const firstPercent = events[0].data.percent
    expect(firstPercent).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// subscribe()
// ---------------------------------------------------------------------------

describe('taskStore — subscribe()', () => {
  it('fires callback when the subscribed taskId is patched', () => {
    const { addTask, subscribe, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')

    const cb = jest.fn()
    subscribe('t', cb)

    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it("fires 'ALL' subscriber on every patch", () => {
    const { addTask, subscribe, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')

    const allCb = jest.fn()
    subscribe('ALL', allCb)

    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })
    taskStore.applyEvent({ type: 'completed', data: { taskId: 't', result: null, durationMs: 10 } })

    expect(allCb).toHaveBeenCalledTimes(2)
  })

  it('stops firing after the unsubscribe function is called', () => {
    const { addTask, subscribe, taskStore } = loadStore()

    addTask('t', 'demo', 'normal')

    const cb = jest.fn()
    const unsub = subscribe('t', cb)

    taskStore.applyEvent({ type: 'started', data: { taskId: 't' } })
    expect(cb).toHaveBeenCalledTimes(1)

    unsub()

    taskStore.applyEvent({ type: 'progress', data: { taskId: 't', percent: 50 } })
    expect(cb).toHaveBeenCalledTimes(1) // no extra call after unsub
  })

  it('does not call subscriber when an unrelated taskId is patched', () => {
    const { addTask, subscribe, taskStore } = loadStore()

    addTask('t-a', 'demo', 'normal')
    addTask('t-b', 'demo', 'normal')

    const cbA = jest.fn()
    subscribe('t-a', cbA)

    taskStore.applyEvent({ type: 'started', data: { taskId: 't-b' } })

    expect(cbA).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getTrackedIds()
// ---------------------------------------------------------------------------

describe('taskStore — getTrackedIds()', () => {
  it('returns an empty Set before any tasks are added', () => {
    const { getTrackedIds } = loadStore()

    expect(getTrackedIds().size).toBe(0)
  })

  it('reflects all tasks added via addTask()', () => {
    const { addTask, getTrackedIds } = loadStore()

    addTask('x', 'demo', 'normal')
    addTask('y', 'demo', 'normal')

    const ids = getTrackedIds()
    expect(ids.has('x')).toBe(true)
    expect(ids.has('y')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getAllTasksSnapshot()
// ---------------------------------------------------------------------------

describe('taskStore — getAllTasksSnapshot()', () => {
  it('returns TaskInfo entries for all tracked tasks', () => {
    const { addTask, getAllTasksSnapshot } = loadStore()

    addTask('a', 'type-a', 'high')
    addTask('b', 'type-b', 'low')

    const all = getAllTasksSnapshot()
    expect(all.length).toBe(2)

    const ids = all.map((t) => t.taskId)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })

  it('returns an empty array before any tasks are added', () => {
    const { getAllTasksSnapshot } = loadStore()

    expect(getAllTasksSnapshot()).toEqual([])
  })
})
