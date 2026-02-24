/**
 * Tests for usePersonalityFiles hook.
 *
 * The hook:
 *  1. On mount, calls window.workspace.getCurrent(). If a workspace exists,
 *     dispatches loadPersonalityFiles() (thunk that calls window.api.personalityLoadAll).
 *  2. Subscribes to window.personality.onFileChange() and re-dispatches
 *     loadPersonalityFiles after a 500 ms debounce on each event.
 *  3. On unmount, calls the unsubscribe function and cancels any pending debounce.
 *
 * Covered cases:
 *  - Initial load when workspace is present
 *  - No load when workspace is absent
 *  - Store is populated with loaded files (distributed into sections)
 *  - Error handling (thunk rejects — hook logs but does not re-throw)
 *  - File-change event triggers a debounced reload
 *  - Multiple rapid events are coalesced into a single reload (debounce)
 *  - Cleanup: unsubscribe and debounce cancellation on unmount
 *
 * Note: The existing useBrainFiles.test.ts was generated against an older API
 * shape (window.api.onPersonalityFileChange). This file tests the CURRENT
 * hook which uses window.workspace.getCurrent() and window.personality.onFileChange().
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { usePersonalityFiles } from '../../../../src/renderer/src/hooks/usePersonalityFiles'
import personalityFilesReducer from '../../../../src/renderer/src/store/personalityFilesSlice'

// ---------------------------------------------------------------------------
// Mock window.workspace and window.personality namespaces
// ---------------------------------------------------------------------------

const mockWorkspaceGetCurrent = jest.fn()
const mockUnsubscribeFileChange = jest.fn()

type PersonalityFileChangeCallback = (event: {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}) => void

let capturedFileChangeCallback: PersonalityFileChangeCallback | null = null

function installWindowMocks(): void {
  Object.defineProperty(window, 'workspace', {
    value: { getCurrent: mockWorkspaceGetCurrent },
    writable: true,
    configurable: true
  })

  Object.defineProperty(window, 'personality', {
    value: {
      onFileChange: jest.fn().mockImplementation((cb: PersonalityFileChangeCallback) => {
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
    reducer: { personalityFiles: personalityFilesReducer }
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children)
  return { store, wrapper }
}

// ---------------------------------------------------------------------------
// Mock for window.api.personalityLoadAll
// (not included in the preload-bridge stub — patched here per-test)
// ---------------------------------------------------------------------------

const mockPersonalityLoadAll = jest.fn().mockResolvedValue([])

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  capturedFileChangeCallback = null
  mockWorkspaceGetCurrent.mockResolvedValue(null)
  mockUnsubscribeFileChange.mockClear()
  mockPersonalityLoadAll.mockResolvedValue([])

  installWindowMocks()

  // Extend the preload-bridge window.api mock with personalityLoadAll,
  // which is the method the loadPersonalityFiles thunk calls.
  Object.defineProperty(window, 'api', {
    value: {
      ...window.api,
      personalityLoadAll: mockPersonalityLoadAll
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

describe('usePersonalityFiles — initial load', () => {
  it('calls personalityLoadAll when a workspace is present', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(mockPersonalityLoadAll).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call personalityLoadAll when no workspace is set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(mockWorkspaceGetCurrent).toHaveBeenCalled()
    })

    expect(mockPersonalityLoadAll).not.toHaveBeenCalled()
  })

  it('distributes loaded files into the correct store sections', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')
    mockPersonalityLoadAll.mockResolvedValue([
      {
        id: 'file-001',
        sectionId: 'emotional-depth',
        path: '/workspace/personality/emotional-depth/file-001',
        metadata: { title: 'Depth 1', provider: 'openai', model: 'gpt-4' },
        content: 'Some content',
        savedAt: Date.now()
      },
      {
        id: 'file-002',
        sectionId: 'consciousness',
        path: '/workspace/personality/consciousness/file-002',
        metadata: { title: 'Consciousness 1', provider: 'openai', model: 'gpt-4' },
        content: 'Other content',
        savedAt: Date.now()
      }
    ])

    const { store, wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      const state = store.getState() as {
        personalityFiles: { files: Record<string, unknown[]> }
      }
      expect(state.personalityFiles.files['emotional-depth']).toHaveLength(1)
      expect(state.personalityFiles.files['consciousness']).toHaveLength(1)
    })
  })

  it('logs an error and does not throw when personalityLoadAll rejects', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')
    mockPersonalityLoadAll.mockRejectedValue(new Error('Network error'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })
})

describe('usePersonalityFiles — file-change subscription', () => {
  it('subscribes to personality.onFileChange on mount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(window.personality.onFileChange).toHaveBeenCalledTimes(1)
    })
  })

  it('triggers a debounced reload after a file-change event', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    const callsBefore = mockPersonalityLoadAll.mock.calls.length

    // Emit a file-change event
    act(() => {
      capturedFileChangeCallback?.({
        type: 'added',
        sectionId: 'creativity',
        fileId: 'new-file',
        filePath: '/workspace/personality/creativity/new-file/DATA.md',
        timestamp: Date.now()
      })
    })

    // Debounce has not fired yet
    expect((window.api.personalityLoadAll as jest.Mock).mock.calls.length).toBe(callsBefore)

    // Advance past the 500 ms window
    act(() => { jest.advanceTimersByTime(600) })
    await act(async () => { await Promise.resolve() })

    expect((window.api.personalityLoadAll as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('coalesces multiple rapid file-change events into a single reload', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    const callsBefore = (window.api.personalityLoadAll as jest.Mock).mock.calls.length

    // Fire 4 events within the debounce window (100 ms apart)
    for (let i = 0; i < 4; i++) {
      act(() => {
        capturedFileChangeCallback?.({
          type: 'changed',
          sectionId: 'motivation',
          fileId: `file-${i}`,
          filePath: `/workspace/personality/motivation/file-${i}/DATA.md`,
          timestamp: Date.now()
        })
      })
      act(() => { jest.advanceTimersByTime(100) })
    }

    // Advance fully past the debounce window
    act(() => { jest.advanceTimersByTime(600) })
    await act(async () => { await Promise.resolve() })

    // Only one reload despite four events
    expect((window.api.personalityLoadAll as jest.Mock).mock.calls.length).toBe(callsBefore + 1)
  })
})

describe('usePersonalityFiles — cleanup on unmount', () => {
  it('calls the unsubscribe function on unmount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(window.personality.onFileChange).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribeFileChange).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending debounce timer on unmount', async () => {
    jest.useFakeTimers()
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout')

    mockWorkspaceGetCurrent.mockResolvedValue('/workspace/path')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => usePersonalityFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    // Arm the debounce timer via a file-change event
    act(() => {
      capturedFileChangeCallback?.({
        type: 'removed',
        sectionId: 'growth',
        fileId: 'deleted-file',
        filePath: '/workspace/personality/growth/deleted-file/DATA.md',
        timestamp: Date.now()
      })
    })

    // Unmount before the debounce fires
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
