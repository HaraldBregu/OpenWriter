/**
 * Tests for PersonalityTaskContext / PersonalityTaskProvider / usePersonalityTask.
 *
 * Testing strategy:
 *   - All tests use MockPersonalityTaskService (no Electron globals required).
 *   - PersonalityTaskProvider is always given an explicit `service` prop so the
 *     production ElectronPersonalityTaskService singleton is never instantiated.
 *   - A minimal Redux store wraps every render so that useAppDispatch() works.
 *   - Individual test suites are separated into their own describe blocks to
 *     prevent React 19 async state updates from bleeding across test boundaries.
 *
 * Cases covered:
 *   - Provider mounts and unmounts without error when given a mock service
 *   - usePersonalityTask throws when used outside the provider
 *   - submitTask adds a user message and transitions to isLoading=true
 *   - Stream tokens accumulate in latestResponse
 *   - completed event finalises messages, sets isLoading=false, triggers save
 *   - error event sets the error field and clears loading state
 *   - cancelled event clears loading state
 *   - cancelTask cancels the running task and resets state
 *   - clearTask resets a section back to the default state
 *   - onTaskEvent errors are caught and logged without unmounting the tree
 *   - Multiple sections are isolated (stream for A does not affect B)
 *   - Cleanup: unsubscribes from task events on unmount
 */

import React, { act } from 'react'
import { renderHook, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import personalityFilesReducer from '../../../../src/renderer/src/store/personalityFilesSlice'
import { PersonalityTaskProvider, usePersonalityTask } from '../../../../src/renderer/src/contexts/PersonalityTaskContext'
import { MockPersonalityTaskService } from '../../../../src/renderer/src/services/__mocks__/MockPersonalityTaskService'

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
// Wrapper helpers
// ---------------------------------------------------------------------------

function makeWrapper(service: MockPersonalityTaskService) {
  const store = createTestStore()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <PersonalityTaskProvider service={service}>
          {children}
        </PersonalityTaskProvider>
      </Provider>
    )
  }

  return { Wrapper, store }
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

  it('registers a task event listener on mount', () => {
    const service = new MockPersonalityTaskService()
    const onTaskEventSpy = jest.spyOn(service, 'onTaskEvent')
    const { Wrapper } = makeWrapper(service)

    render(
      <Wrapper>
        <div />
      </Wrapper>
    )

    expect(onTaskEventSpy).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes from task events on unmount', () => {
    const service = new MockPersonalityTaskService()
    const unsubscribe = jest.fn()
    jest.spyOn(service, 'onTaskEvent').mockReturnValue(unsubscribe)

    const { Wrapper } = makeWrapper(service)
    const { unmount } = render(
      <Wrapper>
        <div />
      </Wrapper>
    )

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('catches and logs errors thrown by onTaskEvent without crashing the tree', () => {
    const service = new MockPersonalityTaskService()
    jest.spyOn(service, 'onTaskEvent').mockImplementation(() => {
      throw new Error('Bridge unavailable')
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { Wrapper } = makeWrapper(service)

    expect(() =>
      render(
        <Wrapper>
          <div data-testid="safe-child">safe</div>
        </Wrapper>
      )
    ).not.toThrow()

    expect(screen.getByTestId('safe-child')).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[PersonalityTaskProvider] Failed to register task event listener:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Suite 2: usePersonalityTask outside provider
// ---------------------------------------------------------------------------

describe('usePersonalityTask — outside provider', () => {
  it('throws an error when used without a PersonalityTaskProvider', () => {
    const store = createTestStore()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() =>
      renderHook(() => usePersonalityTask(SECTION), {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        )
      })
    ).toThrow('usePersonalityTask must be used within a PersonalityTaskProvider')

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
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    // Submit a task — the mock returns taskId 'mock-task-1'
    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    return { service, result, unmount, taskId: 'mock-task-1' }
  }

  it('appends stream tokens to latestResponse and sets isStreaming=true', async () => {
    const { service, result, unmount, taskId } = await setupStreamingSession()

    act(() => {
      service.simulateStream(taskId, 'Hello ')
    })

    expect(result.current.isStreaming).toBe(true)
    expect(result.current.latestResponse).toBe('Hello ')

    unmount()
  })

  it('concatenates multiple stream tokens in order', async () => {
    const { service, result, unmount, taskId } = await setupStreamingSession()

    act(() => {
      service.simulateStream(taskId, 'Hello ')
      service.simulateStream(taskId, 'world')
    })

    expect(result.current.latestResponse).toBe('Hello world')

    unmount()
  })

  it('adds an assistant message placeholder on the first stream token', async () => {
    const { service, result, unmount, taskId } = await setupStreamingSession()

    act(() => {
      service.simulateStream(taskId, 'First token')
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
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      service.simulateStream(taskId, 'Final ')
    })

    await act(async () => {
      service.simulateComplete(taskId, 'Final answer')
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)

    unmount()
  })

  it('finalises the assistant message content on completion', async () => {
    const service = new MockPersonalityTaskService()
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      service.simulateStream(taskId, 'streaming token')
    })

    await act(async () => {
      service.simulateComplete(taskId, 'The real final answer')
    })

    const assistantMsg = result.current.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('The real final answer')

    unmount()
  })

  it('triggers savePersonality after completion', async () => {
    const service = new MockPersonalityTaskService()
    const saveSpy = jest.spyOn(service, 'savePersonality')
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    const taskId = 'mock-task-1'

    act(() => {
      service.simulateStream(taskId, 'content')
    })

    await act(async () => {
      service.simulateComplete(taskId, 'Final content to save')
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
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      service.simulateError('mock-task-1', 'Something went wrong')
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
    const { Wrapper } = makeWrapper(service)

    const { result, unmount } = renderHook(
      () => usePersonalityTask(SECTION, SYSTEM_PROMPT, PROVIDER_ID),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.submit(USER_PROMPT)
    })

    act(() => {
      service.simulateCancelled('mock-task-1')
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
    const store = createTestStore()

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <Provider store={store}>
          <PersonalityTaskProvider service={service}>
            {children}
          </PersonalityTaskProvider>
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
      service.simulateStream('mock-task-1', 'only for A')
    })

    expect(resultA.current.latestResponse).toBe('only for A')
    expect(resultB.current.latestResponse).toBe('')

    unmountA()
    unmountB()
  })
})
