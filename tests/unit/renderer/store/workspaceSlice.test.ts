/**
 * Tests for workspaceSlice deletion handling.
 *
 * Validates that the Redux workspace state correctly handles
 * workspace deletion events and state transitions.
 */

import {
  workspaceSlice,
  handleWorkspaceChanged,
  handleWorkspaceDeleted,
  clearDeletionReason,
  selectHasWorkspace,
  selectCurrentWorkspacePath,
  selectWorkspaceDeletionReason
} from '../../../../src/renderer/src/store/workspaceSlice'
import type { WorkspaceState } from '../../../../src/renderer/src/store/workspaceSlice'

const reducer = workspaceSlice.reducer

describe('workspaceSlice', () => {
  const initialState: WorkspaceState = {
    currentPath: null,
    recentWorkspaces: [],
    status: 'idle',
    error: null,
    deletionReason: null
  }

  const activeWorkspaceState: WorkspaceState = {
    currentPath: '/my/workspace',
    recentWorkspaces: [{ path: '/my/workspace', lastOpened: Date.now() }],
    status: 'ready',
    error: null,
    deletionReason: null
  }

  describe('handleWorkspaceDeleted', () => {
    it('should clear currentPath and set deletionReason', () => {
      const state = reducer(
        activeWorkspaceState,
        handleWorkspaceDeleted({
          deletedPath: '/my/workspace',
          reason: 'deleted'
        })
      )

      expect(state.currentPath).toBeNull()
      expect(state.deletionReason).toBe('deleted')
      expect(state.status).toBe('ready')
      expect(state.error).toBeNull()
    })

    it('should handle inaccessible reason', () => {
      const state = reducer(
        activeWorkspaceState,
        handleWorkspaceDeleted({
          deletedPath: '/my/workspace',
          reason: 'inaccessible'
        })
      )

      expect(state.currentPath).toBeNull()
      expect(state.deletionReason).toBe('inaccessible')
    })

    it('should handle renamed reason', () => {
      const state = reducer(
        activeWorkspaceState,
        handleWorkspaceDeleted({
          deletedPath: '/my/workspace',
          reason: 'renamed'
        })
      )

      expect(state.deletionReason).toBe('renamed')
    })
  })

  describe('clearDeletionReason', () => {
    it('should reset deletionReason to null', () => {
      const stateWithDeletion: WorkspaceState = {
        ...initialState,
        deletionReason: 'deleted'
      }

      const state = reducer(stateWithDeletion, clearDeletionReason())

      expect(state.deletionReason).toBeNull()
    })

    it('should be a no-op when deletionReason is already null', () => {
      const state = reducer(initialState, clearDeletionReason())

      expect(state.deletionReason).toBeNull()
    })
  })

  describe('handleWorkspaceChanged', () => {
    it('should clear deletionReason when workspace changes', () => {
      const stateWithDeletion: WorkspaceState = {
        ...initialState,
        deletionReason: 'deleted'
      }

      const state = reducer(
        stateWithDeletion,
        handleWorkspaceChanged({
          currentPath: '/new/workspace',
          previousPath: null
        })
      )

      expect(state.currentPath).toBe('/new/workspace')
      expect(state.deletionReason).toBeNull()
    })
  })

  describe('selectors', () => {
    it('selectHasWorkspace returns false after deletion', () => {
      const state = reducer(
        activeWorkspaceState,
        handleWorkspaceDeleted({
          deletedPath: '/my/workspace',
          reason: 'deleted'
        })
      )
      const rootState = { workspace: state } as any

      expect(selectHasWorkspace(rootState)).toBe(false)
      expect(selectCurrentWorkspacePath(rootState)).toBeNull()
    })

    it('selectWorkspaceDeletionReason returns the reason after deletion', () => {
      const state = reducer(
        activeWorkspaceState,
        handleWorkspaceDeleted({
          deletedPath: '/my/workspace',
          reason: 'inaccessible'
        })
      )
      const rootState = { workspace: state } as any

      expect(selectWorkspaceDeletionReason(rootState)).toBe('inaccessible')
    })

    it('selectWorkspaceDeletionReason returns null when no deletion', () => {
      const rootState = { workspace: activeWorkspaceState } as any

      expect(selectWorkspaceDeletionReason(rootState)).toBeNull()
    })
  })
})
