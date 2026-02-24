/**
 * Tests for writingsSlice - the Redux store for Writing documents.
 *
 * Tests cover:
 *   - All reducers: createWriting, addWriting, setWritingOutputId, updateWritingBlocks,
 *     updateWritingTitle, deleteWriting, loadWritings
 *   - Extra reducer: output/loadAll/fulfilled matcher (hydration from disk)
 *     - Removes writings whose outputId is no longer on disk
 *     - Updates writings when disk content/title changed
 *     - Adds new writings found on disk but not in Redux
 *     - Skips writings with no outputId (in-progress / unsaved)
 *   - Selectors: selectWritings, selectWritingById, selectWritingCount
 *   - Edge cases: missing IDs, empty content, duplicate prevention
 */

import writingsReducer, {
  createWriting,
  addWriting,
  setWritingOutputId,
  updateWritingBlocks,
  updateWritingTitle,
  deleteWriting,
  loadWritings,
  selectWritings,
  selectWritingById,
  selectWritingCount,
  type Writing
} from '../../../../src/renderer/src/store/writingsSlice'
import type { OutputItem } from '../../../../src/renderer/src/store/outputSlice'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialState() {
  return {
    writings: [] as Writing[]
  }
}

function makeBlock(id: string, content: string) {
  return { id, content }
}

function makeWriting(overrides: Partial<Writing> = {}): Writing {
  return {
    id: 'writing-1',
    title: 'My Writing',
    blocks: [makeBlock('block-1', 'First paragraph')],
    category: 'writing',
    tags: [],
    visibility: 'private',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides
  }
}

/** Build an OutputItem of type 'writings' to simulate disk data. */
function makeOutputItem(overrides: Partial<OutputItem> = {}): OutputItem {
  return {
    id: 'output-1',
    type: 'writings',
    path: '/workspace/output/writings/output-1',
    title: 'Disk Title',
    content: 'Paragraph one\n\nParagraph two',
    category: 'writing',
    tags: ['disk-tag'],
    visibility: 'public',
    provider: 'manual',
    model: '',
    temperature: 0.7,
    maxTokens: null,
    reasoning: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
    savedAt: 2000,
    ...overrides
  }
}

/** Build a root-shaped state object for selectors. */
function makeRootState(slice = createInitialState()) {
  return { writings: slice }
}

/**
 * Simulate the `output/loadAll/fulfilled` action that writingsSlice listens to.
 * The payload must be OutputItem[] (all types); the reducer filters by type='writings'.
 */
function outputLoadAllFulfilled(payload: OutputItem[]) {
  return { type: 'output/loadAll/fulfilled', payload }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('writingsSlice', () => {
  describe('reducers', () => {
    describe('createWriting', () => {
      it('should prepend a new writing with a generated ID', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = writingsReducer(state, createWriting())

        // Assert
        expect(result.writings).toHaveLength(1)
        expect(result.writings[0].id).toBeTruthy()
        expect(result.writings[0].title).toBe('')
      })

      it('should initialise the new writing with one empty block', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = writingsReducer(state, createWriting())

        // Assert
        expect(result.writings[0].blocks).toHaveLength(1)
        expect(result.writings[0].blocks[0].content).toBe('')
      })

      it('should set default metadata fields', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = writingsReducer(state, createWriting())

        // Assert
        const writing = result.writings[0]
        expect(writing.category).toBe('writing')
        expect(writing.tags).toEqual([])
        expect(writing.visibility).toBe('private')
        expect(writing.createdAt).toBeGreaterThan(0)
        expect(writing.updatedAt).toBeGreaterThan(0)
      })

      it('should prepend (most-recent first) when writings already exist', () => {
        // Arrange
        let state = createInitialState()
        state = writingsReducer(state, createWriting())
        const firstId = state.writings[0].id

        // Act
        state = writingsReducer(state, createWriting())

        // Assert
        expect(state.writings).toHaveLength(2)
        expect(state.writings[0].id).not.toBe(firstId) // newest at index 0
        expect(state.writings[1].id).toBe(firstId)
      })

      it('should generate unique IDs for each call', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result1 = writingsReducer(state, createWriting())
        const result2 = writingsReducer(result1, createWriting())

        // Assert
        expect(result2.writings[0].id).not.toBe(result2.writings[1].id)
      })
    })

    describe('addWriting', () => {
      it('should prepend the given writing to the list', () => {
        // Arrange
        const existing = makeWriting({ id: 'old' })
        const state = { writings: [existing] }
        const incoming = makeWriting({ id: 'new', title: 'Incoming' })

        // Act
        const result = writingsReducer(state, addWriting(incoming))

        // Assert
        expect(result.writings).toHaveLength(2)
        expect(result.writings[0].id).toBe('new')
        expect(result.writings[1].id).toBe('old')
      })

      it('should add to an empty list', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = writingsReducer(state, addWriting(makeWriting({ id: 'solo' })))

        // Assert
        expect(result.writings).toHaveLength(1)
        expect(result.writings[0].id).toBe('solo')
      })
    })

    describe('setWritingOutputId', () => {
      it('should set outputId on the matching writing', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', outputId: undefined })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          setWritingOutputId({ writingId: 'writing-1', outputId: 'output-abc' })
        )

        // Assert
        expect(result.writings[0].outputId).toBe('output-abc')
      })

      it('should not modify other writings', () => {
        // Arrange
        const writingA = makeWriting({ id: 'writing-a' })
        const writingB = makeWriting({ id: 'writing-b', outputId: undefined })
        const state = { writings: [writingA, writingB] }

        // Act
        const result = writingsReducer(
          state,
          setWritingOutputId({ writingId: 'writing-b', outputId: 'output-xyz' })
        )

        // Assert
        expect(result.writings[0].outputId).toBeUndefined()
        expect(result.writings[1].outputId).toBe('output-xyz')
      })

      it('should not throw when writingId does not exist', () => {
        // Arrange
        const state = createInitialState()

        // Act + Assert — should not throw
        expect(() =>
          writingsReducer(state, setWritingOutputId({ writingId: 'nonexistent', outputId: 'x' }))
        ).not.toThrow()
      })
    })

    describe('updateWritingBlocks', () => {
      it('should replace the blocks on the matching writing', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', blocks: [makeBlock('old', 'Old content')] })
        const state = { writings: [writing] }
        const newBlocks = [makeBlock('b1', 'New A'), makeBlock('b2', 'New B')]

        // Act
        const result = writingsReducer(
          state,
          updateWritingBlocks({ writingId: 'writing-1', blocks: newBlocks })
        )

        // Assert
        expect(result.writings[0].blocks).toHaveLength(2)
        expect(result.writings[0].blocks[0].content).toBe('New A')
        expect(result.writings[0].blocks[1].content).toBe('New B')
      })

      it('should update updatedAt after changing blocks', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', updatedAt: 1 })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingBlocks({ writingId: 'writing-1', blocks: [makeBlock('b1', 'New')] })
        )

        // Assert
        expect(result.writings[0].updatedAt).toBeGreaterThan(1)
      })

      it('should not modify state when writingId does not exist', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', blocks: [makeBlock('b1', 'Original')] })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingBlocks({ writingId: 'nonexistent', blocks: [makeBlock('b2', 'New')] })
        )

        // Assert
        expect(result.writings[0].blocks[0].content).toBe('Original')
      })
    })

    describe('updateWritingTitle', () => {
      it('should update the title on the matching writing', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', title: 'Old Title' })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingTitle({ writingId: 'writing-1', title: 'New Title' })
        )

        // Assert
        expect(result.writings[0].title).toBe('New Title')
      })

      it('should update updatedAt after changing title', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', updatedAt: 1 })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingTitle({ writingId: 'writing-1', title: 'New Title' })
        )

        // Assert
        expect(result.writings[0].updatedAt).toBeGreaterThan(1)
      })

      it('should allow setting an empty title', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', title: 'Has Title' })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingTitle({ writingId: 'writing-1', title: '' })
        )

        // Assert
        expect(result.writings[0].title).toBe('')
      })

      it('should not modify state when writingId does not exist', () => {
        // Arrange
        const writing = makeWriting({ id: 'writing-1', title: 'Original' })
        const state = { writings: [writing] }

        // Act
        const result = writingsReducer(
          state,
          updateWritingTitle({ writingId: 'nonexistent', title: 'Changed' })
        )

        // Assert
        expect(result.writings[0].title).toBe('Original')
      })
    })

    describe('deleteWriting', () => {
      it('should remove the writing with the given ID', () => {
        // Arrange
        const writingA = makeWriting({ id: 'a' })
        const writingB = makeWriting({ id: 'b' })
        const state = { writings: [writingA, writingB] }

        // Act
        const result = writingsReducer(state, deleteWriting('a'))

        // Assert
        expect(result.writings).toHaveLength(1)
        expect(result.writings[0].id).toBe('b')
      })

      it('should produce an empty list when the only writing is deleted', () => {
        // Arrange
        const state = { writings: [makeWriting({ id: 'only' })] }

        // Act
        const result = writingsReducer(state, deleteWriting('only'))

        // Assert
        expect(result.writings).toHaveLength(0)
      })

      it('should not modify state when ID does not exist', () => {
        // Arrange
        const state = { writings: [makeWriting({ id: 'writing-1' })] }

        // Act
        const result = writingsReducer(state, deleteWriting('nonexistent'))

        // Assert
        expect(result.writings).toHaveLength(1)
      })
    })

    describe('loadWritings', () => {
      it('should replace the entire writings list', () => {
        // Arrange
        const state = { writings: [makeWriting({ id: 'old' })] }
        const incoming = [makeWriting({ id: 'a' }), makeWriting({ id: 'b' })]

        // Act
        const result = writingsReducer(state, loadWritings(incoming))

        // Assert
        expect(result.writings).toHaveLength(2)
        expect(result.writings.map((w) => w.id)).toEqual(['a', 'b'])
      })

      it('should clear the list when payload is empty', () => {
        // Arrange
        const state = { writings: [makeWriting()] }

        // Act
        const result = writingsReducer(state, loadWritings([]))

        // Assert
        expect(result.writings).toHaveLength(0)
      })
    })
  })

  describe('extra reducers: output/loadAll/fulfilled hydration', () => {
    it('should add new writings from disk that do not yet exist in Redux', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({ id: 'output-1', title: 'From Disk' })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.writings).toHaveLength(1)
      expect(result.writings[0].title).toBe('From Disk')
      expect(result.writings[0].outputId).toBe('output-1')
    })

    it('should split multi-paragraph content into one block per paragraph', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({
        id: 'output-1',
        content: 'Paragraph one\n\nParagraph two\n\nParagraph three'
      })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.writings[0].blocks).toHaveLength(3)
      expect(result.writings[0].blocks[0].content).toBe('Paragraph one')
      expect(result.writings[0].blocks[1].content).toBe('Paragraph two')
      expect(result.writings[0].blocks[2].content).toBe('Paragraph three')
    })

    it('should create a single empty block when disk content is empty', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({ id: 'output-1', content: '' })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.writings[0].blocks).toHaveLength(1)
      expect(result.writings[0].blocks[0].content).toBe('')
    })

    it('should update an existing writing when disk title/content changed', () => {
      // Arrange
      const existingWriting = makeWriting({
        id: 'writing-1',
        title: 'Old Title',
        blocks: [makeBlock('b1', 'Old content')],
        outputId: 'output-1',
        category: 'old-cat',
        tags: ['old-tag'],
        visibility: 'private'
      })
      const state = { writings: [existingWriting] }
      const diskItem = makeOutputItem({
        id: 'output-1',
        title: 'New Title',
        content: 'New paragraph one\n\nNew paragraph two',
        category: 'new-cat',
        tags: ['new-tag'],
        visibility: 'public',
        updatedAt: '2024-06-01T00:00:00.000Z'
      })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      const writing = result.writings[0]
      expect(writing.id).toBe('writing-1') // Redux ID unchanged
      expect(writing.title).toBe('New Title')
      expect(writing.category).toBe('new-cat')
      expect(writing.tags).toEqual(['new-tag'])
      expect(writing.visibility).toBe('public')
      expect(writing.blocks).toHaveLength(2)
      expect(writing.blocks[0].content).toBe('New paragraph one')
      expect(writing.updatedAt).toBe(new Date('2024-06-01T00:00:00.000Z').getTime())
    })

    it('should NOT rebuild blocks when disk content is identical to current blocks', () => {
      // Arrange — blocks and disk content match exactly
      const existingWriting = makeWriting({
        id: 'writing-1',
        title: 'Same Title',
        blocks: [makeBlock('block-1', 'Paragraph one'), makeBlock('block-2', 'Paragraph two')],
        outputId: 'output-1'
      })
      const state = { writings: [existingWriting] }
      const originalBlockIds = existingWriting.blocks.map((b) => b.id)

      // Disk content joins with \n\n — exactly matches what blocks produce
      const diskItem = makeOutputItem({
        id: 'output-1',
        title: 'Same Title',
        content: 'Paragraph one\n\nParagraph two'
      })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert — blocks should be the same reference (not rebuilt)
      const resultBlockIds = result.writings[0].blocks.map((b) => b.id)
      expect(resultBlockIds).toEqual(originalBlockIds)
    })

    it('should remove writings whose outputId no longer exists on disk', () => {
      // Arrange — one writing with an outputId, but disk is empty
      const savedWriting = makeWriting({ id: 'writing-1', outputId: 'output-1' })
      const unsavedWriting = makeWriting({ id: 'writing-2', outputId: undefined })
      const state = { writings: [savedWriting, unsavedWriting] }

      // Act — disk returns no writings-type items
      const result = writingsReducer(state, outputLoadAllFulfilled([]))

      // Assert
      expect(result.writings).toHaveLength(1)
      expect(result.writings[0].id).toBe('writing-2') // unsaved writing is kept
    })

    it('should ignore output items of types other than writings', () => {
      // Arrange
      const state = createInitialState()
      const postItem = makeOutputItem({ id: 'post-1', type: 'posts' })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([postItem]))

      // Assert — posts should not be hydrated into writings
      expect(result.writings).toHaveLength(0)
    })

    it('should not add a writing twice if it already has a matching outputId', () => {
      // Arrange
      const existing = makeWriting({ id: 'writing-1', outputId: 'output-1' })
      const state = { writings: [existing] }
      const diskItem = makeOutputItem({ id: 'output-1' })

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.writings).toHaveLength(1)
    })

    it('should handle multiple new disk writings at once', () => {
      // Arrange
      const state = createInitialState()
      const diskItems = [
        makeOutputItem({ id: 'output-1', title: 'First' }),
        makeOutputItem({ id: 'output-2', title: 'Second' }),
        makeOutputItem({ id: 'output-3', title: 'Third' })
      ]

      // Act
      const result = writingsReducer(state, outputLoadAllFulfilled(diskItems))

      // Assert
      expect(result.writings).toHaveLength(3)
    })
  })

  describe('selectors', () => {
    it('selectWritings should return the writings array', () => {
      const state = makeRootState()
      expect(selectWritings(state)).toEqual([])
    })

    it('selectWritings should return all writings when populated', () => {
      const state = makeRootState({
        writings: [makeWriting({ id: 'a' }), makeWriting({ id: 'b' })]
      })
      expect(selectWritings(state)).toHaveLength(2)
    })

    it('selectWritingById should return the matching writing', () => {
      const target = makeWriting({ id: 'target', title: 'Target Writing' })
      const other = makeWriting({ id: 'other', title: 'Other Writing' })
      const state = makeRootState({ writings: [target, other] })

      const selector = selectWritingById('target')
      expect(selector(state)).not.toBeNull()
      expect(selector(state)?.title).toBe('Target Writing')
    })

    it('selectWritingById should return null when ID does not exist', () => {
      const state = makeRootState({ writings: [makeWriting({ id: 'writing-1' })] })
      const selector = selectWritingById('nonexistent')
      expect(selector(state)).toBeNull()
    })

    it('selectWritingById should return null on empty state', () => {
      const state = makeRootState()
      const selector = selectWritingById('any-id')
      expect(selector(state)).toBeNull()
    })

    it('selectWritingCount should return 0 in initial state', () => {
      const state = makeRootState()
      expect(selectWritingCount(state)).toBe(0)
    })

    it('selectWritingCount should return the correct count', () => {
      const state = makeRootState({
        writings: [
          makeWriting({ id: 'a' }),
          makeWriting({ id: 'b' }),
          makeWriting({ id: 'c' })
        ]
      })
      expect(selectWritingCount(state)).toBe(3)
    })
  })
})
