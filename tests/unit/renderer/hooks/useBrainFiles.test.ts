/**
 * Tests for usePersonalityFiles hook.
 *
 * NOTE: This file was originally generated as useBrainFiles.test.ts referencing
 * a hook that no longer exists. It has been updated to test usePersonalityFiles,
 * which loads personality conversation files from the workspace and subscribes
 * to external file-change events.
 *
 * Covers:
 *  - Initial load when workspace is set
 *  - No load when workspace is absent
 *  - Error handling during load
 *  - File-change event triggers a debounced reload
 *  - Cleanup on unmount (unsubscribe + cancel debounce)
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { usePersonalityFiles } from '../../../../src/renderer/src/hooks/usePersonalityFiles'
import personalityFilesReducer from '../../../../src/renderer/src/store/personalityFilesSlice'

// ---------------------------------------------------------------------------
// Mock window.api helpers
// ---------------------------------------------------------------------------

const mockPersonalityLoadAll = jest.fn()
const mockWorkspaceGetCurrent = jest.fn()
let fileChangeCallback: ((event: {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}) => void) | null = null

const mockUnsubscribe = jest.fn()

beforeEach(() => {
  fileChangeCallback = null
  mockPersonalityLoadAll.mockResolvedValue([])
  mockWorkspaceGetCurrent.mockResolvedValue(null)
  mockUnsubscribe.mockClear()

  Object.defineProperty(global.window, 'api', {
    value: {
      ...(global.window.api ?? {}),
      personalityLoadAll: mockPersonalityLoadAll,
      personalityLoadOne: jest.fn().mockResolvedValue(null),
      workspaceGetCurrent: mockWorkspaceGetCurrent,
      onPersonalityFileChange: jest.fn().mockImplementation((cb) => {
        fileChangeCallback = cb
        return mockUnsubscribe
      })
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
// Test helpers
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
// Tests
// ---------------------------------------------------------------------------

describe('usePersonalityFiles', () => {
  it('should call personalityLoadAll when a workspace is set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(mockPersonalityLoadAll).toHaveBeenCalledTimes(1)
    })
  })

  it('should not call personalityLoadAll when no workspace is set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(mockWorkspaceGetCurrent).toHaveBeenCalled()
    })

    expect(mockPersonalityLoadAll).not.toHaveBeenCalled()
  })

  it('should populate the store with loaded files', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')
    mockPersonalityLoadAll.mockResolvedValue([
      {
        id: 'abc',
        sectionId: 'emotional-depth',
        path: '/workspace/personality/emotional-depth/abc',
        metadata: { title: 'Loaded', provider: 'openai', model: 'gpt-4' },
        content: 'content here',
        savedAt: Date.now()
      }
    ])

    const { store, wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      const state = store.getState() as { personalityFiles: { files: Record<string, unknown[]> } }
      expect(state.personalityFiles.files['emotional-depth']).toHaveLength(1)
    })
  })

  it('should log and tolerate errors from personalityLoadAll', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')
    mockPersonalityLoadAll.mockRejectedValue(new Error('Load error'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })

  it('should subscribe to personality file-change events on mount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(window.api.onPersonalityFileChange).toHaveBeenCalled()
    })
  })

  it('should trigger a debounced reload when a file-change event arrives', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    // Wait for the initial load to complete
    await act(async () => {
      await Promise.resolve()
    })

    const loadCallsBefore = mockPersonalityLoadAll.mock.calls.length

    // Simulate a file-change event
    act(() => {
      fileChangeCallback?.({
        type: 'added',
        sectionId: 'consciousness',
        fileId: 'new-file',
        filePath: '/workspace/personality/consciousness/new-file/DATA.md',
        timestamp: Date.now()
      })
    })

    // Debounce hasn't fired yet
    expect(mockPersonalityLoadAll.mock.calls.length).toBe(loadCallsBefore)

    // Advance past the 500ms debounce window
    act(() => {
      jest.advanceTimersByTime(600)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockPersonalityLoadAll.mock.calls.length).toBeGreaterThan(loadCallsBefore)
  })

  it('should call the unsubscribe function on unmount', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')

    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => usePersonalityFiles(), { wrapper })

    await waitFor(() => {
      expect(window.api.onPersonalityFileChange).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should coalesce rapid file-change events into a single reload', async () => {
    jest.useFakeTimers()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')

    const { wrapper } = createWrapper()
    renderHook(() => usePersonalityFiles(), { wrapper })

    await act(async () => { await Promise.resolve() })

    const loadsBefore = mockPersonalityLoadAll.mock.calls.length

    // Fire multiple change events in quick succession
    for (let i = 0; i < 5; i++) {
      act(() => {
        fileChangeCallback?.({
          type: 'changed',
          sectionId: 'motivation',
          fileId: `file-${i}`,
          filePath: `/workspace/personality/motivation/file-${i}/DATA.md`,
          timestamp: Date.now()
        })
      })
      act(() => { jest.advanceTimersByTime(100) })
    }

    // Now advance past the debounce window
    act(() => { jest.advanceTimersByTime(600) })

    await act(async () => { await Promise.resolve() })

    // Exactly one reload should have been triggered (debounced)
    expect(mockPersonalityLoadAll.mock.calls.length).toBe(loadsBefore + 1)
  })
})
