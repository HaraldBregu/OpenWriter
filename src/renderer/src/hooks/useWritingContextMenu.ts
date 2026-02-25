import { useEffect, useRef } from 'react'
import { useAppDispatch } from '../store'
import { addWriting, deleteWriting } from '../store/writingsSlice'
import { deleteOutputItem } from '../store/outputSlice'
import type { Writing } from '../store/writingsSlice'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Subscribes to context-menu actions for writing items in the sidebar.
 *
 * SRP: Isolates writing context-menu event handling into a single-purpose hook.
 *
 * The ref pattern prevents re-subscription on every keystroke:
 * - `writingsRef` always holds the current writings array without being a dep.
 * - The subscription effect depends only on stable values (dispatch, navigate).
 */
export function useWritingContextMenu(writings: Writing[]): void {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Keep a stable ref to the latest writings so the effect closure always
  // reads current data without listing `writings` as a dependency.
  const writingsRef = useRef(writings)
  writingsRef.current = writings

  // Keep a stable ref to location.pathname for the same reason.
  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname

  useEffect(() => {
    const cleanup = window.contextMenu.onWritingAction((data) => {
      const { action, writingId } = data

      switch (action) {
        case 'open':
          navigate(`/new/writing/${writingId}`)
          break

        case 'duplicate': {
          const source = writingsRef.current.find((w) => w.id === writingId)
          if (!source) break
          const newId = crypto.randomUUID()
          dispatch(
            addWriting({
              id: newId,
              title: `${source.title} (Copy)`,
              blocks: source.blocks.map((b) => {
                const now = new Date().toISOString()
                return {
                  id: crypto.randomUUID(),
                  content: b.content,
                  createdAt: now,
                  updatedAt: now,
                }
              }),
              category: source.category,
              tags: source.tags,
              visibility: source.visibility,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          )
          navigate(`/new/writing/${newId}`)
          break
        }

        case 'rename':
          navigate(`/new/writing/${writingId}`)
          break

        case 'delete': {
          const writingToDelete = writingsRef.current.find((w) => w.id === writingId)
          if (writingToDelete?.outputId) {
            dispatch(deleteOutputItem({ type: 'writings', id: writingToDelete.outputId }))
          }
          dispatch(deleteWriting(writingId))
          if (pathnameRef.current === `/new/writing/${writingId}`) {
            navigate('/home')
          }
          break
        }
      }
    })

    return cleanup
  }, [dispatch, navigate])
}
