/**
 * Tests for postsSlice - the Redux store for posts state.
 *
 * Tests cover:
 *   - All reducers (createPost, updatePostBlocks, updatePostTitle, etc.)
 *   - updatePostInferenceSettings: all five fields, updatedAt bump, no-op on missing ID
 *   - Extra reducer: output/loadAll/fulfilled hydration
 *     - Maps inference fields (provider, model, temperature, maxTokens, reasoning) into new Posts
 *     - Updates inference fields on existing Posts when disk data changes
 *     - Removes Posts whose outputId no longer exists on disk
 *     - Skips Posts with no outputId (unsaved in-session drafts)
 *   - Selectors (selectPosts, selectPostById, selectPostCount)
 *   - Edge cases (missing post IDs, empty state)
 */

import postsReducer, {
  createPost,
  updatePostBlocks,
  updatePostTitle,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility,
  updatePostInferenceSettings,
  deletePost,
  selectPosts,
  selectPostById,
  selectPostCount,
  type Post
} from '../../../../src/renderer/src/store/postsSlice'
import type { OutputItem, OutputBlockItem } from '../../../../src/renderer/src/store/outputSlice'
import type { Block } from '../../../../src/renderer/src/components/ContentBlock'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialState() {
  return {
    posts: [] as Post[]
  }
}

/** Create a Block with timestamps for test use. */
function makeBlock(id: string, content: string): Block {
  return { id, content, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
}

/** Create an OutputBlockItem (bridge-side block). */
function makeOutputBlock(name: string, content: string): OutputBlockItem {
  return { name, content, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' }
}

function createTestPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'test-post-id',
    title: 'Test Post',
    blocks: [makeBlock('block-1', 'Test content')],
    category: 'technology',
    tags: ['test', 'example'],
    visibility: 'public',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides
  }
}

/** Build an OutputItem of type 'posts' to simulate disk data. */
function makeOutputItem(overrides: Partial<OutputItem> = {}): OutputItem {
  return {
    id: 'output-1',
    type: 'posts',
    path: '/workspace/output/posts/output-1',
    title: 'Disk Post Title',
    blocks: [
      makeOutputBlock('block-uuid-1', 'Paragraph one'),
      makeOutputBlock('block-uuid-2', 'Paragraph two'),
    ],
    category: 'technology',
    tags: ['disk-tag'],
    visibility: 'public',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    reasoning: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
    savedAt: 2000,
    ...overrides
  }
}

/**
 * Simulate the `output/loadAll/fulfilled` action that postsSlice listens to.
 * The payload is OutputItem[] (all types); the reducer filters by type='posts'.
 */
function outputLoadAllFulfilled(payload: OutputItem[]) {
  return { type: 'output/loadAll/fulfilled', payload }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('postsSlice', () => {
  describe('reducers', () => {
    describe('createPost', () => {
      it('should add a new post with default values', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(state, createPost())

        // Assert
        expect(result.posts).toHaveLength(1)
        expect(result.posts[0].title).toBe('')
        expect(result.posts[0].blocks).toHaveLength(1)
        expect(result.posts[0].blocks[0].content).toBe('')
        expect(result.posts[0].category).toBe('technology')
        expect(result.posts[0].tags).toEqual([])
        expect(result.posts[0].visibility).toBe('public')
        expect(result.posts[0].id).toBeTruthy()
        expect(result.posts[0].createdAt).toBeTruthy()
        expect(result.posts[0].updatedAt).toBeTruthy()
      })

      it('should create a block with ISO timestamps', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(state, createPost())

        // Assert
        const block = result.posts[0].blocks[0]
        expect(block.createdAt).toBeTruthy()
        expect(block.updatedAt).toBeTruthy()
        // Verify they are valid ISO 8601 strings
        expect(() => new Date(block.createdAt)).not.toThrow()
        expect(() => new Date(block.updatedAt)).not.toThrow()
      })

      it('should prepend new posts (most recent first)', () => {
        // Arrange
        let state = createInitialState()
        state = postsReducer(state, createPost())
        const firstPostId = state.posts[0].id

        // Act
        state = postsReducer(state, createPost())

        // Assert
        expect(state.posts).toHaveLength(2)
        expect(state.posts[0].id).not.toBe(firstPostId) // newest first
        expect(state.posts[1].id).toBe(firstPostId)
      })
    })

    describe('updatePostBlocks', () => {
      it('should update blocks for the specified post', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))
        const newBlocks = [
          makeBlock('block-a', 'Updated content 1'),
          makeBlock('block-b', 'Updated content 2')
        ]
        const beforeUpdatedAt = state.posts[0].updatedAt

        // Wait to ensure updatedAt changes
        jest.spyOn(Date, 'now').mockReturnValue(beforeUpdatedAt + 1000)

        // Act
        state = postsReducer(state, updatePostBlocks({ postId: 'post-1', blocks: newBlocks }))

        // Assert
        expect(state.posts[0].blocks).toEqual(newBlocks)
        expect(state.posts[0].updatedAt).toBeGreaterThan(beforeUpdatedAt)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify state for a non-existent post', () => {
        // Arrange
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))

        // Act
        const result = postsReducer(
          state,
          updatePostBlocks({ postId: 'nonexistent', blocks: [] })
        )

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('updatePostTitle', () => {
      it('should update title for the specified post', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', title: 'Old Title' }))
        const beforeUpdatedAt = state.posts[0].updatedAt

        // Wait to ensure updatedAt changes
        jest.spyOn(Date, 'now').mockReturnValue(beforeUpdatedAt + 1000)

        // Act
        state = postsReducer(state, updatePostTitle({ postId: 'post-1', title: 'New Title' }))

        // Assert
        expect(state.posts[0].title).toBe('New Title')
        expect(state.posts[0].updatedAt).toBeGreaterThan(beforeUpdatedAt)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify state for a non-existent post', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(
          state,
          updatePostTitle({ postId: 'nonexistent', title: 'test' })
        )

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('updatePostCategory', () => {
      it('should update category for the specified post', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', category: 'technology' }))
        const beforeUpdatedAt = state.posts[0].updatedAt

        // Wait to ensure updatedAt changes
        jest.spyOn(Date, 'now').mockReturnValue(beforeUpdatedAt + 1000)

        // Act
        state = postsReducer(
          state,
          updatePostCategory({ postId: 'post-1', category: 'science' })
        )

        // Assert
        expect(state.posts[0].category).toBe('science')
        expect(state.posts[0].updatedAt).toBeGreaterThan(beforeUpdatedAt)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify state for a non-existent post', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(
          state,
          updatePostCategory({ postId: 'nonexistent', category: 'test' })
        )

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('updatePostTags', () => {
      it('should update tags for the specified post', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', tags: ['old'] }))
        const beforeUpdatedAt = state.posts[0].updatedAt

        // Wait to ensure updatedAt changes
        jest.spyOn(Date, 'now').mockReturnValue(beforeUpdatedAt + 1000)

        // Act
        const newTags = ['new', 'tags', 'list']
        state = postsReducer(state, updatePostTags({ postId: 'post-1', tags: newTags }))

        // Assert
        expect(state.posts[0].tags).toEqual(newTags)
        expect(state.posts[0].updatedAt).toBeGreaterThan(beforeUpdatedAt)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify state for a non-existent post', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(state, updatePostTags({ postId: 'nonexistent', tags: [] }))

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('updatePostVisibility', () => {
      it('should update visibility for the specified post', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', visibility: 'public' }))
        const beforeUpdatedAt = state.posts[0].updatedAt

        // Wait to ensure updatedAt changes
        jest.spyOn(Date, 'now').mockReturnValue(beforeUpdatedAt + 1000)

        // Act
        state = postsReducer(
          state,
          updatePostVisibility({ postId: 'post-1', visibility: 'private' })
        )

        // Assert
        expect(state.posts[0].visibility).toBe('private')
        expect(state.posts[0].updatedAt).toBeGreaterThan(beforeUpdatedAt)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify state for a non-existent post', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = postsReducer(
          state,
          updatePostVisibility({ postId: 'nonexistent', visibility: 'test' })
        )

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('updatePostInferenceSettings', () => {
      const INFERENCE_PAYLOAD = {
        postId: 'post-1',
        provider: 'anthropic',
        model: 'claude-opus-4-6',
        temperature: 1.2,
        maxTokens: 4096,
        reasoning: true
      }

      it('should update all five inference fields on the matching post', () => {
        // Arrange
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))

        // Act
        const result = postsReducer(state, updatePostInferenceSettings(INFERENCE_PAYLOAD))

        // Assert
        const post = result.posts[0]
        expect(post.provider).toBe('anthropic')
        expect(post.model).toBe('claude-opus-4-6')
        expect(post.temperature).toBe(1.2)
        expect(post.maxTokens).toBe(4096)
        expect(post.reasoning).toBe(true)
      })

      it('should accept null for maxTokens (unlimited)', () => {
        // Arrange
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))

        // Act
        const result = postsReducer(
          state,
          updatePostInferenceSettings({ ...INFERENCE_PAYLOAD, maxTokens: null })
        )

        // Assert
        expect(result.posts[0].maxTokens).toBeNull()
      })

      it('should bump updatedAt after updating inference settings', () => {
        // Arrange
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', updatedAt: 1000 }))
        jest.spyOn(Date, 'now').mockReturnValue(9999)

        // Act
        const result = postsReducer(state, updatePostInferenceSettings(INFERENCE_PAYLOAD))

        // Assert
        expect(result.posts[0].updatedAt).toBe(9999)

        // Cleanup
        jest.restoreAllMocks()
      })

      it('should not modify other posts when postId matches only one', () => {
        // Arrange
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1', provider: 'openai' }))
        state.posts.push(createTestPost({ id: 'post-2', provider: 'openai' }))

        // Act
        const result = postsReducer(state, updatePostInferenceSettings(INFERENCE_PAYLOAD))

        // Assert: post-2 remains unchanged
        expect(result.posts[1].provider).toBe('openai')
        expect(result.posts[1].model).toBeUndefined()
      })

      it('should be a no-op when postId does not exist', () => {
        // Arrange — post starts with no inference fields
        const state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))

        // Act — target a postId that does not exist
        const result = postsReducer(
          state,
          updatePostInferenceSettings({ ...INFERENCE_PAYLOAD, postId: 'nonexistent' })
        )

        // Assert: post-1 is completely untouched (inference fields were never set)
        expect(result.posts[0].provider).toBeUndefined()
        expect(result.posts[0].model).toBeUndefined()
        expect(result.posts[0].temperature).toBeUndefined()
        expect(result.posts[0].maxTokens).toBeUndefined()
        expect(result.posts[0].reasoning).toBeUndefined()
      })
    })

    describe('deletePost', () => {
      it('should remove the post by ID', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))
        state.posts.push(createTestPost({ id: 'post-2' }))

        // Act
        state = postsReducer(state, deletePost('post-1'))

        // Assert
        expect(state.posts).toHaveLength(1)
        expect(state.posts[0].id).toBe('post-2')
      })

      it('should handle deleting non-existent post gracefully', () => {
        // Arrange
        let state = createInitialState()
        state.posts.push(createTestPost({ id: 'post-1' }))

        // Act
        state = postsReducer(state, deletePost('nonexistent'))

        // Assert
        expect(state.posts).toHaveLength(1)
        expect(state.posts[0].id).toBe('post-1')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Extra reducers: output/loadAll/fulfilled hydration
  // ---------------------------------------------------------------------------

  describe('extra reducers: output/loadAll/fulfilled hydration', () => {
    it('should add new posts from disk that do not yet exist in Redux', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({ id: 'output-1', title: 'From Disk' })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].title).toBe('From Disk')
      expect(result.posts[0].outputId).toBe('output-1')
    })

    it('should map all inference fields when adding a new post from disk', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({
        id: 'output-1',
        provider: 'anthropic',
        model: 'claude-opus-4-6',
        temperature: 1.8,
        maxTokens: 4000,
        reasoning: true
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      const post = result.posts[0]
      expect(post.provider).toBe('anthropic')
      expect(post.model).toBe('claude-opus-4-6')
      expect(post.temperature).toBe(1.8)
      expect(post.maxTokens).toBe(4000)
      expect(post.reasoning).toBe(true)
    })

    it('should map null maxTokens from disk (unlimited)', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({ id: 'output-1', maxTokens: null })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts[0].maxTokens).toBeNull()
    })

    it('should update inference fields on an existing post when disk data changed', () => {
      // Arrange
      const existing = createTestPost({
        id: 'post-1',
        outputId: 'output-1',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: null,
        reasoning: false
      })
      const state = { posts: [existing] }

      const diskItem = makeOutputItem({
        id: 'output-1',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.5,
        maxTokens: 2000,
        reasoning: false,
        updatedAt: '2025-01-01T00:00:00.000Z'
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      const post = result.posts[0]
      expect(post.id).toBe('post-1') // Redux ID preserved
      expect(post.provider).toBe('anthropic')
      expect(post.model).toBe('claude-sonnet-4-5-20250929')
      expect(post.temperature).toBe(0.5)
      expect(post.maxTokens).toBe(2000)
      expect(post.reasoning).toBe(false)
    })

    it('should update reasoning to true on an existing post when disk sets reasoning=true', () => {
      // Arrange — post currently has reasoning: false
      const existing = createTestPost({
        id: 'post-1',
        outputId: 'output-1',
        provider: 'openai',
        model: 'o1',
        reasoning: false
      })
      const state = { posts: [existing] }

      const diskItem = makeOutputItem({
        id: 'output-1',
        provider: 'openai',
        model: 'o1',
        temperature: 0.7,
        maxTokens: null,
        reasoning: true
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts[0].reasoning).toBe(true)
    })

    it('should reconstruct blocks from individual disk block items', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({
        id: 'output-1',
        blocks: [
          makeOutputBlock('block-uuid-1', 'Paragraph one'),
          makeOutputBlock('block-uuid-2', 'Paragraph two'),
          makeOutputBlock('block-uuid-3', 'Paragraph three'),
        ]
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts[0].blocks).toHaveLength(3)
      expect(result.posts[0].blocks[0].content).toBe('Paragraph one')
      expect(result.posts[0].blocks[1].content).toBe('Paragraph two')
      expect(result.posts[0].blocks[2].content).toBe('Paragraph three')
    })

    it('should use block name as the Block id when hydrating from disk', () => {
      // Arrange — the block name in config.json is used as the Redux block id
      const state = createInitialState()
      const diskItem = makeOutputItem({
        id: 'output-1',
        blocks: [makeOutputBlock('my-stable-uuid', 'Content')]
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts[0].blocks[0].id).toBe('my-stable-uuid')
    })

    it('should preserve block timestamps when hydrating from disk', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({
        id: 'output-1',
        blocks: [{
          name: 'block-1',
          content: 'Hello',
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: '2024-03-15T00:00:00.000Z',
        }]
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      const block = result.posts[0].blocks[0]
      expect(block.createdAt).toBe('2024-03-01T00:00:00.000Z')
      expect(block.updatedAt).toBe('2024-03-15T00:00:00.000Z')
    })

    it('should create a single empty block when disk blocks array is empty', () => {
      // Arrange
      const state = createInitialState()
      const diskItem = makeOutputItem({ id: 'output-1', blocks: [] })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert
      expect(result.posts[0].blocks).toHaveLength(1)
      expect(result.posts[0].blocks[0].content).toBe('')
    })

    it('should NOT rebuild blocks when disk content is identical to current blocks', () => {
      // Arrange — blocks and disk content are identical by name+content fingerprint
      const existing = createTestPost({
        id: 'post-1',
        blocks: [
          makeBlock('block-uuid-1', 'Paragraph one'),
          makeBlock('block-uuid-2', 'Paragraph two'),
        ],
        outputId: 'output-1'
      })
      const state = { posts: [existing] }
      const originalBlockIds = existing.blocks.map((b) => b.id)

      const diskItem = makeOutputItem({
        id: 'output-1',
        blocks: [
          makeOutputBlock('block-uuid-1', 'Paragraph one'),
          makeOutputBlock('block-uuid-2', 'Paragraph two'),
        ]
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert — block IDs unchanged (blocks not rebuilt)
      const resultBlockIds = result.posts[0].blocks.map((b) => b.id)
      expect(resultBlockIds).toEqual(originalBlockIds)
    })

    it('should remove posts whose outputId no longer exists on disk', () => {
      // Arrange — one saved post, one unsaved in-session draft
      const savedPost = createTestPost({ id: 'post-1', outputId: 'output-1' })
      const unsavedPost = createTestPost({ id: 'post-2', outputId: undefined })
      const state = { posts: [savedPost, unsavedPost] }

      // Act — disk returns no posts-type items
      const result = postsReducer(state, outputLoadAllFulfilled([]))

      // Assert — only the unsaved draft survives
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].id).toBe('post-2')
    })

    it('should preserve inference fields already on an existing post when inference fields survive refresh', () => {
      // Arrange — existing post has inference settings; disk content is identical
      const existing = createTestPost({
        id: 'post-1',
        blocks: [makeBlock('block-uuid-1', 'Same content')],
        outputId: 'output-1',
        provider: 'anthropic',
        model: 'claude-opus-4-6',
        temperature: 0.8,
        maxTokens: 2000,
        reasoning: false
      })
      const state = { posts: [existing] }

      const diskItem = makeOutputItem({
        id: 'output-1',
        blocks: [makeOutputBlock('block-uuid-1', 'Same content')],
        provider: 'anthropic',
        model: 'claude-opus-4-6',
        temperature: 0.8,
        maxTokens: 2000,
        reasoning: false
      })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert — inference fields preserved intact
      const post = result.posts[0]
      expect(post.provider).toBe('anthropic')
      expect(post.model).toBe('claude-opus-4-6')
      expect(post.temperature).toBe(0.8)
      expect(post.maxTokens).toBe(2000)
      expect(post.reasoning).toBe(false)
    })

    it('should ignore output items of types other than posts', () => {
      // Arrange
      const state = createInitialState()
      const writingItem = makeOutputItem({ id: 'writing-1', type: 'writings' })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([writingItem]))

      // Assert — writings should not be hydrated into posts
      expect(result.posts).toHaveLength(0)
    })

    it('should not add a post twice if it already has a matching outputId', () => {
      // Arrange
      const existing = createTestPost({ id: 'post-1', outputId: 'output-1' })
      const state = { posts: [existing] }
      const diskItem = makeOutputItem({ id: 'output-1' })

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled([diskItem]))

      // Assert — no duplicate
      expect(result.posts).toHaveLength(1)
    })

    it('should handle multiple new disk posts at once', () => {
      // Arrange
      const state = createInitialState()
      const diskItems = [
        makeOutputItem({ id: 'output-1', title: 'First' }),
        makeOutputItem({ id: 'output-2', title: 'Second' }),
        makeOutputItem({ id: 'output-3', title: 'Third' })
      ]

      // Act
      const result = postsReducer(state, outputLoadAllFulfilled(diskItems))

      // Assert
      expect(result.posts).toHaveLength(3)
    })
  })

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  describe('selectors', () => {
    it('selectPosts should return the posts array', () => {
      const state = { posts: createInitialState() }
      expect(selectPosts(state)).toEqual([])

      const stateWithPosts = {
        posts: { posts: [createTestPost()] }
      }
      expect(selectPosts(stateWithPosts)).toHaveLength(1)
    })

    it('selectPostById should return the correct post or null', () => {
      // No posts
      const emptyState = { posts: createInitialState() }
      const selector = selectPostById('post-1')
      expect(selector(emptyState)).toBeNull()

      // With post
      const stateWithPosts = {
        posts: { posts: [createTestPost({ id: 'post-1' }), createTestPost({ id: 'post-2' })] }
      }
      expect(selector(stateWithPosts)?.id).toBe('post-1')

      // Non-existent post
      const nonExistentSelector = selectPostById('nonexistent')
      expect(nonExistentSelector(stateWithPosts)).toBeNull()
    })

    it('selectPostById should return a post that includes inference fields', () => {
      // Ensure inference fields are accessible via selector (not stripped)
      const post = createTestPost({
        id: 'post-1',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        reasoning: false
      })
      const state = { posts: { posts: [post] } }
      const selector = selectPostById('post-1')
      const selected = selector(state)

      expect(selected?.provider).toBe('openai')
      expect(selected?.model).toBe('gpt-4o')
      expect(selected?.temperature).toBe(0.7)
      expect(selected?.maxTokens).toBe(2048)
      expect(selected?.reasoning).toBe(false)
    })

    it('selectPostCount should return the number of posts', () => {
      const emptyState = { posts: createInitialState() }
      expect(selectPostCount(emptyState)).toBe(0)

      const stateWithPosts = {
        posts: {
          posts: [createTestPost({ id: 'post-1' }), createTestPost({ id: 'post-2' })]
        }
      }
      expect(selectPostCount(stateWithPosts)).toBe(2)
    })
  })
})
