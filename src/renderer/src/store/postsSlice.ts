import { createSelector, createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import type { Block } from '@/components/ContentBlock'

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

    deletePost(state, action: PayloadAction<string>) {
      state.posts = state.posts.filter((p) => p.id !== action.payload)
    },

    loadPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload
    }
  }
})

export const {
  createPost,
  updatePostBlocks,
  updatePostTitle,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility,
  deletePost,
  loadPosts
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
