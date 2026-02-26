/**
 * Extended tests for useTaskSubmit covering new IPC capabilities:
 *   - 'paused' / 'resumed' / 'priority-changed' / 'queue-position' events
 *   - pause() / resume() / updatePriority() control methods
 *   - queuePosition state tracking
 */

import React, { act } from 'react'
import { renderHook } from '@testing-library/react'
import { TaskProvider } from '../../../../src/renderer/src/contexts/TaskContext'
import { useTaskSubmit } from '../../../../src/renderer/src/hooks/useTaskSubmit'
import type { TaskEvent } from '../../../../src/shared/types/ipc/types'

// ---------------------------------------------------------------------------
// window.task mock helpers
// ---------------------------------------------------------------------------

type TaskEventCallback = (event: TaskEvent) => void

function buildTaskMock() {
  let eventCallback: TaskEventCallback | null = null

  const mock = {
    submit: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'task-ext-001' } }),
    cancel: jest.fn().mockResolvedValue({ success: true, data: true }),
    pause: jest.fn().mockResolvedValue({ success: true, data: true }),
    resume: jest.fn().mockResolvedValue({ success: true, data: true }),
    updatePriority: jest.fn().mockResolvedValue({ success: true, data: true }),
    list: jest.fn().mockResolvedValue({ success: true, data: [] }),
    getResult: jest.fn().mockResolvedValue({ success: true, data: null }),
    queueStatus: jest.fn().mockResolvedValue({ success: true, data: { queued: 0, running: 0, completed: 0 } }),
    onEvent: jest.fn().mockImplementation((cb: TaskEventCallback) => {
      eventCallback = cb
      return () => { eventCallback = null }
    }),
    emit: (event: TaskEvent) => eventCallback?.(event),
  }

  return mock
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <TaskProvider>{children}</TaskProvider>
}

// ---------------------------------------------------------------------------
// Setup helper — submit a task and return the mock
// ---------------------------------------------------------------------------

async function submitTask() {
  const mock = buildTaskMock()
  ;(window as Window & { task?: unknown }).task = mock

  const { result } = renderHook(
    () => useTaskSubmit('test-task', {}),
    { wrapper: Wrapper }
  )

  await act(async () => {
    await result.current.submit()
  })

  return { mock, result, taskId: 'task-ext-001' }
}

// ---------------------------------------------------------------------------
// Suite: new lifecycle events
// ---------------------------------------------------------------------------

describe('useTaskSubmit — paused event', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('transitions to paused on paused event', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'paused', data: { taskId: 'task-ext-001' } })
    })

    expect(result.current.status).toBe('paused')
  })

  it('does NOT close the subscription on paused — task can still resume', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'paused', data: { taskId: 'task-ext-001' } })
    })

    // After pause the subscription must still be active so we can receive resumed
    act(() => {
      mock.emit({ type: 'resumed', data: { taskId: 'task-ext-001', position: 2 } })
    })

    expect(result.current.status).toBe('queued')
    expect(result.current.queuePosition).toBe(2)
  })
})

describe('useTaskSubmit — resumed event', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('transitions back to queued with updated position on resumed', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'paused', data: { taskId: 'task-ext-001' } })
    })

    act(() => {
      mock.emit({ type: 'resumed', data: { taskId: 'task-ext-001', position: 3 } })
    })

    expect(result.current.status).toBe('queued')
    expect(result.current.queuePosition).toBe(3)
  })
})

describe('useTaskSubmit — priority-changed event', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('updates queuePosition on priority-changed event', async () => {
    const { mock, result } = await submitTask()

    // Start queued at position 5
    act(() => {
      mock.emit({ type: 'queued', data: { taskId: 'task-ext-001', position: 5 } })
    })

    // Priority bumped, re-positioned to 1
    act(() => {
      mock.emit({
        type: 'priority-changed',
        data: { taskId: 'task-ext-001', priority: 'high', position: 1 }
      })
    })

    expect(result.current.queuePosition).toBe(1)
  })
})

describe('useTaskSubmit — queue-position event', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('updates queuePosition when queue-position event arrives', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'queued', data: { taskId: 'task-ext-001', position: 4 } })
    })

    act(() => {
      mock.emit({ type: 'queue-position', data: { taskId: 'task-ext-001', position: 2 } })
    })

    expect(result.current.queuePosition).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Suite: queuePosition state
// ---------------------------------------------------------------------------

describe('useTaskSubmit — queuePosition', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('reflects position from queued event', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'queued', data: { taskId: 'task-ext-001', position: 3 } })
    })

    expect(result.current.queuePosition).toBe(3)
  })

  it('clears queuePosition when task starts running', async () => {
    const { mock, result } = await submitTask()

    act(() => {
      mock.emit({ type: 'queued', data: { taskId: 'task-ext-001', position: 2 } })
    })

    act(() => {
      mock.emit({ type: 'started', data: { taskId: 'task-ext-001' } })
    })

    expect(result.current.queuePosition).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Suite: pause() / resume() / updatePriority() control methods
// ---------------------------------------------------------------------------

describe('useTaskSubmit — pause()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('calls window.task.pause with the taskId when running', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'started', data: { taskId } })
    })

    await act(async () => {
      await result.current.pause()
    })

    expect(mock.pause).toHaveBeenCalledWith(taskId)
  })

  it('calls window.task.pause with the taskId when queued', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'queued', data: { taskId, position: 1 } })
    })

    await act(async () => {
      await result.current.pause()
    })

    expect(mock.pause).toHaveBeenCalledWith(taskId)
  })

  it('is a no-op when already paused', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'paused', data: { taskId } })
    })

    await act(async () => {
      await result.current.pause()
    })

    expect(mock.pause).not.toHaveBeenCalled()
  })

  it('is a no-op when task is completed', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'completed', data: { taskId, result: null, durationMs: 10 } })
    })

    await act(async () => {
      await result.current.pause()
    })

    expect(mock.pause).not.toHaveBeenCalled()
  })

  it('is a no-op when no task has been submitted', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.pause()
    })

    expect(mock.pause).not.toHaveBeenCalled()
  })
})

describe('useTaskSubmit — resume()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('calls window.task.resume with the taskId when paused', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'paused', data: { taskId } })
    })

    await act(async () => {
      await result.current.resume()
    })

    expect(mock.resume).toHaveBeenCalledWith(taskId)
  })

  it('is a no-op when task is running (not paused)', async () => {
    const { mock, result, taskId } = await submitTask()

    act(() => {
      mock.emit({ type: 'started', data: { taskId } })
    })

    await act(async () => {
      await result.current.resume()
    })

    expect(mock.resume).not.toHaveBeenCalled()
  })
})

describe('useTaskSubmit — updatePriority()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('calls window.task.updatePriority with taskId and the given priority', async () => {
    const { mock, result, taskId } = await submitTask()

    await act(async () => {
      await result.current.updatePriority('high')
    })

    expect(mock.updatePriority).toHaveBeenCalledWith(taskId, 'high')
  })

  it('is a no-op when no task has been submitted', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.updatePriority('low')
    })

    expect(mock.updatePriority).not.toHaveBeenCalled()
  })
})
