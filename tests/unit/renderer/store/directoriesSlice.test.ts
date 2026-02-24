/**
 * Tests for directoriesSlice - the Redux store for indexed directories state.
 *
 * Tests cover:
 *   - All reducers: setLoading, setError, loadDirectories, addDirectory,
 *     addDirectories, removeDirectory, markDirectoryIndexed,
 *     handleExternalDirectoriesChange, clearDirectories
 *   - Selectors: selectDirectories, selectDirectoriesLoading, selectDirectoriesError,
 *     selectDirectoryCount, selectIndexedCount, selectPendingCount
 *   - Edge cases: duplicate prevention, missing ID, empty state
 */

import directoriesReducer, {
  setLoading,
  setError,
  loadDirectories,
  addDirectory,
  addDirectories,
  removeDirectory,
  markDirectoryIndexed,
  handleExternalDirectoriesChange,
  clearDirectories,
  selectDirectories,
  selectDirectoriesLoading,
  selectDirectoriesError,
  selectDirectoryCount,
  selectIndexedCount,
  selectPendingCount,
  type IndexedDirectory
} from '../../../../src/renderer/src/store/directoriesSlice'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialState() {
  return {
    directories: [] as IndexedDirectory[],
    isLoading: false,
    error: null as string | null
  }
}

function makeDirectory(overrides: Partial<IndexedDirectory> = {}): IndexedDirectory {
  return {
    id: 'dir-1',
    path: '/home/user/docs',
    addedAt: 1000,
    isIndexed: false,
    ...overrides
  }
}

// Root-shaped state for selectors
function makeRootState(slice = createInitialState()) {
  return { directories: slice }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('directoriesSlice', () => {
  describe('reducers', () => {
    describe('setLoading', () => {
      it('should set isLoading to true', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = directoriesReducer(state, setLoading(true))

        // Assert
        expect(result.isLoading).toBe(true)
      })

      it('should set isLoading to false', () => {
        // Arrange
        const state = { ...createInitialState(), isLoading: true }

        // Act
        const result = directoriesReducer(state, setLoading(false))

        // Assert
        expect(result.isLoading).toBe(false)
      })
    })

    describe('setError', () => {
      it('should set an error message', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = directoriesReducer(state, setError('Something went wrong'))

        // Assert
        expect(result.error).toBe('Something went wrong')
      })

      it('should clear the error when set to null', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'Previous error' }

        // Act
        const result = directoriesReducer(state, setError(null))

        // Assert
        expect(result.error).toBeNull()
      })
    })

    describe('loadDirectories', () => {
      it('should replace the directories list with the payload', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory()] }
        const incoming = [
          makeDirectory({ id: 'dir-a', path: '/a' }),
          makeDirectory({ id: 'dir-b', path: '/b' })
        ]

        // Act
        const result = directoriesReducer(state, loadDirectories(incoming))

        // Assert
        expect(result.directories).toHaveLength(2)
        expect(result.directories[0].id).toBe('dir-a')
        expect(result.directories[1].id).toBe('dir-b')
      })

      it('should clear isLoading and error after loading', () => {
        // Arrange
        const state = { ...createInitialState(), isLoading: true, error: 'old error' }

        // Act
        const result = directoriesReducer(state, loadDirectories([]))

        // Assert
        expect(result.isLoading).toBe(false)
        expect(result.error).toBeNull()
      })

      it('should replace with an empty list when payload is empty', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory()] }

        // Act
        const result = directoriesReducer(state, loadDirectories([]))

        // Assert
        expect(result.directories).toHaveLength(0)
      })
    })

    describe('addDirectory', () => {
      it('should append a new directory to the list', () => {
        // Arrange
        const state = createInitialState()
        const dir = makeDirectory({ id: 'new-dir', path: '/new' })

        // Act
        const result = directoriesReducer(state, addDirectory(dir))

        // Assert
        expect(result.directories).toHaveLength(1)
        expect(result.directories[0].id).toBe('new-dir')
      })

      it('should not add a duplicate directory with the same ID', () => {
        // Arrange
        const dir = makeDirectory({ id: 'existing' })
        const state = { ...createInitialState(), directories: [dir] }

        // Act
        const result = directoriesReducer(state, addDirectory(dir))

        // Assert
        expect(result.directories).toHaveLength(1)
      })

      it('should clear error after adding a directory', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'Some error' }

        // Act
        const result = directoriesReducer(state, addDirectory(makeDirectory()))

        // Assert
        expect(result.error).toBeNull()
      })
    })

    describe('addDirectories', () => {
      it('should append all directories that are not already present', () => {
        // Arrange
        const existing = makeDirectory({ id: 'dir-1' })
        const state = { ...createInitialState(), directories: [existing] }
        const incoming = [
          makeDirectory({ id: 'dir-1' }), // duplicate — should be skipped
          makeDirectory({ id: 'dir-2', path: '/b' }),
          makeDirectory({ id: 'dir-3', path: '/c' })
        ]

        // Act
        const result = directoriesReducer(state, addDirectories(incoming))

        // Assert
        expect(result.directories).toHaveLength(3)
        expect(result.directories.map((d) => d.id)).toEqual(['dir-1', 'dir-2', 'dir-3'])
      })

      it('should clear error after adding directories', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'Some error' }

        // Act
        const result = directoriesReducer(state, addDirectories([makeDirectory()]))

        // Assert
        expect(result.error).toBeNull()
      })

      it('should handle an empty payload without changing state', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory()] }

        // Act
        const result = directoriesReducer(state, addDirectories([]))

        // Assert
        expect(result.directories).toHaveLength(1)
      })
    })

    describe('removeDirectory', () => {
      it('should remove the directory with the given ID', () => {
        // Arrange
        const dirA = makeDirectory({ id: 'dir-a', path: '/a' })
        const dirB = makeDirectory({ id: 'dir-b', path: '/b' })
        const state = { ...createInitialState(), directories: [dirA, dirB] }

        // Act
        const result = directoriesReducer(state, removeDirectory('dir-a'))

        // Assert
        expect(result.directories).toHaveLength(1)
        expect(result.directories[0].id).toBe('dir-b')
      })

      it('should not change state when the ID does not exist', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory({ id: 'dir-1' })] }

        // Act
        const result = directoriesReducer(state, removeDirectory('nonexistent'))

        // Assert
        expect(result.directories).toHaveLength(1)
      })

      it('should produce an empty list when removing the only directory', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory({ id: 'only' })] }

        // Act
        const result = directoriesReducer(state, removeDirectory('only'))

        // Assert
        expect(result.directories).toHaveLength(0)
      })
    })

    describe('markDirectoryIndexed', () => {
      it('should update isIndexed and lastIndexedAt on the matching directory', () => {
        // Arrange
        const dir = makeDirectory({ id: 'dir-1', isIndexed: false })
        const state = { ...createInitialState(), directories: [dir] }

        // Act
        const result = directoriesReducer(
          state,
          markDirectoryIndexed({ id: 'dir-1', isIndexed: true, lastIndexedAt: 9999 })
        )

        // Assert
        expect(result.directories[0].isIndexed).toBe(true)
        expect(result.directories[0].lastIndexedAt).toBe(9999)
      })

      it('should update only isIndexed when lastIndexedAt is not provided', () => {
        // Arrange
        const dir = makeDirectory({ id: 'dir-1', isIndexed: false, lastIndexedAt: undefined })
        const state = { ...createInitialState(), directories: [dir] }

        // Act
        const result = directoriesReducer(
          state,
          markDirectoryIndexed({ id: 'dir-1', isIndexed: true })
        )

        // Assert
        expect(result.directories[0].isIndexed).toBe(true)
        expect(result.directories[0].lastIndexedAt).toBeUndefined()
      })

      it('should not modify state when the directory ID does not exist', () => {
        // Arrange
        const dir = makeDirectory({ id: 'dir-1', isIndexed: false })
        const state = { ...createInitialState(), directories: [dir] }

        // Act
        const result = directoriesReducer(
          state,
          markDirectoryIndexed({ id: 'nonexistent', isIndexed: true, lastIndexedAt: 9999 })
        )

        // Assert
        expect(result.directories[0].isIndexed).toBe(false)
        expect(result.directories[0].lastIndexedAt).toBeUndefined()
      })
    })

    describe('handleExternalDirectoriesChange', () => {
      it('should replace the entire directories list with the incoming payload', () => {
        // Arrange
        const oldDir = makeDirectory({ id: 'old' })
        const state = { ...createInitialState(), directories: [oldDir] }
        const newDirs = [
          makeDirectory({ id: 'new-1', path: '/new/1' }),
          makeDirectory({ id: 'new-2', path: '/new/2' })
        ]

        // Act
        const result = directoriesReducer(state, handleExternalDirectoriesChange(newDirs))

        // Assert
        expect(result.directories).toHaveLength(2)
        expect(result.directories[0].id).toBe('new-1')
        expect(result.directories[1].id).toBe('new-2')
      })

      it('should clear the list when payload is empty', () => {
        // Arrange
        const state = { ...createInitialState(), directories: [makeDirectory()] }

        // Act
        const result = directoriesReducer(state, handleExternalDirectoriesChange([]))

        // Assert
        expect(result.directories).toHaveLength(0)
      })
    })

    describe('clearDirectories', () => {
      it('should empty the directories list and clear error', () => {
        // Arrange
        const state = {
          ...createInitialState(),
          directories: [makeDirectory({ id: 'dir-1' }), makeDirectory({ id: 'dir-2' })],
          error: 'some error'
        }

        // Act
        const result = directoriesReducer(state, clearDirectories())

        // Assert
        expect(result.directories).toHaveLength(0)
        expect(result.error).toBeNull()
      })

      it('should be idempotent on an already-empty state', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = directoriesReducer(state, clearDirectories())

        // Assert
        expect(result.directories).toHaveLength(0)
        expect(result.error).toBeNull()
      })
    })
  })

  describe('selectors', () => {
    it('selectDirectories should return the directories array', () => {
      const state = makeRootState()
      expect(selectDirectories(state)).toEqual([])
    })

    it('selectDirectories should return populated array', () => {
      const dir = makeDirectory({ id: 'dir-1' })
      const state = makeRootState({ ...createInitialState(), directories: [dir] })
      expect(selectDirectories(state)).toHaveLength(1)
      expect(selectDirectories(state)[0].id).toBe('dir-1')
    })

    it('selectDirectoriesLoading should return the loading flag', () => {
      const state = makeRootState({ ...createInitialState(), isLoading: true })
      expect(selectDirectoriesLoading(state)).toBe(true)
    })

    it('selectDirectoriesLoading should return false in initial state', () => {
      const state = makeRootState()
      expect(selectDirectoriesLoading(state)).toBe(false)
    })

    it('selectDirectoriesError should return null initially', () => {
      const state = makeRootState()
      expect(selectDirectoriesError(state)).toBeNull()
    })

    it('selectDirectoriesError should return the error string when set', () => {
      const state = makeRootState({ ...createInitialState(), error: 'Failed' })
      expect(selectDirectoriesError(state)).toBe('Failed')
    })

    it('selectDirectoryCount should return 0 when empty', () => {
      const state = makeRootState()
      expect(selectDirectoryCount(state)).toBe(0)
    })

    it('selectDirectoryCount should return the correct count', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [
          makeDirectory({ id: 'a' }),
          makeDirectory({ id: 'b' }),
          makeDirectory({ id: 'c' })
        ]
      })
      expect(selectDirectoryCount(state)).toBe(3)
    })

    it('selectIndexedCount should count only indexed directories', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [
          makeDirectory({ id: 'a', isIndexed: true }),
          makeDirectory({ id: 'b', isIndexed: false }),
          makeDirectory({ id: 'c', isIndexed: true })
        ]
      })
      expect(selectIndexedCount(state)).toBe(2)
    })

    it('selectIndexedCount should return 0 when none are indexed', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [makeDirectory({ id: 'a', isIndexed: false })]
      })
      expect(selectIndexedCount(state)).toBe(0)
    })

    it('selectPendingCount should count only non-indexed directories', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [
          makeDirectory({ id: 'a', isIndexed: true }),
          makeDirectory({ id: 'b', isIndexed: false }),
          makeDirectory({ id: 'c', isIndexed: false })
        ]
      })
      expect(selectPendingCount(state)).toBe(2)
    })

    it('selectPendingCount should return 0 when all are indexed', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [
          makeDirectory({ id: 'a', isIndexed: true }),
          makeDirectory({ id: 'b', isIndexed: true })
        ]
      })
      expect(selectPendingCount(state)).toBe(0)
    })

    it('selectIndexedCount + selectPendingCount should always equal selectDirectoryCount', () => {
      const state = makeRootState({
        ...createInitialState(),
        directories: [
          makeDirectory({ id: 'a', isIndexed: true }),
          makeDirectory({ id: 'b', isIndexed: false }),
          makeDirectory({ id: 'c', isIndexed: true }),
          makeDirectory({ id: 'd', isIndexed: false })
        ]
      })
      expect(selectIndexedCount(state) + selectPendingCount(state)).toBe(selectDirectoryCount(state))
    })
  })
})
