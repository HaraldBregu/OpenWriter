/**
 * Tests for useOutputFiles hook.
 *
 * The hook:
 *  1. On mount, checks window.workspace.getCurrent() — if a workspace exists,
 *     dispatches loadOutputItems() (async thunk that calls window.api.outputLoadAll).
 *  2. Subscribes to window.output.onFileChange() and re-dispatches loadOutputItems
 *     after a 500 ms debounce on each event.
 *  3. On unmount, calls the unsubscribe function and cancels any pending debounce.
 *
 * Covered cases:
 *  - Initial load when workspace is present
 *  - No load when workspace is absent (getCurrent returns null)
 *  - Error handling (dispatch throws — hook logs but does not re-throw)
 *  - File-change event triggers a debounced reload
 *  - Multiple rapid events are coalesced into a single reload (debounce)
 *  - Cleanup: unsubscribe and debounce cancellation on unmount
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useOutputFiles } from '../../../../src/renderer/src/hooks/useOutputFiles'
import outputReducer from '../../../../src/renderer/src/store/outputSlice'

// ---------------------------------------------------------------------------
// Mock window.workspace and window.output namespaces.
// These are separate from window.api (the preload-bridge mock).
// ---------------------------------------------------------------------------

const mockWorkspaceGetCurrent = jest.fn()
const mockOutputLoadAll = jest.fn()
const mockUnsubscribeFileChange = jest.fn()

type FileChangeCallback = (event: {
  type: 'added' | 'changed' | 'removed'
  outputType: string
  fileId: string
  filePath: string
  timestamp: number
}) => void

let capturedFileChangeCallback: FileChangeCallback | null = null

function installWindowMocks(): void {
  Object.defineProperty(window, 'workspace', {
    value: { getCurrent: mockWorkspaceGetCurrent },
    writable: true,
    configurable: true
  })

  Object.defineProperty(window, 'output', {
    value: {
      onFileChange: jest.fn().mockImplementation((cb: FileChangeCallback) => {
        capturedFileChangeCallback = cb
        return mockUnsubscribeFileChange
      })
    },
    writable: true,
    configurable: true
  })
}

// ---------------------------------------------------------------------------
// Store & wrapper factory
// ---------------------------------------------------------------------------

function createWrapper() {
  const store = configureStore({
    reducer: { output: outputReducer }
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children)
  return { store, wrapper }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  capturedFileChangeCallback = null
  mockWorkspaceGetCurrent.mockResolvedValue(null)
  mockOutputLoadAll.mockResolvedValue([])
  mockUnsubscribeFileChange.mockClear()

  installWindowMocks()

  // The loadOutputItems thunk calls window.api.outputLoadAll.
  // The preload-bridge mock does not include outputLoadAll, so we add it here
  // by extending the existing window.api object.
  Object.defineProperty(window, 'api', {
    value: {
      ...window.api,
      outputLoadAll: mockOutputLoadAll
    },
    writable: true,
    configurable: true
  })
})

afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOutputFiles — initial load', () => {
  it('calls outputLoadAll when a workspace is present', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(mockOutputLoadAll).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call outputLoadAll when no workspace is set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(mockWorkspaceGetCurrent).toHaveBeenCalled()
    })

    expect(mockOutputLoadAll).not.toHaveBeenCalled()
  })

  it('populates store items after a successful load', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const NOW_ISO = new Date().toISOString()
    mockOutputLoadAll.mockResolvedValue([
      {
        id: 'item-001',
        type: 'posts',
        path: '/workspace/output/posts/item-001',
        metadata: {
          title: 'Hello World',
          type: 'posts',
          category: 'tech',
          tags: ['a'],
          visibility: 'public',
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: null,
          reasoning: false,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO
        },
        content: 'Some content',
        savedAt: Date.now()
      }
    ])

    const { store, wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      const state = store.getState() as { output: { items: unknown[] } }
      expect(state.output.items).toHaveLength(1)
    })
  })

  it('logs an error and does not throw when outputLoadAll rejects', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')
    mockOutputLoadAll.mockRejectedValue(new Error('Load failed'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })
})

describe('useOutputFiles — file-change subscription', () => {
  it('subscribes to output.onFileChange on mount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(window.output.onFileChange).toHaveBeenCalledTimes(1)
    })
  })

  it('triggers a debounced reload when a file-change event arrives', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    // Wait for the initial async setup to complete
    await act(async () => { await Promise.resolve() })

    const callsBefore = mockOutputLoadAll.mock.calls.length

    // Emit one file-change event
    act(() => {
      capturedFileChangeCallback?.({
        type: 'added',
        outputType: 'posts',
        fileId: 'new-item',
        filePath: '/workspace/output/posts/new-item/DATA.md',
        timestamp: Date.now()
      })
    })

    // Debounce has not fired yet — count should be unchanged
    expect((window.api.outputLoadAll as jest.Mock).mock.calls.length).toBe(callsBefore)

    // Advance past the 500 ms debounce window
    act(() => { jest.advanceTimersByTime(600) })

    await act(async () => { await Promise.resolve() })

    expect((window.api.outputLoadAll as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('coalesces multiple rapid file-change events into a single reload', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    const callsBefore = (window.api.outputLoadAll as jest.Mock).mock.calls.length

    // Fire 5 events within the debounce window
    for (let i = 0; i < 5; i++) {
      act(() => {
        capturedFileChangeCallback?.({
          type: 'changed',
          outputType: 'writings',
          fileId: `item-${i}`,
          filePath: `/workspace/output/writings/item-${i}/DATA.md`,
          timestamp: Date.now()
        })
      })
      act(() => { jest.advanceTimersByTime(100) }) // 100 ms apart (< 500 ms)
    }

    // Now advance past the debounce window
    act(() => { jest.advanceTimersByTime(600) })

    await act(async () => { await Promise.resolve() })

    // Exactly one additional reload should have been triggered
    expect((window.api.outputLoadAll as jest.Mock).mock.calls.length).toBe(callsBefore + 1)
  })
})

describe('useOutputFiles — cleanup on unmount', () => {
  it('calls the unsubscribe function on unmount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(window.output.onFileChange).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribeFileChange).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending debounce timer on unmount', async () => {
    jest.useFakeTimers()
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout')

    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useOutputFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    // Trigger a file-change to arm the debounce timer
    act(() => {
      capturedFileChangeCallback?.({
        type: 'removed',
        outputType: 'posts',
        fileId: 'deleted-item',
        filePath: '/workspace/output/posts/deleted-item/DATA.md',
        timestamp: Date.now()
      })
    })

    // Unmount before the debounce fires
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
