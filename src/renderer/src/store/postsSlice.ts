import { createSelector, createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import type { Block } from '@/components/ContentBlock'
import type { OutputItem } from './outputSlice'

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
}

interface PostsState {
  posts: Post[]
}

const initialState: PostsState = {
  posts: []
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
            blocks: [{ id: nanoid(), content: '' }],
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
    }
  },

  extraReducers: (builder) => {
    /**
     * When output items finish loading (both initial load and file-watcher
     * refresh), hydrate any 'posts' OutputItems into postsSlice so they
     * appear in the sidebar after an app restart or workspace open.
     *
     * Deduplication: if a Post with the same outputId already exists, skip it.
     * This preserves in-session drafts (no outputId yet) unchanged.
     *
     * We match by the action type string to avoid a circular import
     * (postsSlice → outputSlice → store/index → postsSlice).
     */
    builder.addMatcher(
      (action): action is PayloadAction<OutputItem[]> =>
        action.type === 'output/loadAll/fulfilled',
      (state, action) => {
        const existingOutputIds = new Set(
          state.posts.map((p) => p.outputId).filter(Boolean) as string[]
        )

        const newPosts: Post[] = action.payload
          .filter((item) => item.type === 'posts' && !existingOutputIds.has(item.id))
          .map((item): Post => ({
            id: crypto.randomUUID(),
            title: item.title,
            blocks: item.content
              ? item.content
                  .split('\n\n')
                  .filter(Boolean)
                  .map((line): Block => ({ id: crypto.randomUUID(), content: line }))
              : [{ id: crypto.randomUUID(), content: '' }],
            category: item.category,
            tags: item.tags,
            visibility: item.visibility,
            createdAt: new Date(item.createdAt).getTime(),
            updatedAt: new Date(item.updatedAt).getTime(),
            outputId: item.id
          }))

        if (newPosts.length > 0) {
          // Append at the end so in-session drafts (newest) remain at the top
          state.posts.push(...newPosts)
        }
      }
    )
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
