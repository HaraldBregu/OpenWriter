/**
 * Tests for PersonalityTaskContext / PersonalityTaskProvider / usePersonalityTask.
 *
 * Testing strategy:
 *   - All tests use MockPersonalityTaskService (no Electron globals required).
 *   - PersonalityTaskProvider requires a <TaskProvider> ancestor (for the shared
 *     TaskStore). The wrapper below composes: Redux > TaskProvider > PersonalityTaskProvider.
 *   - Events (stream, complete, error, cancelled) are driven by calling
 *     sharedStore.applyEvent() directly — no window.task IPC is needed in tests.
 *   - A minimal Redux store wraps every render so that useAppDispatch() works.
 *
 * Cases covered:
 *   - Provider mounts and unmounts without error
 *   - usePersonalityTask throws when used outside the provider
 *   - submitTask adds a user message and transitions to isLoading=true
 *   - Empty/whitespace prompts are ignored
 *   - Double-submit while loading is a no-op
 *   - submitTask failure result sets error and clears isLoading
 *   - submitTask thrown exception sets error and clears isLoading
 *   - Stream tokens accumulate in latestResponse and set isStreaming=true
 *   - Multiple stream tokens concatenate correctly
 *   - First stream token creates an assistant message placeholder
 *   - completed event finalises messages, sets isLoading=false, triggers save
 *   - error event sets the error field and clears loading state
 *   - cancelled event clears loading state
 *   - cancelTask cancels the running task and resets state
 *   - cancelTask is a no-op when no active task
 *   - clearTask resets a section back to the default state
 *   - Multiple sections are isolated (stream for A does not affect B)
 */

import React, { act } from 'react'
import { renderHook, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import personalityFilesReducer from '../../../../src/renderer/src/store/personalityFilesSlice'
import { TaskProvider } from '../../../../src/renderer/src/contexts/TaskContext'
import { useTaskContext } from '../../../../src/renderer/src/contexts/TaskContext'
import { PersonalityTaskProvider, usePersonalityTask } from '../../../../src/renderer/src/contexts/PersonalityTaskContext'
import { MockPersonalityTaskService } from '../../../../src/renderer/src/services/__mocks__/MockPersonalityTaskService'
import type { TaskStore } from '../../../../src/renderer/src/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Redux store — minimal store with only the slice PersonalityTaskContext touches
// ---------------------------------------------------------------------------

function createTestStore() {
  return configureStore({
    reducer: {
      personalityFiles: personalityFilesReducer
    }
  })
}

// ---------------------------------------------------------------------------
// TaskStore accessor helper
//
// Since TaskProvider holds the store internally, we need a way to grab it from
// tests. We do this with a small probe component that reads the context and
// stashes the store into a ref we control.
// ---------------------------------------------------------------------------

function StoreProbe({ storeRef }: { storeRef: React.MutableRefObject<TaskStore | null> }) {
  const { store } = useTaskContext()
  storeRef.current = store
  return null
}

// ---------------------------------------------------------------------------
// Wrapper helpers
// ---------------------------------------------------------------------------

function makeWrapper(service: MockPersonalityTaskService) {
  const reduxStore = createTestStore()
  const storeRef: React.MutableRefObject<TaskStore | null> = { current: null }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={reduxStore}>
        <TaskProvider>
          <StoreProbe storeRef={storeRef} />
          <PersonalityTaskProvider service={service}>
            {children}
          </PersonalityTaskProvider>
        </TaskProvider>
      </Provider>
    )
  }

  return { Wrapper, reduxStore, storeRef }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION = 'consciousness'
const SYSTEM_PROMPT = 'You are a test assistant.'
const PROVIDER_ID = 'openai'
const USER_PROMPT = 'Hello, world'

// ---------------------------------------------------------------------------
// Suite 1: Provider mounting
// ---------------------------------------------------------------------------

describe('PersonalityTaskProvider — mounting', () => {
  it('mounts without error when given a mock service', () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper } = makeWrapper(service)

    expect(() =>
      render(
        <Wrapper>
          <div data-testid="child">child</div>
        </Wrapper>
      )
    ).not.toThrow()

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Suite 2: usePersonalityTask outside provider
// ---------------------------------------------------------------------------

describe('usePersonalityTask — outside provider', () => {
  it('throws an error when used without a PersonalityTaskProvider', () => {
    const reduxStore = createTestStore()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() =>
      renderHook(() => usePersonalityTask(SECTION), {
        wrapper: ({ children }) => (
          <Provider store={reduxStore}>
            <TaskProvider>
              {children}
            </TaskProvider>
          </Provider>
        )
      })
    ).toThrow(/usePersonalityTask must be used within/i)

    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Suite 3: submitTask — initial state and loading transition
// ---------------------------------------------------------------------------

describe('usePersonalityTask — submitTask', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('starts with empty messages and isLoading=false', () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper } = makeWrapper(service)

    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.latestResponse).toBe('')
  })

  it('ignores empty or whitespace-only prompts', async () => {
    const service = new MockPersonalityTaskService()
    const submitSpy = jest.spyOn(service, 'submitTask')
    const { Wrapper } = makeWrapper(service)

    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit('   ')
    })

    expect(submitSpy).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)
  })

  it('adds a user message and sets isLoading=true after submit', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper } = makeWrapper(service)

    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe(USER_PROMPT)
    expect(result.current.isLoading).toBe(true)
  })

  it('does not submit a second task while one is already loading', async () => {
    const service = new MockPersonalityTaskService()
    const submitSpy = jest.spyOn(service, 'submitTask')
    const { Wrapper } = makeWrapper(service)

    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    // isLoading is now true — a second submit should be a no-op
    await act(async () => {
      await result.current.submit('second message')
    })

    expect(submitSpy).toHaveBeenCalledTimes(1)
  })

  it('sets error and clears isLoading when submitTask returns a failure result', async () => {
    const service = new MockPersonalityTaskService()
    jest.spyOn(service, 'submitTask').mockResolvedValue({
      success: false,
      error: { message: 'No model configured' }
    })

    const { Wrapper } = makeWrapper(service)
    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe('No model configured')
  })

  it('sets error and clears isLoading when submitTask throws', async () => {
    const service = new MockPersonalityTaskService()
    jest.spyOn(service, 'submitTask').mockRejectedValue(new Error('Network error'))

    const { Wrapper } = makeWrapper(service)
    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe('Network error')
  })
})

// ---------------------------------------------------------------------------
// Suite 4: Stream events
// ---------------------------------------------------------------------------

describe('usePersonalityTask — stream events', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  async function setupStreamingSession() {
    const service = new MockPersonalityTaskService()
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    // Submit a task — the mock returns taskId 'mock-task-1'
    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'
    return { service, result, unmount, taskId, storeRef }
  }

  it('appends stream tokens to latestResponse and sets isStreaming=true', async () => {
    const { result, unmount, taskId, storeRef } = await setupStreamingSession()

    act(() => {
      storeRef.current!.applyEvent({
        type: 'stream',
        data: { taskId, token: 'Hello ' }
      })
    })

    expect(result.current.isStreaming).toBe(true)
    expect(result.current.latestResponse).toBe('Hello ')

    unmount()
  })

  it('concatenates multiple stream tokens in order', async () => {
    const { result, unmount, taskId, storeRef } = await setupStreamingSession()

    act(() => {
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'Hello ' } })
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'world' } })
    })

    expect(result.current.latestResponse).toBe('Hello world')

    unmount()
  })

  it('adds an assistant message placeholder on the first stream token', async () => {
    const { result, unmount, taskId, storeRef } = await setupStreamingSession()

    act(() => {
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'First token' } })
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].role).toBe('assistant')

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Suite 5: Completed event
// ---------------------------------------------------------------------------

describe('usePersonalityTask — completed event', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sets isLoading=false and isStreaming=false on completion', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'Final ' } })
    })

    await act(async () => {
      storeRef.current!.applyEvent({
        type: 'completed',
        data: { taskId, result: { content: 'Final answer' }, durationMs: 100 }
      })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)

    unmount()
  })

  it('finalises the assistant message content on completion', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'streaming token' } })
    })

    await act(async () => {
      storeRef.current!.applyEvent({
        type: 'completed',
        data: { taskId, result: { content: 'The real final answer' }, durationMs: 100 }
      })
    })

    const assistantMsg = result.current.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('The real final answer')

    unmount()
  })

  it('triggers save after completion', async () => {
    const service = new MockPersonalityTaskService()
    const saveSpy = jest.spyOn(service, 'save')
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      storeRef.current!.applyEvent({ type: 'stream', data: { taskId, token: 'content' } })
    })

    await act(async () => {
      storeRef.current!.applyEvent({
        type: 'completed',
        data: { taskId, result: { content: 'Final content to save' }, durationMs: 100 }
      })
    })

    // autoSave is async — give microtasks time to flush
    await act(async () => {})

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: SECTION,
        content: 'Final content to save'
      })
    )

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Suite 6: Error event
// ---------------------------------------------------------------------------

describe('usePersonalityTask — error event', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sets error and clears loading state when an error event arrives', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      storeRef.current!.applyEvent({
        type: 'error',
        data: { taskId: 'mock-task-1', message: 'Something went wrong' }
      })
    })

    expect(result.current.error).toBe('Something went wrong')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Suite 7: Cancelled event
// ---------------------------------------------------------------------------

describe('usePersonalityTask — cancelled event', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('clears loading/streaming state when a cancelled event arrives', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper, storeRef } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      storeRef.current!.applyEvent({
        type: 'cancelled',
        data: { taskId: 'mock-task-1' }
      })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Suite 8: cancelTask action
// ---------------------------------------------------------------------------

describe('usePersonalityTask — cancelTask', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('calls service.cancelTask and resets loading state', async () => {
    const service = new MockPersonalityTaskService()
    const cancelSpy = jest.spyOn(service, 'cancelTask')
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      result.current.cancel()
    })

    expect(cancelSpy).toHaveBeenCalledWith('mock-task-1')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)

    unmount()
  })

  it('is a no-op when there is no active task', () => {
    const service = new MockPersonalityTaskService()
    const cancelSpy = jest.spyOn(service, 'cancelTask')
    const { Wrapper } = makeWrapper(service)

    const { result } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    act(() => {
      result.current.cancel()
    })

    expect(cancelSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Suite 9: clearTask action
// ---------------------------------------------------------------------------

describe('usePersonalityTask — clearTask', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('resets section state to defaults', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.latestResponse).toBe('')

    unmount()
  })
})

// ---------------------------------------------------------------------------
// Suite 10: Section isolation
// ---------------------------------------------------------------------------

describe('usePersonalityTask — section isolation', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('stream events for section A do not affect section B', async () => {
    const service = new MockPersonalityTaskService()
    const reduxStore = createTestStore()
    const storeRef: React.MutableRefObject<TaskStore | null> = { current: null }

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <Provider store={reduxStore}>
          <TaskProvider>
            <StoreProbe storeRef={storeRef} />
            <PersonalityTaskProvider service={service}>
              {children}
            </PersonalityTaskProvider>
          </TaskProvider>
        </Provider>
      )
    }

    // Mount both section hooks simultaneously
    const { result: resultA, unmount: unmountA } = renderHook(
      () => usePersonalityTask('consciousness', SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )
    const { result: resultB, unmount: unmountB } = renderHook(
      () => usePersonalityTask('motivation', SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    // Submit for A — gets taskId 'mock-task-1'
    await act(async () => {
      await resultA.current.submit(USER_PROMPT)
    })

    // Submit for B — gets taskId 'mock-task-2'
    await act(async () => {
      await resultB.current.submit(USER_PROMPT)
    })

    // Stream only to A's task
    act(() => {
      storeRef.current!.applyEvent({
        type: 'stream',
        data: { taskId: 'mock-task-1', token: 'only for A' }
      })
    })

    expect(resultA.current.latestResponse).toBe('only for A')
    expect(resultB.current.latestResponse).toBe('')

    unmountA()
    unmountB()
  })
})
