/**
 * Tests for postsSlice - the Redux store for posts state.
 *
 * Tests cover:
 *   - All reducers (createPost, updatePostBlocks, updatePostTitle, etc.)
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
  deletePost,
  selectPosts,
  selectPostById,
  selectPostCount,
  type Post
} from '../../../../src/renderer/src/store/postsSlice'

// Helper to create a well-known initial state
function createInitialState() {
  return {
    posts: [] as Post[]
  }
}

// Helper to create a test post
function createTestPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'test-post-id',
    title: 'Test Post',
    blocks: [{ id: 'block-1', content: 'Test content' }],
    category: 'technology',
    tags: ['test', 'example'],
    visibility: 'public',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

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
          { id: 'block-a', content: 'Updated content 1' },
          { id: 'block-b', content: 'Updated content 2' }
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
