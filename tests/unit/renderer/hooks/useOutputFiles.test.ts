/**
 * Tests for useOutputFiles hook.
 *
 * The hook:
 *  1. On mount, checks window.workspace.getCurrent() — if a workspace exists,
 *     dispatches loadOutputItems() (async thunk that calls window.output.loadAll).
 *  2. Subscribes to window.workspace.output.onFileChange() and re-dispatches loadOutputItems
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
    value: {
      getCurrent: mockWorkspaceGetCurrent,
      output: {
        loadAll: mockOutputLoadAll,
        onFileChange: jest.fn().mockImplementation((cb: FileChangeCallback) => {
          capturedFileChangeCallback = cb
          return mockUnsubscribeFileChange
        }),
      },
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
})

afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOutputFiles — initial load', () => {
  it('calls window.output.loadAll when a workspace is present', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(mockOutputLoadAll).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call window.output.loadAll when no workspace is set', async () => {
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
        type: 'writings',
        path: '/workspace/output/writings/item-001',
        metadata: {
          title: 'Hello World',
          type: 'writings',
          category: 'tech',
          tags: ['a'],
          visibility: 'public',
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: null,
          reasoning: false,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
          content: [
            {
              type: 'content',
              filetype: 'markdown',
              name: 'block-uuid-0001',
              createdAt: NOW_ISO,
              updatedAt: NOW_ISO,
            },
          ],
        },
        blocks: [
          {
            name: 'block-uuid-0001',
            content: 'Some content',
            filetype: 'markdown',
            type: 'content',
            createdAt: NOW_ISO,
            updatedAt: NOW_ISO,
          },
        ],
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

  it('logs an error and does not throw when window.output.loadAll rejects', async () => {
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
  it('subscribes to window.workspace.output.onFileChange on mount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(window.workspace.output.onFileChange).toHaveBeenCalledTimes(1)
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
        outputType: 'writings',
        fileId: 'new-item',
        filePath: '/workspace/output/writings/new-item/DATA.md',
        timestamp: Date.now()
      })
    })

    // Debounce has not fired yet — count should be unchanged
    expect(mockOutputLoadAll.mock.calls.length).toBe(callsBefore)

    // Advance past the 500 ms debounce window
    act(() => { jest.advanceTimersByTime(600) })

    await act(async () => { await Promise.resolve() })

    expect(mockOutputLoadAll.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('coalesces multiple rapid file-change events into a single reload', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => useOutputFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    const callsBefore = mockOutputLoadAll.mock.calls.length

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
    expect(mockOutputLoadAll.mock.calls.length).toBe(callsBefore + 1)
  })
})

describe('useOutputFiles — cleanup on unmount', () => {
  it('calls the unsubscribe function on unmount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useOutputFiles(), { wrapper })

    await waitFor(() => {
      expect(window.workspace.output.onFileChange).toHaveBeenCalled()
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
        outputType: 'writings',
        fileId: 'deleted-item',
        filePath: '/workspace/output/writings/deleted-item/DATA.md',
        timestamp: Date.now()
      })
    })

    // Unmount before the debounce fires
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
