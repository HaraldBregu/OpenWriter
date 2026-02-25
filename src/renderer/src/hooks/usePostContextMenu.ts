import { useEffect, useRef } from 'react'
import { useAppDispatch } from '../store'
import {
  createPost,
  deletePost,
  updatePostTitle,
  updatePostBlocks,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility,
} from '../store/postsSlice'
import { deleteOutputItem } from '../store/outputSlice'
import type { Post } from '../store/postsSlice'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Subscribes to context-menu actions for post items in the sidebar.
 *
 * SRP: Isolates post context-menu event handling into a single-purpose hook.
 *
 * The ref pattern prevents re-subscription on every keystroke:
 * - `postsRef` always holds the current posts array without being a dep.
 * - The subscription effect depends only on stable values (dispatch, navigate).
 */
export function usePostContextMenu(posts: Post[]): void {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Keep a stable ref to the latest posts so the effect closure always
  // reads current data without listing `posts` as a dependency.
  const postsRef = useRef(posts)
  postsRef.current = posts

  // Keep a stable ref to location.pathname for the same reason.
  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname

  useEffect(() => {
    const cleanup = window.contextMenu.onPostAction((data) => {
      const { action, postId } = data

      switch (action) {
        case 'open':
          navigate(`/new/post/${postId}`)
          break

        case 'duplicate': {
          const sourcePost = postsRef.current.find((p) => p.id === postId)
          if (!sourcePost) break

          const newPostAction = createPost()
          dispatch(newPostAction)
          const newPostId = newPostAction.payload.id

          dispatch(updatePostTitle({ postId: newPostId, title: `${sourcePost.title} (Copy)` }))
          dispatch(updatePostBlocks({ postId: newPostId, blocks: sourcePost.blocks }))
          dispatch(updatePostCategory({ postId: newPostId, category: sourcePost.category }))
          dispatch(updatePostTags({ postId: newPostId, tags: sourcePost.tags }))
          dispatch(updatePostVisibility({ postId: newPostId, visibility: sourcePost.visibility }))

          navigate(`/new/post/${newPostId}`)
          break
        }

        case 'rename':
          navigate(`/new/post/${postId}`)
          break

        case 'delete': {
          const postToDelete = postsRef.current.find((p) => p.id === postId)
          if (postToDelete?.outputId) {
            dispatch(deleteOutputItem({ type: 'posts', id: postToDelete.outputId }))
          }
          dispatch(deletePost(postId))
          if (pathnameRef.current === `/new/post/${postId}`) {
            navigate('/home')
          }
          break
        }
      }
    })

    return cleanup
  }, [dispatch, navigate])
}
