/**
 * Tests for useTaskSubmit.
 *
 * Testing strategy:
 *  - A real TaskStore is created for each test via TaskProvider.
 *  - window.task is mocked at the module boundary; the mock is reset after each test.
 *  - Tests cover: idle initial state, successful submit, event-driven status/progress
 *    updates, streaming, error scenarios (API unavailable, IPC failure, submit throws),
 *    cancel, and reset.
 *
 * Test file location follows project convention:
 *   tests/unit/renderer/hooks/  (NOT src/renderer/**\/__tests__/)
 */

import React, { act } from 'react'
import { renderHook } from '@testing-library/react'
import { TaskProvider } from '../../../../src/renderer/src/contexts/TaskContext'
import { useTaskSubmit } from '../../../../src/renderer/src/hooks/useTaskSubmit'
import type { TaskEvent } from '../../../../src/shared/types/ipc/types'

// ---------------------------------------------------------------------------
// window.task mock
// ---------------------------------------------------------------------------

type TaskEventCallback = (event: TaskEvent) => void

function buildTaskMock(overrides: Partial<{
  submitResult: { success: true; data: { taskId: string } } | { success: false; error: { message: string } }
  cancelResult: { success: true; data: boolean } | { success: false; error: { message: string } }
}> = {}) {
  let eventCallback: TaskEventCallback | null = null

  const mock = {
    submit: jest.fn().mockResolvedValue(
      overrides.submitResult ?? { success: true, data: { taskId: 'task-001' } }
    ),
    cancel: jest.fn().mockResolvedValue(
      overrides.cancelResult ?? { success: true, data: true }
    ),
    list: jest.fn().mockResolvedValue({ success: true, data: [] }),
    onEvent: jest.fn().mockImplementation((cb: TaskEventCallback) => {
      eventCallback = cb
      return () => { eventCallback = null }
    }),
    emit: (event: TaskEvent) => eventCallback?.(event),
  }

  return mock
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  return <TaskProvider>{children}</TaskProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTaskSubmit — initial state', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('starts in idle state with null taskId', () => {
    const { result } = renderHook(
      () => useTaskSubmit('test-task', { value: 1 }),
      { wrapper: Wrapper }
    )

    expect(result.current.status).toBe('idle')
    expect(result.current.taskId).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.streamedContent).toBe('')
  })
})

describe('useTaskSubmit — API unavailable', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('sets error status when window.task is not available', async () => {
    delete (window as Window & { task?: unknown }).task

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('not available')

    consoleSpy.mockRestore()
  })
})

describe('useTaskSubmit — successful submit', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('transitions to queued and returns taskId on success', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', { payload: 'data' }),
      { wrapper: Wrapper }
    )

    let returnedId: string | null = null

    await act(async () => {
      returnedId = await result.current.submit()
    })

    expect(returnedId).toBe('task-001')
    expect(result.current.taskId).toBe('task-001')
    // After submit + queued, status is at minimum 'queued'
    expect(['queued', 'running', 'completed']).toContain(result.current.status)
    expect(mock.submit).toHaveBeenCalledWith('test-task', { payload: 'data' }, undefined)
  })

  it('prevents double-submission while running', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    // Emit started to put task in running state
    act(() => {
      mock.emit({ type: 'started', data: { taskId: 'task-001' } })
    })

    await act(async () => {
      await result.current.submit()
    })

    // submit() was called twice but IPC submit should have been called once
    expect(mock.submit).toHaveBeenCalledTimes(1)
  })
})

describe('useTaskSubmit — IPC failure', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('sets error when submit returns a failure IpcResult', async () => {
    const mock = buildTaskMock({
      submitResult: { success: false, error: { message: 'Queue full' } }
    })
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Queue full')
    expect(result.current.taskId).toBeNull()
  })

  it('sets error when submit throws', async () => {
    const mock = buildTaskMock()
    mock.submit.mockRejectedValueOnce(new Error('IPC channel closed'))
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('IPC channel closed')
  })
})

describe('useTaskSubmit — event-driven lifecycle', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  async function submitAndGetMock() {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    return { mock, result }
  }

  it('transitions to running on started event', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({ type: 'started', data: { taskId: 'task-001' } })
    })

    expect(result.current.status).toBe('running')
  })

  it('updates progress on progress event', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({
        type: 'progress',
        data: { taskId: 'task-001', percent: 42, message: 'Processing...' }
      })
    })

    expect(result.current.progress).toBe(42)
    expect(result.current.progressMessage).toBe('Processing...')
  })

  it('transitions to completed with result', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({
        type: 'completed',
        data: { taskId: 'task-001', result: { output: 'done' }, durationMs: 100 }
      })
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.progress).toBe(100)
    expect(result.current.result).toEqual({ output: 'done' })
  })

  it('transitions to error on error event', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({
        type: 'error',
        data: { taskId: 'task-001', message: 'Something failed', code: 'ERR_001' }
      })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Something failed')
  })

  it('transitions to cancelled on cancelled event', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({ type: 'cancelled', data: { taskId: 'task-001' } })
    })

    expect(result.current.status).toBe('cancelled')
  })

  it('accumulates streamed content', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({ type: 'stream', data: { taskId: 'task-001', token: 'Hello ' } })
      mock.emit({ type: 'stream', data: { taskId: 'task-001', token: 'world' } })
    })

    expect(result.current.streamedContent).toBe('Hello world')
  })

  it('ignores events for a different taskId', async () => {
    const { mock, result } = await submitAndGetMock()

    act(() => {
      mock.emit({ type: 'started', data: { taskId: 'other-task-999' } })
    })

    // Should remain in queued state, not running
    expect(result.current.status).toBe('queued')
  })
})

describe('useTaskSubmit — cancel', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('calls window.task.cancel with the correct taskId', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    await act(async () => {
      await result.current.cancel()
    })

    expect(mock.cancel).toHaveBeenCalledWith('task-001')
  })

  it('is a no-op when no task has been submitted', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.cancel()
    })

    expect(mock.cancel).not.toHaveBeenCalled()
  })
})

describe('useTaskSubmit — reset', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete (window as Window & { task?: unknown }).task
  })

  it('resets state back to idle after a completed task', async () => {
    const mock = buildTaskMock()
    ;(window as Window & { task?: unknown }).task = mock

    const { result } = renderHook(
      () => useTaskSubmit('test-task', {}),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit()
    })

    act(() => {
      mock.emit({
        type: 'completed',
        data: { taskId: 'task-001', result: null, durationMs: 10 }
      })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.taskId).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
  })
})
