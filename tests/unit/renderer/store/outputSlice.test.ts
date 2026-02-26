/**
 * Tests for outputSlice - the Redux store for AI-generated output items (writings).
 *
 * Tests cover:
 *   - Synchronous reducers: setItems, addItem, updateItem, removeItem, setLoading,
 *     setError, clearError
 *   - Async thunk extra-reducers: loadOutputItems, saveOutputItem, updateOutputItem,
 *     deleteOutputItem (pending / fulfilled / rejected)
 *   - Selectors: selectAllOutputItems, selectOutputItemsByType, selectOutputItemById,
 *     selectOutputItemsCount, selectOutputItemsCountByType, selectOutputLoading,
 *     selectOutputError
 *   - Edge cases: missing IDs, duplicate handling, sort order
 */

import outputReducer, {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  clearError,
  loadOutputItems,
  saveOutputItem,
  updateOutputItem,
  deleteOutputItem,
  selectAllOutputItems,
  selectOutputItemsByType,
  selectOutputItemById,
  selectOutputItemsCount,
  selectOutputItemsCountByType,
  selectOutputLoading,
  selectOutputError,
  type OutputItem,
  type OutputType
} from '../../../../src/renderer/src/store/outputSlice'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialState() {
  return {
    items: [] as OutputItem[],
    loading: false,
    error: null as string | null
  }
}

function makeOutputItem(overrides: Partial<OutputItem> = {}): OutputItem {
  return {
    id: 'item-1',
    type: 'writings' as OutputType,
    path: '/workspace/output/writings/item-1',
    title: 'Test Writing',
    blocks: [
      { name: 'block-uuid-1', content: 'Hello world', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
    ],
    category: 'general',
    tags: ['tag-a'],
    visibility: 'private',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: null,
    reasoning: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    savedAt: 1000,
    ...overrides
  }
}

/**
 * Build a minimal RootState-shaped object that satisfies the selectors.
 * Only the `output` slice is relevant for outputSlice selectors.
 */
function makeRootState(slice = createInitialState()) {
  return {
    output: slice
  } as unknown as Parameters<typeof selectAllOutputItems>[0]
}

// ---------------------------------------------------------------------------
// Async thunk action creators (for constructing pending/fulfilled/rejected actions)
// ---------------------------------------------------------------------------

function pending(thunk: { pending: { type: string } }) {
  return { type: thunk.pending.type }
}

function fulfilled<T>(thunk: { fulfilled: { type: string } }, payload: T) {
  return { type: thunk.fulfilled.type, payload }
}

function rejected(thunk: { rejected: { type: string } }, payload: string) {
  return { type: thunk.rejected.type, payload, error: { message: payload } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('outputSlice', () => {
  describe('reducers', () => {
    describe('setItems', () => {
      it('should replace the entire items array', () => {
        // Arrange
        const existing = makeOutputItem({ id: 'old' })
        const state = { ...createInitialState(), items: [existing] }
        const incoming = [
          makeOutputItem({ id: 'a' }),
          makeOutputItem({ id: 'b' })
        ]

        // Act
        const result = outputReducer(state, setItems(incoming))

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.items.map((i) => i.id)).toEqual(['a', 'b'])
      })

      it('should clear the list when payload is empty', () => {
        // Arrange
        const state = { ...createInitialState(), items: [makeOutputItem()] }

        // Act
        const result = outputReducer(state, setItems([]))

        // Assert
        expect(result.items).toHaveLength(0)
      })
    })

    describe('addItem', () => {
      it('should prepend the new item to the list', () => {
        // Arrange
        const existing = makeOutputItem({ id: 'old', savedAt: 1000 })
        const state = { ...createInitialState(), items: [existing] }
        const newItem = makeOutputItem({ id: 'new', savedAt: 2000 })

        // Act
        const result = outputReducer(state, addItem(newItem))

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.items[0].id).toBe('new')
        expect(result.items[1].id).toBe('old')
      })

      it('should add to an empty list', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, addItem(makeOutputItem({ id: 'first' })))

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0].id).toBe('first')
      })
    })

    describe('updateItem', () => {
      it('should merge changes into the matching item', () => {
        // Arrange
        const item = makeOutputItem({ id: 'item-1', type: 'writings', title: 'Old Title' })
        const state = { ...createInitialState(), items: [item] }

        // Act
        const result = outputReducer(
          state,
          updateItem({ id: 'item-1', type: 'writings', changes: { title: 'New Title' } })
        )

        // Assert
        expect(result.items[0].title).toBe('New Title')
        expect(result.items[0].blocks).toEqual(item.blocks) // unchanged fields preserved
      })

      it('should update updatedAt when merging changes', () => {
        // Arrange
        const item = makeOutputItem({ id: 'item-1', type: 'writings', updatedAt: '2024-01-01T00:00:00.000Z' })
        const state = { ...createInitialState(), items: [item] }

        // Act
        const result = outputReducer(
          state,
          updateItem({ id: 'item-1', type: 'writings', changes: { title: 'Updated' } })
        )

        // Assert
        expect(result.items[0].updatedAt).not.toBe('2024-01-01T00:00:00.000Z')
      })

      it('should not modify state when ID does not match', () => {
        // Arrange
        const item = makeOutputItem({ id: 'item-1', type: 'writings', title: 'Original' })
        const state = { ...createInitialState(), items: [item] }

        // Act
        const result = outputReducer(
          state,
          updateItem({ id: 'nonexistent', type: 'writings', changes: { title: 'Changed' } })
        )

        // Assert
        expect(result.items[0].title).toBe('Original')
      })

      it('should not modify state when type does not match even if ID matches', () => {
        // Arrange — item is 'writings', action targets a non-existent type (cast to bypass TS)
        const item = makeOutputItem({ id: 'item-1', type: 'writings', title: 'Original' })
        const state = { ...createInitialState(), items: [item] }

        // Act — use a mismatched type that will never equal 'writings'
        const result = outputReducer(
          state,
          updateItem({ id: 'item-1', type: 'posts' as OutputType, changes: { title: 'Changed' } })
        )

        // Assert — no item found; title unchanged
        expect(result.items[0].title).toBe('Original')
      })
    })

    describe('removeItem', () => {
      it('should remove the item matching id and type', () => {
        // Arrange
        const itemA = makeOutputItem({ id: 'a', type: 'writings' })
        const itemB = makeOutputItem({ id: 'b', type: 'writings' })
        const state = { ...createInitialState(), items: [itemA, itemB] }

        // Act
        const result = outputReducer(state, removeItem({ id: 'a', type: 'writings' }))

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0].id).toBe('b')
      })

      it('should not remove items when type does not match even if ID matches', () => {
        // Arrange — item is 'writings', action targets a mismatched type (cast to bypass TS)
        const item = makeOutputItem({ id: 'item-1', type: 'writings' })
        const state = { ...createInitialState(), items: [item] }

        // Act — use a mismatched type that will never equal 'writings'
        const result = outputReducer(state, removeItem({ id: 'item-1', type: 'posts' as OutputType }))

        // Assert — item remains because types don't match
        expect(result.items).toHaveLength(1)
      })

      it('should leave state unchanged when ID does not exist', () => {
        // Arrange
        const state = { ...createInitialState(), items: [makeOutputItem({ id: 'item-1' })] }

        // Act
        const result = outputReducer(state, removeItem({ id: 'nonexistent', type: 'writings' }))

        // Assert
        expect(result.items).toHaveLength(1)
      })
    })

    describe('setLoading', () => {
      it('should set loading to true', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, setLoading(true))

        // Assert
        expect(result.loading).toBe(true)
      })

      it('should set loading to false', () => {
        // Arrange
        const state = { ...createInitialState(), loading: true }

        // Act
        const result = outputReducer(state, setLoading(false))

        // Assert
        expect(result.loading).toBe(false)
      })
    })

    describe('setError', () => {
      it('should set the error message', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, setError('Load failed'))

        // Assert
        expect(result.error).toBe('Load failed')
      })

      it('should clear the error when set to null', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'Some error' }

        // Act
        const result = outputReducer(state, setError(null))

        // Assert
        expect(result.error).toBeNull()
      })
    })

    describe('clearError', () => {
      it('should set error to null', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'Something broke' }

        // Act
        const result = outputReducer(state, clearError())

        // Assert
        expect(result.error).toBeNull()
      })

      it('should be idempotent when error is already null', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, clearError())

        // Assert
        expect(result.error).toBeNull()
      })
    })
  })

  describe('extra reducers (async thunks)', () => {
    describe('loadOutputItems', () => {
      it('pending: should set loading=true and clear error', () => {
        // Arrange
        const state = { ...createInitialState(), loading: false, error: 'old' }

        // Act
        const result = outputReducer(state, pending(loadOutputItems))

        // Assert
        expect(result.loading).toBe(true)
        expect(result.error).toBeNull()
      })

      it('fulfilled: should set loading=false and replace items sorted by savedAt descending', () => {
        // Arrange
        const state = { ...createInitialState(), loading: true }
        const items = [
          makeOutputItem({ id: 'old', savedAt: 500 }),
          makeOutputItem({ id: 'new', savedAt: 1500 }),
          makeOutputItem({ id: 'mid', savedAt: 1000 })
        ]

        // Act
        const result = outputReducer(state, fulfilled(loadOutputItems, items))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.items).toHaveLength(3)
        expect(result.items[0].id).toBe('new')  // savedAt 1500 — most recent
        expect(result.items[1].id).toBe('mid')  // savedAt 1000
        expect(result.items[2].id).toBe('old')  // savedAt 500
      })

      it('rejected: should set loading=false and store the error message', () => {
        // Arrange
        const state = { ...createInitialState(), loading: true }

        // Act
        const result = outputReducer(state, rejected(loadOutputItems, 'Network error'))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.error).toBe('Network error')
      })

      it('rejected: should use fallback error when payload is undefined', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, {
          type: loadOutputItems.rejected.type,
          payload: undefined,
          error: {}
        })

        // Assert
        expect(result.error).toBe('Unknown error loading output items')
      })
    })

    describe('saveOutputItem', () => {
      it('pending: should set loading=true and clear error', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'previous' }

        // Act
        const result = outputReducer(state, pending(saveOutputItem))

        // Assert
        expect(result.loading).toBe(true)
        expect(result.error).toBeNull()
      })

      it('fulfilled: should prepend the saved item and set loading=false', () => {
        // Arrange
        const existing = makeOutputItem({ id: 'existing', savedAt: 1000 })
        const state = { ...createInitialState(), loading: true, items: [existing] }
        const saved = makeOutputItem({ id: 'newly-saved', savedAt: 2000 })

        // Act
        const result = outputReducer(state, fulfilled(saveOutputItem, saved))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.items).toHaveLength(2)
        expect(result.items[0].id).toBe('newly-saved')
        expect(result.items[1].id).toBe('existing')
      })

      it('rejected: should set loading=false and store the error', () => {
        // Arrange
        const state = { ...createInitialState(), loading: true }

        // Act
        const result = outputReducer(state, rejected(saveOutputItem, 'Save failed'))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.error).toBe('Save failed')
      })

      it('rejected: should use fallback error when payload is undefined', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, {
          type: saveOutputItem.rejected.type,
          payload: undefined,
          error: {}
        })

        // Assert
        expect(result.error).toBe('Unknown error saving output item')
      })
    })

    describe('updateOutputItem', () => {
      it('fulfilled: should update the matching item in place by id + type', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', title: 'Old Title', category: 'cat-a' })
        const state = { ...createInitialState(), items: [original] }
        const updatedBlocks = [
          { name: 'block-uuid-1', content: 'Updated content', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-06-01T00:00:00.000Z' }
        ]
        const updated = makeOutputItem({
          id: 'item-1',
          type: 'writings',
          title: 'New Title',
          category: 'cat-b',
          blocks: updatedBlocks,
          visibility: 'public',
          tags: ['new-tag'],
          updatedAt: '2024-06-01T00:00:00.000Z'
        })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].title).toBe('New Title')
        expect(result.items[0].category).toBe('cat-b')
        expect(result.items[0].blocks).toEqual(updatedBlocks)
        expect(result.items[0].visibility).toBe('public')
        expect(result.items[0].tags).toEqual(['new-tag'])
        expect(result.items[0].updatedAt).toBe('2024-06-01T00:00:00.000Z')
      })

      it('fulfilled: should persist provider when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', provider: 'openai' })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', provider: 'anthropic' })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].provider).toBe('anthropic')
      })

      it('fulfilled: should persist model when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', model: 'gpt-4o' })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', model: 'claude-opus-4-6' })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].model).toBe('claude-opus-4-6')
      })

      it('fulfilled: should persist temperature when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', temperature: 0.7 })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', temperature: 1.2 })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].temperature).toBe(1.2)
      })

      it('fulfilled: should persist maxTokens when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', maxTokens: null })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', maxTokens: 4096 })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].maxTokens).toBe(4096)
      })

      it('fulfilled: should persist null maxTokens (unlimited) when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', maxTokens: 2048 })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', maxTokens: null })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].maxTokens).toBeNull()
      })

      it('fulfilled: should persist reasoning when updating an item', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', reasoning: false })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-1', type: 'writings', reasoning: true })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].reasoning).toBe(true)
      })

      it('fulfilled: should persist all inference fields together in one update', () => {
        // Arrange — item with one set of inference settings
        const original = makeOutputItem({
          id: 'item-1',
          type: 'writings',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: null,
          reasoning: false
        })
        const state = { ...createInitialState(), items: [original] }

        // Update with a completely different set of inference settings
        const updated = makeOutputItem({
          id: 'item-1',
          type: 'writings',
          provider: 'anthropic',
          model: 'claude-opus-4-6',
          temperature: 1.8,
          maxTokens: 4000,
          reasoning: true,
          title: 'Also Updated Title'
        })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert — all five inference fields updated
        const item = result.items[0]
        expect(item.provider).toBe('anthropic')
        expect(item.model).toBe('claude-opus-4-6')
        expect(item.temperature).toBe(1.8)
        expect(item.maxTokens).toBe(4000)
        expect(item.reasoning).toBe(true)
        // Confirm non-inference fields are also updated
        expect(item.title).toBe('Also Updated Title')
      })

      it('fulfilled: should not overwrite savedAt or path (fields not in update payload)', () => {
        // Arrange — item has a known path and savedAt
        const original = makeOutputItem({
          id: 'item-1',
          type: 'writings',
          path: '/workspace/output/writings/item-1',
          savedAt: 12345
        })
        const state = { ...createInitialState(), items: [original] }

        // The update thunk returns an item with path='' and a new savedAt
        const updated = makeOutputItem({
          id: 'item-1',
          type: 'writings',
          path: '',         // update thunk always returns empty path
          savedAt: 99999
        })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert — the reducer applies the payload as-is (path and savedAt are NOT
        // fields in the spread, so they keep their original values from the item)
        // path is NOT in the reducer's spread list, so original is preserved
        expect(result.items[0].path).toBe('/workspace/output/writings/item-1')
      })

      it('fulfilled: should not change state when id + type does not match', () => {
        // Arrange
        const original = makeOutputItem({ id: 'item-1', type: 'writings', title: 'Original' })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-99', type: 'writings', title: 'Changed' })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert
        expect(result.items[0].title).toBe('Original')
      })

      it('fulfilled: should not update an item when payload id does not match any item', () => {
        // Arrange — item has id 'item-1', payload targets 'item-999'
        const original = makeOutputItem({ id: 'item-1', type: 'writings', provider: 'openai' })
        const state = { ...createInitialState(), items: [original] }
        const updated = makeOutputItem({ id: 'item-999', type: 'writings', provider: 'anthropic' })

        // Act
        const result = outputReducer(state, fulfilled(updateOutputItem, updated))

        // Assert — no match on id, provider unchanged
        expect(result.items[0].provider).toBe('openai')
      })
    })

    describe('deleteOutputItem', () => {
      it('pending: should set loading=true and clear error', () => {
        // Arrange
        const state = { ...createInitialState(), error: 'prior error' }

        // Act
        const result = outputReducer(state, pending(deleteOutputItem))

        // Assert
        expect(result.loading).toBe(true)
        expect(result.error).toBeNull()
      })

      it('fulfilled: should remove the item matching id + type and set loading=false', () => {
        // Arrange
        const itemA = makeOutputItem({ id: 'a', type: 'writings' })
        const itemB = makeOutputItem({ id: 'b', type: 'writings' })
        const state = { ...createInitialState(), loading: true, items: [itemA, itemB] }

        // Act
        const result = outputReducer(state, fulfilled(deleteOutputItem, { id: 'a', type: 'writings' }))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.items).toHaveLength(1)
        expect(result.items[0].id).toBe('b')
      })

      it('fulfilled: should not remove items when type does not match', () => {
        // Arrange
        const item = makeOutputItem({ id: 'item-1', type: 'writings' })
        const state = { ...createInitialState(), items: [item] }

        // Act
        const result = outputReducer(
          state,
          fulfilled(deleteOutputItem, { id: 'item-1', type: 'writings' })
        )

        // Assert
        expect(result.items).toHaveLength(1)
      })

      it('rejected: should set loading=false and store the error', () => {
        // Arrange
        const state = { ...createInitialState(), loading: true }

        // Act
        const result = outputReducer(state, rejected(deleteOutputItem, 'Delete failed'))

        // Assert
        expect(result.loading).toBe(false)
        expect(result.error).toBe('Delete failed')
      })

      it('rejected: should use fallback error when payload is undefined', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = outputReducer(state, {
          type: deleteOutputItem.rejected.type,
          payload: undefined,
          error: {}
        })

        // Assert
        expect(result.error).toBe('Unknown error deleting output item')
      })
    })
  })

  describe('selectors', () => {
    it('selectAllOutputItems should return an empty array in initial state', () => {
      const state = makeRootState()
      expect(selectAllOutputItems(state)).toEqual([])
    })

    it('selectAllOutputItems should return all items', () => {
      const state = makeRootState({
        ...createInitialState(),
        items: [makeOutputItem({ id: 'a' }), makeOutputItem({ id: 'b' })]
      })
      expect(selectAllOutputItems(state)).toHaveLength(2)
    })

    it('selectOutputItemsByType should filter items by type', () => {
      const w1 = makeOutputItem({ id: 'w1', type: 'writings' })
      const w2 = makeOutputItem({ id: 'w2', type: 'writings' })
      const state = makeRootState({ ...createInitialState(), items: [w1, w2] })

      const selector = selectOutputItemsByType('writings')

      expect(selector(state)).toHaveLength(2)
      expect(selector(state).map((i) => i.id)).toEqual(['w1', 'w2'])
    })

    it('selectOutputItemsByType should return an empty array when no items exist', () => {
      const state = makeRootState(createInitialState())
      const selector = selectOutputItemsByType('writings')
      expect(selector(state)).toEqual([])
    })

    it('selectOutputItemById should return the matching item', () => {
      const target = makeOutputItem({ id: 'target', type: 'writings' })
      const other = makeOutputItem({ id: 'other', type: 'writings' })
      const state = makeRootState({ ...createInitialState(), items: [target, other] })

      const selector = selectOutputItemById('writings', 'target')
      expect(selector(state)).not.toBeNull()
      expect(selector(state)?.id).toBe('target')
    })

    it('selectOutputItemById should return null when ID does not exist', () => {
      const state = makeRootState({ ...createInitialState(), items: [makeOutputItem({ id: 'a' })] })
      const selector = selectOutputItemById('writings', 'nonexistent')
      expect(selector(state)).toBeNull()
    })

    it('selectOutputItemById should return null when type does not match', () => {
      const item = makeOutputItem({ id: 'item-1', type: 'writings' })
      const state = makeRootState({ ...createInitialState(), items: [item] })
      const selector = selectOutputItemById('writings', 'item-1')
      expect(selector(state)).toBeNull()
    })

    it('selectOutputItemsCount should return 0 in initial state', () => {
      const state = makeRootState()
      expect(selectOutputItemsCount(state)).toBe(0)
    })

    it('selectOutputItemsCount should return the total number of items', () => {
      const state = makeRootState({
        ...createInitialState(),
        items: [
          makeOutputItem({ id: 'a' }),
          makeOutputItem({ id: 'b' }),
          makeOutputItem({ id: 'c' })
        ]
      })
      expect(selectOutputItemsCount(state)).toBe(3)
    })

    it('selectOutputItemsCountByType should return zeroes when empty', () => {
      const state = makeRootState()
      expect(selectOutputItemsCountByType(state)).toEqual({ writings: 0 })
    })

    it('selectOutputItemsCountByType should tally counts per type', () => {
      const state = makeRootState({
        ...createInitialState(),
        items: [
          makeOutputItem({ id: 'p1', type: 'writings' }),
          makeOutputItem({ id: 'p2', type: 'writings' }),
          makeOutputItem({ id: 'w1', type: 'writings' })
        ]
      })
      expect(selectOutputItemsCountByType(state)).toEqual({ writings: 3 })
    })

    it('selectOutputLoading should return false in initial state', () => {
      const state = makeRootState()
      expect(selectOutputLoading(state)).toBe(false)
    })

    it('selectOutputLoading should return true when loading is set', () => {
      const state = makeRootState({ ...createInitialState(), loading: true })
      expect(selectOutputLoading(state)).toBe(true)
    })

    it('selectOutputError should return null in initial state', () => {
      const state = makeRootState()
      expect(selectOutputError(state)).toBeNull()
    })

    it('selectOutputError should return the error string when set', () => {
      const state = makeRootState({ ...createInitialState(), error: 'Failed to load' })
      expect(selectOutputError(state)).toBe('Failed to load')
    })
  })
})
