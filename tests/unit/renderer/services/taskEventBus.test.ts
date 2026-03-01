/**
 * Tests for taskEventBus (renderer-side singleton).
 *
 * Testing strategy:
 *  - taskEventBus is a module-level singleton. We use jest.isolateModules()
 *    per test/describe block to get a fresh module instance and avoid state
 *    leaking between tests.
 *  - window.tasksManager.onEvent is mocked to capture the global listener
 *    callback and allow us to inject synthetic TaskEvents.
 *  - jest.useFakeTimers() is needed for the setTimeout(snapshot.delete) calls
 *    that happen in terminal events (completed/error/cancelled).
 *
 * Cases covered:
 *  - subscribeToTask(): receives events for the matching taskId
 *  - subscribeToTask(): does not fire for events on a different taskId
 *  - subscribeToTask(): multiple subscribers for the same taskId all fire
 *  - subscribeToTask(): unsubscribe function stops future notifications
 *  - getTaskSnapshot(): returns undefined before any event arrives
 *  - getTaskSnapshot(): returns latest snapshot after a non-terminal event
 *  - initTaskContent(): seeds seedContent and content fields
 *  - stream event: accumulates content = seedContent + all streamed tokens
 *  - stream event: streamedContent holds the latest delta token only
 *  - terminal 'completed': fires subscribers, then clears snapshot via setTimeout
 *  - terminal 'error': fires subscribers with error field, clears snapshot
 *  - terminal 'cancelled': fires subscribers, clears snapshot
 *  - 'queued' event: sets status to 'queued'
 *  - 'started' event: sets status to 'running'
 *  - 'progress' event: sets status to 'running'
 *  - unknown event types: are ignored (no crash, no notification)
 */

// ---------------------------------------------------------------------------
// Helper: mock window.tasksManager and load a fresh module
// ---------------------------------------------------------------------------

type InjectedEvent = Parameters<Parameters<typeof window.tasksManager.onEvent>[0]>[0]

interface FreshBus {
  subscribeToTask: (taskId: string, cb: (snap: unknown) => void) => () => void
  getTaskSnapshot: (taskId: string) => unknown | undefined
  initTaskContent: (taskId: string, initialContent: string) => void
  injectEvent: (event: InjectedEvent) => void
}

function loadFreshBus(): FreshBus {
  let globalCb: ((event: InjectedEvent) => void) | null = null

  // Install the mock before requiring the module so ensureListening() sees it.
  Object.defineProperty(window, 'tasksManager', {
    value: {
      onEvent: jest.fn().mockImplementation((cb: (event: InjectedEvent) => void) => {
        globalCb = cb
        return () => { globalCb = null }
      }),
    },
    writable: true,
    configurable: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../../../../src/renderer/src/services/taskEventBus')

  return {
    subscribeToTask: mod.subscribeToTask,
    getTaskSnapshot: mod.getTaskSnapshot,
    initTaskContent: mod.initTaskContent,
    injectEvent: (event: InjectedEvent) => {
      if (globalCb) globalCb(event)
    },
  }
}

// ---------------------------------------------------------------------------
// subscribeToTask()
// ---------------------------------------------------------------------------

describe('taskEventBus — subscribeToTask()', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    // Clean up window.tasksManager so next describe starts fresh
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('fires the callback for events matching the subscribed taskId', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  it('does not fire for events on a different taskId', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)
      bus.injectEvent({ type: 'started', data: { taskId: 'task-999' } })

      expect(cb).not.toHaveBeenCalled()
    })
  })

  it('fires all subscribers when multiple are registered for the same taskId', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb1 = jest.fn()
      const cb2 = jest.fn()

      bus.subscribeToTask('task-1', cb1)
      bus.subscribeToTask('task-1', cb2)
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })
  })

  it('stops firing after the unsubscribe function is called', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      const unsub = bus.subscribeToTask('task-1', cb)

      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })
      expect(cb).toHaveBeenCalledTimes(1)

      unsub()

      bus.injectEvent({ type: 'progress', data: { taskId: 'task-1', percent: 50 } })
      expect(cb).toHaveBeenCalledTimes(1) // no additional call
    })
  })

  it("passes a snapshot with status 'queued' on a queued event", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      let captured: unknown

      bus.subscribeToTask('task-1', (snap) => { captured = snap })
      bus.injectEvent({ type: 'queued', data: { taskId: 'task-1', position: 2 } })

      expect((captured as { status: string }).status).toBe('queued')
    })
  })

  it("passes a snapshot with status 'running' on a started event", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      let captured: unknown

      bus.subscribeToTask('task-1', (snap) => { captured = snap })
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      expect((captured as { status: string }).status).toBe('running')
    })
  })

  it("passes a snapshot with status 'running' on a progress event", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      let captured: unknown

      bus.subscribeToTask('task-1', (snap) => { captured = snap })
      bus.injectEvent({ type: 'progress', data: { taskId: 'task-1', percent: 40 } })

      expect((captured as { status: string }).status).toBe('running')
    })
  })
})

// ---------------------------------------------------------------------------
// getTaskSnapshot()
// ---------------------------------------------------------------------------

describe('taskEventBus — getTaskSnapshot()', () => {
  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('returns undefined before any event arrives for the taskId', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()

      expect(bus.getTaskSnapshot('unknown-task')).toBeUndefined()
    })
  })

  it('returns the latest snapshot after a non-terminal event', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      bus.subscribeToTask('task-1', () => {}) // trigger ensureListening

      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      const snap = bus.getTaskSnapshot('task-1') as { status: string } | undefined
      expect(snap).toBeDefined()
      expect(snap!.status).toBe('running')
    })
  })
})

// ---------------------------------------------------------------------------
// initTaskContent()
// ---------------------------------------------------------------------------

describe('taskEventBus — initTaskContent()', () => {
  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('seeds seedContent and content fields for the task', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()

      bus.initTaskContent('task-1', 'original text')

      const snap = bus.getTaskSnapshot('task-1') as {
        seedContent: string
        content: string
        status: string
      } | undefined

      expect(snap).toBeDefined()
      expect(snap!.seedContent).toBe('original text')
      expect(snap!.content).toBe('original text')
    })
  })

  it('overwrites seedContent if called again', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()

      bus.initTaskContent('task-1', 'first')
      bus.initTaskContent('task-1', 'second')

      const snap = bus.getTaskSnapshot('task-1') as { seedContent: string; content: string }
      expect(snap.seedContent).toBe('second')
      expect(snap.content).toBe('second')
    })
  })
})

// ---------------------------------------------------------------------------
// Stream event — content accumulation
// ---------------------------------------------------------------------------

describe('taskEventBus — stream event', () => {
  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('accumulates content = seedContent + all streamed tokens', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      bus.subscribeToTask('task-1', () => {})

      bus.initTaskContent('task-1', 'Hello ')
      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'world' } })

      const snap = bus.getTaskSnapshot('task-1') as { content: string }
      expect(snap.content).toContain('Hello ')
      expect(snap.content).toContain('world')
    })
  })

  it('streamedContent holds the latest delta token only (not all accumulated content)', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      bus.subscribeToTask('task-1', () => {})

      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'first-chunk' } })
      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'second-chunk' } })

      const snap = bus.getTaskSnapshot('task-1') as { streamedContent: string }
      // After the second stream event, streamedContent is only the latest delta
      expect(snap.streamedContent).toBe('second-chunk')
    })
  })

  it('sets status to running on stream event', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      bus.subscribeToTask('task-1', () => {})

      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'token' } })

      const snap = bus.getTaskSnapshot('task-1') as { status: string }
      expect(snap.status).toBe('running')
    })
  })

  it('fires subscriber on each stream event', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)
      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'a' } })
      bus.injectEvent({ type: 'stream', data: { taskId: 'task-1', data: 'b' } })

      expect(cb).toHaveBeenCalledTimes(2)
    })
  })
})

// ---------------------------------------------------------------------------
// Terminal events — snapshot lifecycle
// ---------------------------------------------------------------------------

describe('taskEventBus — terminal events', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it("'completed' event fires subscriber and snapshot is cleared after setTimeout", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      bus.injectEvent({
        type: 'completed',
        data: { taskId: 'task-1', result: { output: 'done' }, durationMs: 100 }
      })

      // Subscriber fired immediately
      expect(cb).toHaveBeenCalledTimes(2) // started + completed

      const snapBefore = bus.getTaskSnapshot('task-1') as { status: string }
      expect(snapBefore).toBeDefined()
      expect(snapBefore.status).toBe('completed')

      // Run the pending setTimeout to clear the snapshot
      jest.runAllTimers()

      const snapAfter = bus.getTaskSnapshot('task-1')
      expect(snapAfter).toBeUndefined()
    })
  })

  it("'error' event fires subscriber with error field and clears snapshot", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const captured: unknown[] = []

      bus.subscribeToTask('task-1', (snap) => captured.push(snap))
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      bus.injectEvent({
        type: 'error',
        data: { taskId: 'task-1', message: 'Exploded', code: 'ERR_X' }
      })

      const lastSnap = captured[captured.length - 1] as { status: string; error: string }
      expect(lastSnap.status).toBe('error')
      expect(lastSnap.error).toBe('Exploded')

      jest.runAllTimers()

      expect(bus.getTaskSnapshot('task-1')).toBeUndefined()
    })
  })

  it("'cancelled' event fires subscriber and clears snapshot after setTimeout", () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)
      bus.injectEvent({ type: 'started', data: { taskId: 'task-1' } })

      bus.injectEvent({ type: 'cancelled', data: { taskId: 'task-1' } })

      const snapBefore = bus.getTaskSnapshot('task-1') as { status: string }
      expect(snapBefore.status).toBe('cancelled')

      jest.runAllTimers()

      expect(bus.getTaskSnapshot('task-1')).toBeUndefined()
    })
  })

  it('completed result is exposed on the snapshot passed to the subscriber', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const snapshots: unknown[] = []

      bus.subscribeToTask('task-1', (snap) => snapshots.push(snap))

      bus.injectEvent({
        type: 'completed',
        data: { taskId: 'task-1', result: { text: 'hello' }, durationMs: 50 }
      })

      const snap = snapshots[0] as { result: { text: string } }
      expect(snap.result).toEqual({ text: 'hello' })
    })
  })
})

// ---------------------------------------------------------------------------
// Unknown / unhandled event types
// ---------------------------------------------------------------------------

describe('taskEventBus — unhandled event types', () => {
  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(window, 'tasksManager', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('does not crash on an event with an unknown type', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)

      // priority-changed falls through to the default branch in the switch
      expect(() => {
        bus.injectEvent({ type: 'priority-changed', data: { taskId: 'task-1', priority: 'high', position: 1 } } as InjectedEvent)
      }).not.toThrow()
    })
  })

  it('does not notify subscriber for an event missing taskId', () => {
    jest.isolateModules(() => {
      const bus = loadFreshBus()
      const cb = jest.fn()

      bus.subscribeToTask('task-1', cb)

      // Inject a malformed event with no taskId
      bus.injectEvent({ type: 'started', data: {} } as InjectedEvent)

      expect(cb).not.toHaveBeenCalled()
    })
  })
})
