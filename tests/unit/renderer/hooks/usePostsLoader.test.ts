/**
 * Tests for usePostsLoader hook and the reloadPostsFromWorkspace utility.
 *
 * usePostsLoader:
 *  1. On mount, calls window.api.workspaceGetCurrent().
 *     - If no workspace: skips load, marks hasLoaded = true.
 *     - If workspace exists: calls window.api.postsLoadFromWorkspace, dispatches
 *       loadPosts() to populate the Redux store.
 *  2. Uses hasLoadedRef to prevent duplicate loads across re-renders.
 *  3. On error: records error in errorRef, shows notification unless ENOENT.
 *  4. Returns { isLoading, error } — backed by refs (synchronous snapshot).
 *
 * reloadPostsFromWorkspace:
 *  1. Checks workspace, loads posts, dispatches loadPosts.
 *  2. On error: shows notification unless ENOENT, then re-throws.
 *
 * Covered cases:
 *  - Initial load with workspace present
 *  - No load when workspace is absent
 *  - Store is populated after a successful load
 *  - ENOENT error: does NOT show notification
 *  - Other error: shows notification
 *  - Duplicate-load prevention (hasLoadedRef guard)
 *  - reloadPostsFromWorkspace happy path
 *  - reloadPostsFromWorkspace skips when no workspace
 *  - reloadPostsFromWorkspace re-throws errors (non-ENOENT shows notification)
 *  - reloadPostsFromWorkspace ENOENT: re-throws but no notification
 *
 * Note: isLoading/error are backed by refs, not React state, so they reflect
 * the synchronous value at render time and do NOT trigger re-renders.
 * The returned values reflect the state at mount time (both false / null).
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import {
  usePostsLoader,
  reloadPostsFromWorkspace
} from '../../../../src/renderer/src/hooks/usePostsLoader'
import postsReducer, { type Post } from '../../../../src/renderer/src/store/postsSlice'

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'First Post',
    blocks: [{ id: 'b1', content: 'Hello' }],
    category: 'technology',
    tags: ['a'],
    visibility: 'public',
    createdAt: 1000,
    updatedAt: 1001
  },
  {
    id: 'post-2',
    title: 'Second Post',
    blocks: [{ id: 'b2', content: 'World' }],
    category: 'science',
    tags: [],
    visibility: 'private',
    createdAt: 2000,
    updatedAt: 2001
  }
]

// ---------------------------------------------------------------------------
// Store & wrapper factory
// ---------------------------------------------------------------------------

function createWrapper(initialPosts: Post[] = []) {
  const store = configureStore({
    reducer: { posts: postsReducer },
    preloadedState: { posts: { posts: initialPosts } }
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children)
  return { store, wrapper }
}

// ---------------------------------------------------------------------------
// Mock api methods not included in the preload-bridge stub
// ---------------------------------------------------------------------------

const mockWorkspaceGetCurrent = jest.fn().mockResolvedValue(null)
const mockPostsLoadFromWorkspace = jest.fn().mockResolvedValue([])
const mockNotificationShow = jest.fn().mockResolvedValue('notif-id')

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockWorkspaceGetCurrent.mockResolvedValue(null)
  mockPostsLoadFromWorkspace.mockResolvedValue([])
  mockNotificationShow.mockResolvedValue('notif-id')

  // Extend window.api with methods not present in the preload-bridge stub.
  // workspaceGetCurrent IS in the preload-bridge but postsLoadFromWorkspace is not.
  Object.defineProperty(window, 'api', {
    value: {
      ...window.api,
      workspaceGetCurrent: mockWorkspaceGetCurrent,
      postsLoadFromWorkspace: mockPostsLoadFromWorkspace,
      notificationShow: mockNotificationShow
    },
    writable: true,
    configurable: true
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests — usePostsLoader
// ---------------------------------------------------------------------------

describe('usePostsLoader — initial state', () => {
  it('returns isLoading false and error null synchronously on mount', () => {
    // workspaceGetCurrent is pending (never resolves here — we check synchronous snapshot)
    ;(window.api.workspaceGetCurrent as jest.Mock).mockReturnValue(new Promise(() => {}))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePostsLoader(), { wrapper })

    // Refs are read synchronously at render; both start as false / null
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})

describe('usePostsLoader — workspace absent', () => {
  it('skips postsLoadFromWorkspace when no workspace is set', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue(null)

    const { wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.workspaceGetCurrent).toHaveBeenCalled()
    })

    expect(window.api.postsLoadFromWorkspace).not.toHaveBeenCalled()
  })

  it('does not populate the store when workspace is absent', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue(null)

    const { store, wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.workspaceGetCurrent).toHaveBeenCalled()
    })

    const state = store.getState() as { posts: { posts: Post[] } }
    expect(state.posts.posts).toHaveLength(0)
  })
})

describe('usePostsLoader — workspace present', () => {
  it('calls postsLoadFromWorkspace when a workspace is set', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockResolvedValue(SAMPLE_POSTS)

    const { wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.postsLoadFromWorkspace).toHaveBeenCalledTimes(1)
    })
  })

  it('populates the Redux store with loaded posts', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockResolvedValue(SAMPLE_POSTS)

    const { store, wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      const state = store.getState() as { posts: { posts: Post[] } }
      expect(state.posts.posts).toHaveLength(SAMPLE_POSTS.length)
    })
  })

  it('correctly stores the post titles in the Redux store', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockResolvedValue(SAMPLE_POSTS)

    const { store, wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      const state = store.getState() as { posts: { posts: Post[] } }
      const titles = state.posts.posts.map((p) => p.title)
      expect(titles).toContain('First Post')
      expect(titles).toContain('Second Post')
    })
  })
})

describe('usePostsLoader — duplicate-load prevention', () => {
  it('does not call postsLoadFromWorkspace more than once across re-renders', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockResolvedValue(SAMPLE_POSTS)

    const { wrapper } = createWrapper()
    const { rerender } = renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.postsLoadFromWorkspace).toHaveBeenCalledTimes(1)
    })

    // Force multiple re-renders
    rerender()
    rerender()

    // Still only called once — hasLoadedRef guard prevents duplicate loads
    expect(window.api.postsLoadFromWorkspace).toHaveBeenCalledTimes(1)
  })
})

describe('usePostsLoader — error handling', () => {
  it('does not show a notification for ENOENT errors', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory')
    )

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.postsLoadFromWorkspace).toHaveBeenCalled()
    })

    // Small delay to allow async catch block to complete
    await act(async () => { await Promise.resolve() })

    expect(window.api.notificationShow).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('shows a notification for non-ENOENT errors', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockRejectedValue(
      new Error('Permission denied')
    )

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(window.api.notificationShow).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Load Failed' })
      )
    })

    consoleError.mockRestore()
  })

  it('logs the error regardless of type', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockRejectedValue(new Error('Crash'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    const { wrapper } = createWrapper()
    renderHook(() => usePostsLoader(), { wrapper })

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Tests — reloadPostsFromWorkspace utility
// ---------------------------------------------------------------------------

describe('reloadPostsFromWorkspace', () => {
  it('dispatches loadPosts when workspace is set', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockResolvedValue(SAMPLE_POSTS)

    const { store, wrapper } = createWrapper()

    // Render a temporary hook to access the real store dispatch
    let storeDispatch: ReturnType<typeof store.dispatch> | undefined

    renderHook(
      () => {
        storeDispatch = store.dispatch
        return null
      },
      { wrapper }
    )

    await act(async () => {
      await reloadPostsFromWorkspace(store.dispatch)
    })

    const state = store.getState() as { posts: { posts: Post[] } }
    expect(state.posts.posts).toHaveLength(SAMPLE_POSTS.length)
  })

  it('does nothing when no workspace is set', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue(null)

    const { store, wrapper } = createWrapper()
    renderHook(() => null, { wrapper })

    await act(async () => {
      await reloadPostsFromWorkspace(store.dispatch)
    })

    expect(window.api.postsLoadFromWorkspace).not.toHaveBeenCalled()
  })

  it('re-throws non-ENOENT errors and shows notification', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockRejectedValue(new Error('Disk full'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const { store, wrapper } = createWrapper()
    renderHook(() => null, { wrapper })

    await expect(
      act(async () => {
        await reloadPostsFromWorkspace(store.dispatch)
      })
    ).rejects.toThrow('Disk full')

    expect(window.api.notificationShow).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reload Failed' })
    )
    consoleError.mockRestore()
  })

  it('re-throws ENOENT errors WITHOUT showing a notification', async () => {
    ;(window.api.workspaceGetCurrent as jest.Mock).mockResolvedValue('/workspace/path')
    ;(window.api.postsLoadFromWorkspace as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory')
    )

    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const { store, wrapper } = createWrapper()
    renderHook(() => null, { wrapper })

    await expect(
      act(async () => {
        await reloadPostsFromWorkspace(store.dispatch)
      })
    ).rejects.toThrow('ENOENT')

    expect(window.api.notificationShow).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
