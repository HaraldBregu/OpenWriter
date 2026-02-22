/**
 * Tests for brainFilesSlice Redux slice.
 * Manages brain conversation files state.
 */
import { configureStore } from '@reduxjs/toolkit'
import brainFilesReducer, {
  saveBrainFile,
  loadBrainFiles,
  deleteBrainFile,
  selectAllBrainFiles,
  selectBrainFilesBySection,
  selectBrainFilesLoading,
  selectBrainFilesError,
  selectLastSaved
} from '../../../../src/renderer/src/store/brainFilesSlice'

// Mock window.api
const mockBrainSave = jest.fn()
const mockBrainLoadAll = jest.fn()
const mockBrainDelete = jest.fn()

beforeAll(() => {
  global.window.api = {
    ...global.window.api,
    brainSave: mockBrainSave,
    brainLoadAll: mockBrainLoadAll,
    brainDelete: mockBrainDelete
  } as any
})

describe('brainFilesSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    jest.clearAllMocks()
    store = configureStore({
      reducer: {
        brainFiles: brainFilesReducer
      }
    })
  })

  describe('initial state', () => {
    it('should have empty files for all sections', () => {
      const state = store.getState().brainFiles
      expect(state.files.principles).toEqual([])
      expect(state.files.consciousness).toEqual([])
      expect(state.files.memory).toEqual([])
      expect(state.files.reasoning).toEqual([])
      expect(state.files.perception).toEqual([])
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.saveSuccess).toBeNull()
    })
  })

  describe('saveBrainFile', () => {
    it('should save a brain file successfully', async () => {
      const mockResult = {
        id: '123',
        path: '/workspace/brain/principles/123.md',
        savedAt: Date.now()
      }

      mockBrainSave.mockResolvedValue(mockResult)

      await store.dispatch(
        saveBrainFile({
          sectionId: 'principles',
          content: 'Test content',
          metadata: {
            title: 'Test Conversation',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        }) as any
      )

      const state = store.getState().brainFiles
      expect(state.lastSaved).toEqual({
        fileId: mockResult.id,
        timestamp: expect.any(Number)
      })
      expect(state.error).toBeNull()
    })

    it('should handle save errors', async () => {
      mockBrainSave.mockRejectedValue(new Error('Save failed'))

      await store.dispatch(
        saveBrainFile({
          sectionId: 'principles',
          content: 'Test',
          metadata: {}
        }) as any
      )

      const state = store.getState().brainFiles
      expect(state.error).toBe('Save failed')
      expect(state.lastSaved).toBeNull()
    })

    it('should set loading state during save', async () => {
      let resolvePromise: any
      mockBrainSave.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      const promise = store.dispatch(
        saveBrainFile({
          sectionId: 'principles',
          content: 'Test',
          metadata: {}
        }) as any
      )

      // Check loading state is set to true
      expect(store.getState().brainFiles.loading).toBe(true)

      resolvePromise({
        id: '123',
        path: '/test',
        savedAt: Date.now()
      })

      await promise

      // After completion, loading should be false
      expect(store.getState().brainFiles.loading).toBe(false)
    })
  })

  describe('loadBrainFiles', () => {
    it('should load all brain files successfully', async () => {
      const mockFiles = [
        {
          id: '123',
          sectionId: 'principles',
          path: '/workspace/brain/principles/123.md',
          metadata: {
            sectionId: 'principles',
            title: 'Test 1',
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          content: 'Content 1',
          savedAt: Date.now()
        },
        {
          id: '456',
          sectionId: 'memory',
          path: '/workspace/brain/memory/456.md',
          metadata: {
            sectionId: 'memory',
            title: 'Test 2',
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          content: 'Content 2',
          savedAt: Date.now()
        }
      ]

      mockBrainLoadAll.mockResolvedValue(mockFiles)

      await store.dispatch(loadBrainFiles() as any)

      const state = store.getState().brainFiles
      expect(state.files.principles).toHaveLength(1)
      expect(state.files.memory).toHaveLength(1)
      expect(state.files.principles[0].id).toBe('123')
      expect(state.files.memory[0].id).toBe('456')
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle load errors', async () => {
      mockBrainLoadAll.mockRejectedValue(new Error('Load failed'))

      await store.dispatch(loadBrainFiles() as any)

      const state = store.getState().brainFiles
      expect(state.error).toBe('Load failed')
      expect(state.loading).toBe(false)
    })

    it('should set loading state during load', async () => {
      let resolvePromise: any
      mockBrainLoadAll.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      const promise = store.dispatch(loadBrainFiles() as any)

      // Check loading state
      expect(store.getState().brainFiles.loading).toBe(true)

      resolvePromise([])
      await promise

      expect(store.getState().brainFiles.loading).toBe(false)
    })
  })

  describe('deleteBrainFile', () => {
    it('should delete a brain file successfully', async () => {
      // First load a file
      mockBrainLoadAll.mockResolvedValue([
        {
          id: '123',
          sectionId: 'principles',
          path: '/test',
          metadata: {
            sectionId: 'principles',
            title: 'Test',
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          content: 'Content',
          savedAt: Date.now()
        }
      ])

      await store.dispatch(loadBrainFiles() as any)

      expect(store.getState().brainFiles.files.principles).toHaveLength(1)

      // Now delete it
      mockBrainDelete.mockResolvedValue(undefined)

      await store.dispatch(
        deleteBrainFile({
          sectionId: 'principles',
          id: '123'
        }) as any
      )

      const state = store.getState().brainFiles
      expect(state.files.principles).toHaveLength(0)
      expect(state.error).toBeNull()
    })

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed')
      mockBrainDelete.mockRejectedValue(error)

      await store.dispatch(
        deleteBrainFile({
          sectionId: 'principles',
          id: '123'
        }) as any
      )

      const state = store.getState().brainFiles
      expect(state.error).toBe('Delete failed')
    })
  })

  describe('selectors', () => {
    it('should select files by section', async () => {
      const mockFiles = [
        {
          id: '123',
          sectionId: 'principles',
          path: '/test',
          metadata: {
            sectionId: 'principles',
            title: 'Test',
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          content: 'Content',
          savedAt: Date.now()
        }
      ]

      mockBrainLoadAll.mockResolvedValue(mockFiles)
      await store.dispatch(loadBrainFiles() as any)

      const state = store.getState()
      const principlesSelector = selectBrainFilesBySection('principles')
      const principlesFiles = principlesSelector(state)
      expect(principlesFiles).toHaveLength(1)
      expect(principlesFiles[0].id).toBe('123')

      const memorySelector = selectBrainFilesBySection('memory')
      const memoryFiles = memorySelector(state)
      expect(memoryFiles).toHaveLength(0)
    })

    it('should select loading state', () => {
      const state = store.getState()
      const loading = selectBrainFilesLoading(state)
      expect(loading).toBe(false)
    })

    it('should select error state', () => {
      const state = store.getState()
      const error = selectBrainFilesError(state)
      expect(error).toBeNull()
    })

    it('should select last saved state', () => {
      const state = store.getState()
      const lastSaved = selectLastSaved(state)
      expect(lastSaved).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle empty load results', async () => {
      mockBrainLoadAll.mockResolvedValue([])

      await store.dispatch(loadBrainFiles() as any)

      const state = store.getState().brainFiles
      expect(state.files.principles).toEqual([])
      expect(state.error).toBeNull()
    })

    it('should handle files with missing metadata fields', async () => {
      const mockFiles = [
        {
          id: '123',
          sectionId: 'principles',
          path: '/test',
          metadata: {
            sectionId: 'principles',
            createdAt: Date.now(),
            updatedAt: Date.now()
            // title is missing
          },
          content: 'Content',
          savedAt: Date.now()
        }
      ]

      mockBrainLoadAll.mockResolvedValue(mockFiles)

      await store.dispatch(loadBrainFiles() as any)

      const state = store.getState().brainFiles
      expect(state.files.principles).toHaveLength(1)
      expect(state.files.principles[0].metadata.title).toBeUndefined()
    })
  })
})
