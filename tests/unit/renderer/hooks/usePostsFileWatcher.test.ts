/**
 * Tests for usePostsFileWatcher hook.
 *
 * The hook:
 *  1. On mount (once), subscribes to window.posts.onFileChange and
 *     window.posts.onWatcherError.
 *  2. On 'removed' events — dispatches handleExternalPostDelete and calls
 *     window.notification.show.
 *  3. On 'added' or 'changed' events — calls window.posts.loadFromWorkspace,
 *     finds the updated post, dispatches handleExternalPostChange, and calls
 *     window.notification.show.
 *  4. On watcher errors — calls window.notification.show with urgency 'critical'.
 *  5. Uses isListeningRef to prevent duplicate listener registration.
 *  6. On unmount, calls both unsubscribe functions and resets the ref.
 *
 * Covered cases:
 *  - Duplicate-listener guard (isListeningRef)
 *  - 'removed' event: dispatches handleExternalPostDelete + notification
 *  - 'added' event: reloads posts, dispatches handleExternalPostChange + notification
 *  - 'changed' event: same as 'added'
 *  - Post not found after reload: no dispatch, warns console
 *  - Error during reload: dispatches nothing, shows sync-error notification
 *  - Watcher error event: shows critical notification
 *  - Cleanup: both unsubscribe functions called on unmount
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { usePostsFileWatcher } from '../../../../src/renderer/src/hooks/usePostsFileWatcher'
import postsReducer, { type Post } from '../../../../src/renderer/src/store/postsSlice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileChangeCallback = (event: {
  type: 'added' | 'changed' | 'removed'
  postId: string
  filePath: string
  timestamp: number
}) => void

type WatcherErrorCallback = (error: {
  error: string
  timestamp: number
}) => void

// ---------------------------------------------------------------------------
// Mocks for window.posts and window.notification
// ---------------------------------------------------------------------------

const mockLoadFromWorkspace = jest.fn()
const mockUnsubscribeFileChange = jest.fn()
const mockUnsubscribeWatcherError = jest.fn()
const mockNotificationShow = jest.fn()

let capturedFileChangeCallback: FileChangeCallback | null = null
let capturedWatcherErrorCallback: WatcherErrorCallback | null = null

function installWindowMocks(): void {
  Object.defineProperty(window, 'posts', {
    value: {
      loadFromWorkspace: mockLoadFromWorkspace,
      onFileChange: jest.fn().mockImplementation((cb: FileChangeCallback) => {
        capturedFileChangeCallback = cb
        return mockUnsubscribeFileChange
      }),
      onWatcherError: jest.fn().mockImplementation((cb: WatcherErrorCallback) => {
        capturedWatcherErrorCallback = cb
        return mockUnsubscribeWatcherError
      })
    },
    writable: true,
    configurable: true
  })

  Object.defineProperty(window, 'notification', {
    value: { show: mockNotificationShow },
    writable: true,
    configurable: true
  })
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_POST: Post = {
  id: 'post-abc',
  title: 'A Test Post',
  blocks: [{ id: 'block-1', content: 'Hello World' }],
  category: 'technology',
  tags: ['testing'],
  visibility: 'public',
  createdAt: 1000000,
  updatedAt: 1000001
}

const FILE_CHANGE_BASE = {
  postId: SAMPLE_POST.id,
  filePath: '/workspace/posts/post-abc.json',
  timestamp: Date.now()
}

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
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  capturedFileChangeCallback = null
  capturedWatcherErrorCallback = null
  mockLoadFromWorkspace.mockResolvedValue([])
  mockNotificationShow.mockResolvedValue('notif-id')
  mockUnsubscribeFileChange.mockClear()
  mockUnsubscribeWatcherError.mockClear()

  installWindowMocks()
})

afterEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePostsFileWatcher — mount and subscription', () => {
  it('subscribes to posts.onFileChange and posts.onWatcherError on mount', async () => {
    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => {
      expect(window.posts.onFileChange).toHaveBeenCalledTimes(1)
      expect(window.posts.onWatcherError).toHaveBeenCalledTimes(1)
    })
  })

  it('does not register duplicate listeners on re-render', async () => {
    const { wrapper } = createWrapper()
    const { rerender } = renderHook(() => usePostsFileWatcher(), { wrapper })

    rerender()
    rerender()

    await waitFor(() => {
      // Effect deps only include dispatch (stable); isListeningRef guard prevents
      // multiple registrations even if the effect were to re-run
      expect(window.posts.onFileChange).toHaveBeenCalledTimes(1)
    })
  })
})

describe('usePostsFileWatcher — removed event', () => {
  it('dispatches handleExternalPostDelete when a post is removed', async () => {
    const { store, wrapper } = createWrapper([SAMPLE_POST])
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'removed' })
    })

    const state = store.getState() as { posts: { posts: Post[] } }
    expect(state.posts.posts.find((p) => p.id === SAMPLE_POST.id)).toBeUndefined()
  })

  it('shows a notification when a post is removed', async () => {
    const { wrapper } = createWrapper([SAMPLE_POST])
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'removed' })
    })

    expect(mockNotificationShow).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Post Deleted' })
    )
  })
})

describe('usePostsFileWatcher — added / changed events', () => {
  it('calls loadFromWorkspace and dispatches handleExternalPostChange on "added"', async () => {
    mockLoadFromWorkspace.mockResolvedValue([SAMPLE_POST])

    const { store, wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'added' })
    })

    const state = store.getState() as { posts: { posts: Post[] } }
    expect(state.posts.posts.find((p) => p.id === SAMPLE_POST.id)).toBeDefined()
  })

  it('calls loadFromWorkspace and dispatches handleExternalPostChange on "changed"', async () => {
    const updatedPost: Post = { ...SAMPLE_POST, title: 'Updated Title' }
    mockLoadFromWorkspace.mockResolvedValue([updatedPost])

    const { store, wrapper } = createWrapper([SAMPLE_POST])
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'changed' })
    })

    const state = store.getState() as { posts: { posts: Post[] } }
    const found = state.posts.posts.find((p) => p.id === SAMPLE_POST.id)
    expect(found?.title).toBe('Updated Title')
  })

  it('shows a "Post Updated" notification with action "created" on added', async () => {
    mockLoadFromWorkspace.mockResolvedValue([SAMPLE_POST])

    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'added' })
    })

    expect(mockNotificationShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Post Updated',
        body: expect.stringContaining('created')
      })
    )
  })

  it('shows a "Post Updated" notification with action "modified" on changed', async () => {
    mockLoadFromWorkspace.mockResolvedValue([SAMPLE_POST])

    const { wrapper } = createWrapper([SAMPLE_POST])
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'changed' })
    })

    expect(mockNotificationShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Post Updated',
        body: expect.stringContaining('modified')
      })
    )
  })

  it('warns when the changed post is not found in the reload result', async () => {
    // loadFromWorkspace returns a list that does NOT include the changed post
    mockLoadFromWorkspace.mockResolvedValue([])

    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation()
    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'changed' })
    })

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Post not found after reload'),
      SAMPLE_POST.id
    )

    consoleWarn.mockRestore()
  })
})

describe('usePostsFileWatcher — error handling', () => {
  it('shows a sync-error notification when loadFromWorkspace throws', async () => {
    mockLoadFromWorkspace.mockRejectedValue(new Error('IPC failure'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'added' })
    })

    expect(mockNotificationShow).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sync Error' })
    )
    consoleError.mockRestore()
  })

  it('shows a critical notification when a watcher error arrives', async () => {
    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedWatcherErrorCallback).not.toBeNull() })

    await act(async () => {
      await capturedWatcherErrorCallback!({
        error: 'ENOENT: directory not found',
        timestamp: Date.now()
      })
    })

    expect(mockNotificationShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'File Watcher Error',
        urgency: 'critical'
      })
    )
  })

  it('logs but does not throw when the notification call itself fails', async () => {
    mockLoadFromWorkspace.mockRejectedValue(new Error('IPC failure'))
    mockNotificationShow.mockRejectedValue(new Error('Notification service unavailable'))

    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const { wrapper } = createWrapper()
    renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => { expect(capturedFileChangeCallback).not.toBeNull() })

    // Should not throw even when both the main handler AND the notification fail
    await act(async () => {
      await capturedFileChangeCallback!({ ...FILE_CHANGE_BASE, type: 'added' })
    })

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('usePostsFileWatcher — cleanup on unmount', () => {
  it('calls both unsubscribe functions on unmount', async () => {
    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => usePostsFileWatcher(), { wrapper })

    await waitFor(() => {
      expect(window.posts.onFileChange).toHaveBeenCalled()
      expect(window.posts.onWatcherError).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribeFileChange).toHaveBeenCalledTimes(1)
    expect(mockUnsubscribeWatcherError).toHaveBeenCalledTimes(1)
  })
})
