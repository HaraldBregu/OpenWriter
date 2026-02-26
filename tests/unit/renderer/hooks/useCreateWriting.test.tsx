/**
 * Tests for the useCreateWriting hook.
 *
 * The hook:
 *  1. Guards against concurrent calls via an in-flight ref.
 *  2. Checks window.workspace.getCurrent() and returns null when no workspace.
 *  3. Dispatches saveOutputItem (window.workspace.output.save) to persist on disk.
 *  4. Dispatches addWriting + setWritingOutputId to Redux on success.
 *  5. Calls onSuccess(writingId) and returns writingId on success.
 *  6. Sets error state and calls onError when save fails.
 *  7. Exposes reset() to clear error state.
 *  8. Manages isLoading correctly across the async lifecycle.
 *
 * Covered cases:
 *  - Success path: workspace present, save succeeds → Redux updated, id returned
 *  - No workspace: getCurrent returns null → null returned, no dispatch
 *  - Save failure: output.save rejects → error set, onError called, null returned
 *  - Double-click prevention: second call while first is in flight returns null
 *  - reset(): clears error state
 *  - isLoading lifecycle: true during call, false after resolution
 *  - onSuccess callback receives the new writing id
 *  - onError callback receives the Error object
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useCreateWriting } from '@/hooks/useCreateWriting'
import writingsReducer from '@/store/writingsSlice'
import outputReducer from '@/store/outputSlice'

// ---------------------------------------------------------------------------
// Window mock helpers
// ---------------------------------------------------------------------------

const mockWorkspaceGetCurrent = jest.fn<Promise<string | null>, []>()
const mockOutputSave = jest.fn()
const mockOutputLoadAll = jest.fn()

const SAVED_RESULT = {
  id: 'output-folder-001',
  path: '/workspace/output/writings/2024-01-01_120000',
  savedAt: 1700000000000,
}

function installWindowMocks(): void {
  Object.defineProperty(window, 'workspace', {
    value: {
      getCurrent: mockWorkspaceGetCurrent,
      output: {
        save: mockOutputSave,
        loadAll: mockOutputLoadAll,
        onFileChange: jest.fn().mockReturnValue(jest.fn()),
        onWatcherError: jest.fn().mockReturnValue(jest.fn()),
      },
    },
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Store & wrapper factory
// ---------------------------------------------------------------------------

type TestState = {
  writings: ReturnType<typeof writingsReducer>
  output: ReturnType<typeof outputReducer>
}

function createWrapper() {
  const store = configureStore<TestState>({
    reducer: {
      writings: writingsReducer,
      output: outputReducer,
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children)
  return { store, wrapper }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockWorkspaceGetCurrent.mockResolvedValue('/workspace/test')
  mockOutputSave.mockResolvedValue(SAVED_RESULT)
  mockOutputLoadAll.mockResolvedValue([])

  installWindowMocks()
})

afterEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe('useCreateWriting — success path', () => {
  it('returns a non-null writingId string on success', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    let writingId: string | null = null
    await act(async () => {
      writingId = await result.current.createWriting()
    })

    expect(typeof writingId).toBe('string')
    expect(writingId).not.toBeNull()
  })

  it('calls window.output.save exactly once with the correct type', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting('My Title')
    })

    expect(mockOutputSave).toHaveBeenCalledTimes(1)
    const callArg = mockOutputSave.mock.calls[0][0] as Record<string, unknown>
    expect(callArg.type).toBe('writings')
  })

  it('dispatches addWriting to Redux state after save', async () => {
    const { store, wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    const state = store.getState()
    expect(state.writings.writings).toHaveLength(1)
  })

  it('links the writing to the output folder via setWritingOutputId', async () => {
    const { store, wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    let writingId: string | null = null
    await act(async () => {
      writingId = await result.current.createWriting()
    })

    const state = store.getState()
    const writing = state.writings.writings.find((w) => w.id === writingId)
    expect(writing).toBeDefined()
    expect(writing?.outputId).toBe(SAVED_RESULT.id)
  })

  it('calls onSuccess callback with the writing id', async () => {
    const onSuccess = jest.fn()
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useCreateWriting({ onSuccess }),
      { wrapper }
    )

    await act(async () => {
      await result.current.createWriting()
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(typeof onSuccess.mock.calls[0][0]).toBe('string')
  })

  it('uses the provided title in the save payload', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting('Custom Title')
    })

    const callArg = mockOutputSave.mock.calls[0][0] as { metadata?: { title?: string } }
    expect(callArg.metadata?.title).toBe('Custom Title')
  })

  it('falls back to defaultTitle when createWriting is called without a title', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useCreateWriting({ defaultTitle: 'Hook Default' }),
      { wrapper }
    )

    await act(async () => {
      await result.current.createWriting()
    })

    const callArg = mockOutputSave.mock.calls[0][0] as { metadata?: { title?: string } }
    expect(callArg.metadata?.title).toBe('Hook Default')
  })

  it('does not set error on success', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// No-workspace path
// ---------------------------------------------------------------------------

describe('useCreateWriting — no active workspace', () => {
  it('returns null when workspace is not set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    let writingId: string | null = 'not-null'
    await act(async () => {
      writingId = await result.current.createWriting()
    })

    expect(writingId).toBeNull()
  })

  it('does not call window.output.save when workspace is absent', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(mockOutputSave).not.toHaveBeenCalled()
  })

  it('sets error state when workspace is absent', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('does not add a writing to Redux when workspace is absent', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)
    const { store, wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(store.getState().writings.writings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Error path
// ---------------------------------------------------------------------------

describe('useCreateWriting — save failure', () => {
  it('returns null when window.output.save rejects', async () => {
    mockOutputSave.mockRejectedValue(new Error('Disk full'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    let writingId: string | null = 'not-null'
    await act(async () => {
      writingId = await result.current.createWriting()
    })

    expect(writingId).toBeNull()
  })

  it('sets error state when save rejects', async () => {
    mockOutputSave.mockRejectedValue(new Error('Permission denied'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toMatch(/Permission denied/)
  })

  it('calls onError callback when save rejects', async () => {
    const onError = jest.fn()
    mockOutputSave.mockRejectedValue(new Error('Write error'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useCreateWriting({ onError }),
      { wrapper }
    )

    await act(async () => {
      await result.current.createWriting()
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('does not add a writing to Redux when save rejects', async () => {
    mockOutputSave.mockRejectedValue(new Error('Save failed'))
    const { store, wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(store.getState().writings.writings).toHaveLength(0)
  })

  it('wraps non-Error rejections in an Error instance', async () => {
    mockOutputSave.mockRejectedValue('string error')
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('useCreateWriting — reset()', () => {
  it('clears error state after a failed creation', async () => {
    mockOutputSave.mockRejectedValue(new Error('Save failed'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.error).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.error).toBeNull()
  })

  it('is a no-op when there is no error', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    expect(() => {
      act(() => {
        result.current.reset()
      })
    }).not.toThrow()

    expect(result.current.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isLoading lifecycle
// ---------------------------------------------------------------------------

describe('useCreateWriting — isLoading', () => {
  it('starts as false', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    expect(result.current.isLoading).toBe(false)
  })

  it('is false after a successful creation', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('is false after a failed creation', async () => {
    mockOutputSave.mockRejectedValue(new Error('fail'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    await act(async () => {
      await result.current.createWriting()
    })

    expect(result.current.isLoading).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Double-click / in-flight guard
// ---------------------------------------------------------------------------

describe('useCreateWriting — double-click prevention', () => {
  it('ignores a second call while the first is in flight', async () => {
    // Make the first save slow by using a resolvable promise
    let resolveFirst!: (v: typeof SAVED_RESULT) => void
    const slowSave = new Promise<typeof SAVED_RESULT>((res) => {
      resolveFirst = res
    })
    mockOutputSave.mockReturnValue(slowSave)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateWriting(), { wrapper })

    // Start first call — do NOT await
    let firstId: string | null = null
    let secondId: string | null = 'not-null'

    act(() => {
      // Fire and forget
      result.current.createWriting().then((id) => { firstId = id })
    })

    // Immediately fire the second call
    await act(async () => {
      secondId = await result.current.createWriting()
    })

    // Second call must have been blocked
    expect(secondId).toBeNull()

    // Resolve the first call
    await act(async () => {
      resolveFirst(SAVED_RESULT)
      await new Promise((r) => setTimeout(r, 0))
    })

    await waitFor(() => expect(firstId).not.toBeNull())

    // Only one save should have occurred
    expect(mockOutputSave).toHaveBeenCalledTimes(1)
  })
})
