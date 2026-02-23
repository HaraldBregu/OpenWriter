/**
 * Tests for personalityFilesSlice Redux slice.
 *
 * NOTE: This file was originally generated as brainFilesSlice.test.ts referencing
 * a module that no longer exists. It has been updated to test personalityFilesSlice,
 * which is the actual Redux slice for managing personality conversation files.
 *
 * Covers: initial state, savePersonalityFile thunk, loadPersonalityFiles thunk,
 *         deletePersonalityFile thunk, selectors, and edge cases.
 */
import { configureStore } from '@reduxjs/toolkit'
import personalityFilesReducer, {
  savePersonalityFile,
  loadPersonalityFiles,
  deletePersonalityFile,
  clearError,
  clearLastSaved,
  selectAllPersonalityFiles,
  selectPersonalityFilesBySection,
  selectPersonalityFilesLoading,
  selectPersonalityFilesError,
  selectLastSaved,
  selectTotalPersonalityFilesCount
} from '../../../../src/renderer/src/store/personalityFilesSlice'

// ---------------------------------------------------------------------------
// window.api mock helpers
// ---------------------------------------------------------------------------

const mockPersonalitySave = jest.fn()
const mockPersonalityLoadAll = jest.fn()
const mockPersonalityDelete = jest.fn()

beforeAll(() => {
  Object.defineProperty(global.window, 'api', {
    value: {
      ...(global.window.api ?? {}),
      personalitySave: mockPersonalitySave,
      personalityLoadAll: mockPersonalityLoadAll,
      personalityDelete: mockPersonalityDelete
    },
    writable: true,
    configurable: true
  })
})

// ---------------------------------------------------------------------------
// Helper data
// ---------------------------------------------------------------------------

const SECTION_ID = 'emotional-depth' as const

function makeFile(overrides?: Partial<{
  id: string
  sectionId: string
  path: string
  content: string
}>) {
  return {
    id: overrides?.id ?? '123',
    sectionId: overrides?.sectionId ?? SECTION_ID,
    path: overrides?.path ?? `/workspace/personality/${SECTION_ID}/123`,
    metadata: {
      title: 'Test Conversation',
      provider: 'openai',
      model: 'gpt-4',
      createdAt: new Date().toISOString()
    },
    content: overrides?.content ?? 'File content',
    savedAt: Date.now()
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('personalityFilesSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    jest.clearAllMocks()
    store = configureStore({
      reducer: {
        personalityFiles: personalityFilesReducer
      }
    })
  })

  // ---- Initial state -------------------------------------------------------

  describe('initial state', () => {
    it('should have empty arrays for all personality sections', () => {
      const state = (store.getState() as { personalityFiles: { files: Record<string, unknown[]>; loading: boolean; error: null; lastSaved: null } }).personalityFiles
      expect(state.files['emotional-depth']).toEqual([])
      expect(state.files.consciousness).toEqual([])
      expect(state.files.motivation).toEqual([])
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.lastSaved).toBeNull()
    })
  })

  // ---- savePersonalityFile -------------------------------------------------

  describe('savePersonalityFile', () => {
    it('should record lastSaved on successful save', async () => {
      mockPersonalitySave.mockResolvedValue({ id: '123', path: '/workspace/test', savedAt: Date.now() })

      await (store.dispatch as Function)(
        savePersonalityFile({ sectionId: SECTION_ID, content: 'Hello', metadata: { title: 'Test', provider: 'openai', model: 'gpt-4' } })
      )

      const state = (store.getState() as { personalityFiles: { lastSaved: { fileId: string; timestamp: number } | null; error: null; loading: boolean } }).personalityFiles
      expect(state.lastSaved).toEqual({ fileId: '123', timestamp: expect.any(Number) })
      expect(state.error).toBeNull()
    })

    it('should set error message on save failure', async () => {
      mockPersonalitySave.mockRejectedValue(new Error('Save failed'))

      await (store.dispatch as Function)(
        savePersonalityFile({ sectionId: SECTION_ID, content: 'Test', metadata: { title: 'T', provider: 'x', model: 'y' } })
      )

      const state = (store.getState() as { personalityFiles: { error: string | null; lastSaved: null } }).personalityFiles
      expect(state.error).toBe('Save failed')
      expect(state.lastSaved).toBeNull()
    })

    it('should set loading=true while save is in-flight and loading=false on completion', async () => {
      let resolvePromise!: Function
      mockPersonalitySave.mockReturnValue(new Promise((res) => { resolvePromise = res }))

      const promise = (store.dispatch as Function)(
        savePersonalityFile({ sectionId: SECTION_ID, content: 'Test', metadata: { title: 'T', provider: 'x', model: 'y' } })
      )

      expect((store.getState() as { personalityFiles: { loading: boolean } }).personalityFiles.loading).toBe(true)

      resolvePromise({ id: '1', path: '/p', savedAt: 1 })
      await promise

      expect((store.getState() as { personalityFiles: { loading: boolean } }).personalityFiles.loading).toBe(false)
    })
  })

  // ---- loadPersonalityFiles ------------------------------------------------

  describe('loadPersonalityFiles', () => {
    it('should populate section buckets from the loaded files', async () => {
      const file1 = makeFile({ id: '1', sectionId: 'emotional-depth' })
      const file2 = makeFile({ id: '2', sectionId: 'consciousness' })
      mockPersonalityLoadAll.mockResolvedValue([file1, file2])

      await (store.dispatch as Function)(loadPersonalityFiles())

      const state = (store.getState() as { personalityFiles: { files: Record<string, unknown[]>; loading: boolean; error: null } }).personalityFiles
      expect(state.files['emotional-depth']).toHaveLength(1)
      expect(state.files.consciousness).toHaveLength(1)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle an empty file list without errors', async () => {
      mockPersonalityLoadAll.mockResolvedValue([])

      await (store.dispatch as Function)(loadPersonalityFiles())

      const state = (store.getState() as { personalityFiles: { files: Record<string, unknown[]>; loading: boolean; error: null } }).personalityFiles
      expect(state.files['emotional-depth']).toEqual([])
      expect(state.error).toBeNull()
    })

    it('should set error message on load failure', async () => {
      mockPersonalityLoadAll.mockRejectedValue(new Error('Load failed'))

      await (store.dispatch as Function)(loadPersonalityFiles())

      const state = (store.getState() as { personalityFiles: { error: string | null; loading: boolean } }).personalityFiles
      expect(state.error).toBe('Load failed')
      expect(state.loading).toBe(false)
    })

    it('should sort files within each section by savedAt descending', async () => {
      const older = makeFile({ id: 'older' })
      older.savedAt = 1_000_000
      const newer = makeFile({ id: 'newer' })
      newer.savedAt = 2_000_000

      mockPersonalityLoadAll.mockResolvedValue([older, newer])
      await (store.dispatch as Function)(loadPersonalityFiles())

      const files = (store.getState() as { personalityFiles: { files: Record<string, Array<{ id: string }>> } }).personalityFiles.files['emotional-depth']
      expect(files[0].id).toBe('newer')
      expect(files[1].id).toBe('older')
    })
  })

  // ---- deletePersonalityFile -----------------------------------------------

  describe('deletePersonalityFile', () => {
    it('should remove the file from its section bucket on successful delete', async () => {
      // Pre-load a file
      mockPersonalityLoadAll.mockResolvedValue([makeFile()])
      await (store.dispatch as Function)(loadPersonalityFiles())

      expect((store.getState() as { personalityFiles: { files: Record<string, unknown[]> } }).personalityFiles.files['emotional-depth']).toHaveLength(1)

      mockPersonalityDelete.mockResolvedValue(undefined)
      await (store.dispatch as Function)(deletePersonalityFile({ id: '123', sectionId: SECTION_ID }))

      expect((store.getState() as { personalityFiles: { files: Record<string, unknown[]> } }).personalityFiles.files['emotional-depth']).toHaveLength(0)
    })

    it('should set error on delete failure', async () => {
      mockPersonalityDelete.mockRejectedValue(new Error('Delete failed'))

      await (store.dispatch as Function)(
        deletePersonalityFile({ id: '999', sectionId: SECTION_ID })
      )

      expect((store.getState() as { personalityFiles: { error: string | null } }).personalityFiles.error).toBe('Delete failed')
    })
  })

  // ---- Reducers -----------------------------------------------------------

  describe('reducers', () => {
    it('clearError should reset the error field', async () => {
      mockPersonalityLoadAll.mockRejectedValue(new Error('boom'))
      await (store.dispatch as Function)(loadPersonalityFiles())
      expect((store.getState() as { personalityFiles: { error: string | null } }).personalityFiles.error).not.toBeNull()

      store.dispatch(clearError())

      expect((store.getState() as { personalityFiles: { error: string | null } }).personalityFiles.error).toBeNull()
    })

    it('clearLastSaved should reset lastSaved', async () => {
      mockPersonalitySave.mockResolvedValue({ id: 'x', path: '/p', savedAt: 1 })
      await (store.dispatch as Function)(savePersonalityFile({ sectionId: SECTION_ID, content: 'c', metadata: { title: 't', provider: 'x', model: 'y' } }))
      expect((store.getState() as { personalityFiles: { lastSaved: unknown } }).personalityFiles.lastSaved).not.toBeNull()

      store.dispatch(clearLastSaved())

      expect((store.getState() as { personalityFiles: { lastSaved: unknown } }).personalityFiles.lastSaved).toBeNull()
    })
  })

  // ---- Selectors ----------------------------------------------------------

  describe('selectors', () => {
    it('selectAllPersonalityFiles should return the files map', () => {
      const state = store.getState()
      const files = selectAllPersonalityFiles(state as Parameters<typeof selectAllPersonalityFiles>[0])
      expect(files).toBeDefined()
      expect(files['emotional-depth']).toEqual([])
    })

    it('selectPersonalityFilesBySection should return only the files for that section', async () => {
      mockPersonalityLoadAll.mockResolvedValue([
        makeFile({ id: 'a', sectionId: 'emotional-depth' }),
        makeFile({ id: 'b', sectionId: 'consciousness' })
      ])
      await (store.dispatch as Function)(loadPersonalityFiles())

      const state = store.getState()
      const selector = selectPersonalityFilesBySection('emotional-depth')
      const result = selector(state as Parameters<typeof selector>[0])
      expect(result).toHaveLength(1)
      expect((result[0] as { id: string }).id).toBe('a')
    })

    it('selectPersonalityFilesLoading should return loading state', () => {
      const state = store.getState()
      expect(selectPersonalityFilesLoading(state as Parameters<typeof selectPersonalityFilesLoading>[0])).toBe(false)
    })

    it('selectPersonalityFilesError should return null initially', () => {
      const state = store.getState()
      expect(selectPersonalityFilesError(state as Parameters<typeof selectPersonalityFilesError>[0])).toBeNull()
    })

    it('selectLastSaved should return null initially', () => {
      const state = store.getState()
      expect(selectLastSaved(state as Parameters<typeof selectLastSaved>[0])).toBeNull()
    })

    it('selectTotalPersonalityFilesCount should return 0 initially', () => {
      const state = store.getState()
      expect(selectTotalPersonalityFilesCount(state as Parameters<typeof selectTotalPersonalityFilesCount>[0])).toBe(0)
    })

    it('selectTotalPersonalityFilesCount should reflect loaded files', async () => {
      mockPersonalityLoadAll.mockResolvedValue([
        makeFile({ id: 'x1', sectionId: 'emotional-depth' }),
        makeFile({ id: 'x2', sectionId: 'emotional-depth' }),
        makeFile({ id: 'x3', sectionId: 'consciousness' })
      ])
      await (store.dispatch as Function)(loadPersonalityFiles())

      const state = store.getState()
      expect(selectTotalPersonalityFilesCount(state as Parameters<typeof selectTotalPersonalityFilesCount>[0])).toBe(3)
    })
  })
})
