/**
 * Tests for useBrainFiles hook.
 * Loads brain conversation files from workspace on mount.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useBrainFiles } from '../../../../src/renderer/src/hooks/useBrainFiles'
import brainFilesReducer from '../../../../src/renderer/src/store/brainFilesSlice'

// Mock window.api
const mockBrainLoadAll = jest.fn()
const mockWorkspaceGetCurrent = jest.fn()

beforeAll(() => {
  global.window.api = {
    ...global.window.api,
    brainLoadAll: mockBrainLoadAll,
    workspaceGetCurrent: mockWorkspaceGetCurrent
  } as any
})

describe('useBrainFiles', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    jest.clearAllMocks()
    store = configureStore({
      reducer: {
        brainFiles: brainFilesReducer
      }
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children)

  it('should load brain files when workspace is available', async () => {
    const mockFiles = [
      {
        id: '123',
        sectionId: 'principles',
        path: '/workspace/brain/principles/123.md',
        metadata: {
          sectionId: 'principles',
          title: 'Test Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        content: 'Test content',
        savedAt: Date.now()
      }
    ]

    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')
    mockBrainLoadAll.mockResolvedValue(mockFiles)

    renderHook(() => useBrainFiles(), { wrapper })

    await waitFor(() => {
      expect(mockBrainLoadAll).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      const state = store.getState()
      expect(state.brainFiles.files.principles).toHaveLength(1)
    }, { timeout: 3000 })

    const state = store.getState()
    expect(state.brainFiles.files.principles[0].id).toBe('123')
  })

  it('should not load brain files when no workspace is set', async () => {
    mockWorkspaceGetCurrent.mockResolvedValue(null)

    renderHook(() => useBrainFiles(), { wrapper })

    await waitFor(() => {
      expect(mockWorkspaceGetCurrent).toHaveBeenCalled()
    })

    expect(mockBrainLoadAll).not.toHaveBeenCalled()
  })

  it('should handle load errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    mockWorkspaceGetCurrent.mockResolvedValue('/workspace')
    mockBrainLoadAll.mockRejectedValue(new Error('Load failed'))

    renderHook(() => useBrainFiles(), { wrapper })

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[useBrainFiles] Failed to load brain files:',
        expect.any(Error)
      )
    })

    consoleError.mockRestore()
  })

  it('should reload when workspace changes', async () => {
    mockWorkspaceGetCurrent
      .mockResolvedValueOnce('/workspace1')
      .mockResolvedValueOnce('/workspace2')
    mockBrainLoadAll.mockResolvedValue([])

    const { rerender } = renderHook(() => useBrainFiles(), { wrapper })

    await waitFor(() => {
      expect(mockBrainLoadAll).toHaveBeenCalledTimes(1)
    })

    // Simulate workspace change
    rerender()

    await waitFor(() => {
      expect(mockBrainLoadAll).toHaveBeenCalledTimes(1)
    })
  })
})
