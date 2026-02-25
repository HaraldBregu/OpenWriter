import { createSelector, createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import type { Block } from '@/components/ContentBlock'
import type { OutputItem } from './outputSlice'

// OutputItem is imported only for the hydrateFromDisk reducer payload type.
// postsSlice does NOT import outputSlice at runtime — no circular dependency.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Post {
  id: string
  title: string
  blocks: Block[]
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
  /** ID of the corresponding output folder on disk (set after first save) */
  outputId?: string
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

interface PostsState {
  posts: Post[]
}

const initialState: PostsState = {
  posts: []
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh Block with ISO 8601 timestamps.
 * Kept in this slice so prepare() functions don't import from ContentBlock
 * (that would create a component → store → component import cycle risk).
 */
function makeBlock(content = ''): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), content, createdAt: now, updatedAt: now }
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    createPost: {
      reducer(state, action: PayloadAction<Post>) {
        state.posts.unshift(action.payload)
      },
      prepare() {
        return {
          payload: {
            id: nanoid(),
            title: '',
            blocks: [makeBlock()],
            category: 'technology',
            tags: [],
            visibility: 'public',
            createdAt: Date.now(),
            updatedAt: Date.now()
          } satisfies Post
        }
      }
    },

    updatePostBlocks(
      state,
      action: PayloadAction<{ postId: string; blocks: Block[] }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.blocks = action.payload.blocks
      post.updatedAt = Date.now()
    },

    updatePostTitle(
      state,
      action: PayloadAction<{ postId: string; title: string }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.title = action.payload.title
      post.updatedAt = Date.now()
    },

    updatePostCategory(
      state,
      action: PayloadAction<{ postId: string; category: string }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.category = action.payload.category
      post.updatedAt = Date.now()
    },

    updatePostTags(
      state,
      action: PayloadAction<{ postId: string; tags: string[] }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.tags = action.payload.tags
      post.updatedAt = Date.now()
    },

    updatePostVisibility(
      state,
      action: PayloadAction<{ postId: string; visibility: string }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.visibility = action.payload.visibility
      post.updatedAt = Date.now()
    },

    addPost(state, action: PayloadAction<Post>) {
      state.posts.unshift(action.payload)
    },

    setPostOutputId(state, action: PayloadAction<{ postId: string; outputId: string }>) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (post) post.outputId = action.payload.outputId
    },

    updatePostInferenceSettings(
      state,
      action: PayloadAction<{
        postId: string
        provider: string
        model: string
        temperature: number
        maxTokens: number | null
        reasoning: boolean
      }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId)
      if (!post) return
      post.provider = action.payload.provider
      post.model = action.payload.model
      post.temperature = action.payload.temperature
      post.maxTokens = action.payload.maxTokens
      post.reasoning = action.payload.reasoning
      post.updatedAt = Date.now()
    },

    deletePost(state, action: PayloadAction<string>) {
      state.posts = state.posts.filter((p) => p.id !== action.payload)
    },

    loadPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload
    },

    /**
     * Handle external file change event from the file watcher.
     * This is triggered when a post file is modified outside the app.
     */
    handleExternalPostChange(state, action: PayloadAction<Post>) {
      const existingIndex = state.posts.findIndex((p) => p.id === action.payload.id)
      if (existingIndex !== -1) {
        // Update existing post (external modification)
        state.posts[existingIndex] = action.payload
      } else {
        // Add new post (external creation)
        state.posts.unshift(action.payload)
      }
    },

    /**
     * Handle external file deletion event from the file watcher.
     * This is triggered when a post file is deleted outside the app.
     */
    handleExternalPostDelete(state, action: PayloadAction<string>) {
      state.posts = state.posts.filter((p) => p.id !== action.payload)
    },

    /**
     * Hydrate posts from disk after outputSlice finishes loading.
     *
     * Previously this lived in extraReducers matching 'output/loadAll/fulfilled'
     * by string — that pattern required importing OutputItem from outputSlice
     * which created a circular dependency. Now postsHydration.ts registers an
     * RTK listener for loadOutputItems.fulfilled and dispatches this action,
     * keeping the import graph acyclic while preserving type safety.
     */
    hydratePostsFromDisk(state, action: PayloadAction<OutputItem[]>) {
      const diskPosts = action.payload.filter((item) => item.type === 'posts')
      const diskOutputIds = new Set(diskPosts.map((item) => item.id))

      // 1. Remove posts whose output folder no longer exists on disk
      state.posts = state.posts.filter(
        (p) => !p.outputId || diskOutputIds.has(p.outputId)
      )

      // 2. Update posts whose disk content/title changed
      for (const item of diskPosts) {
        const existing = state.posts.find((p) => p.outputId === item.id)
        if (existing) {
          existing.title = item.title
          existing.category = item.category
          existing.tags = item.tags
          existing.visibility = item.visibility
          existing.provider = item.provider
          existing.model = item.model
          existing.temperature = item.temperature
          existing.maxTokens = item.maxTokens
          existing.reasoning = item.reasoning
          existing.updatedAt = new Date(item.updatedAt).getTime()

          // Rebuild blocks only if content actually changed.
          const diskFingerprint = item.blocks.map((b) => `${b.name}:${b.content}`).join('|')
          const currentFingerprint = existing.blocks.map((b) => `${b.id}:${b.content}`).join('|')
          if (diskFingerprint !== currentFingerprint) {
            existing.blocks = item.blocks.length > 0
              ? item.blocks.map((b): Block => ({
                  id: b.name,
                  content: b.content,
                  createdAt: b.createdAt,
                  updatedAt: b.updatedAt,
                }))
              : [makeBlock()]
          }
        }
      }

      // 3. Add posts that don't exist in Redux yet
      const existingOutputIds = new Set(
        state.posts.map((p) => p.outputId).filter(Boolean) as string[]
      )
      const newPosts: Post[] = diskPosts
        .filter((item) => !existingOutputIds.has(item.id))
        .map((item): Post => ({
          id: crypto.randomUUID(),
          title: item.title,
          blocks: item.blocks.length > 0
            ? item.blocks.map((b): Block => ({
                id: b.name,
                content: b.content,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
              }))
            : [makeBlock()],
          category: item.category,
          tags: item.tags,
          visibility: item.visibility,
          provider: item.provider,
          model: item.model,
          temperature: item.temperature,
          maxTokens: item.maxTokens,
          reasoning: item.reasoning,
          createdAt: new Date(item.createdAt).getTime(),
          updatedAt: new Date(item.updatedAt).getTime(),
          outputId: item.id
        }))

      if (newPosts.length > 0) {
        state.posts.push(...newPosts)
      }
    }
  }
})

export const {
  createPost,
  addPost,
  setPostOutputId,
  updatePostBlocks,
  updatePostTitle,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility,
  updatePostInferenceSettings,
  deletePost,
  loadPosts,
  handleExternalPostChange,
  handleExternalPostDelete
} = postsSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectPosts = (state: { posts: PostsState }): Post[] => state.posts.posts

export const selectPostById = (id: string) =>
  createSelector([selectPosts], (posts) => posts.find((p) => p.id === id) ?? null)

export const selectPostCount = createSelector(
  [selectPosts],
  (posts): number => posts.length
)

export default postsSlice.reducer
