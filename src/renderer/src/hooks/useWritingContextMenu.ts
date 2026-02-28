import { useEffect, useRef } from 'react'
import { useAppDispatch } from '../store'
import { addEntry, removeEntry, type WritingEntry } from '../store/writingItemsSlice'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Subscribes to context-menu actions for writing items in the sidebar.
 *
 * SRP: Isolates writing context-menu event handling into a single-purpose hook.
 *
 * The ref pattern prevents re-subscription on every render:
 * - `entriesRef` always holds the current entries without being a dependency.
 * - The subscription effect depends only on stable values (dispatch, navigate).
 *
 * Persistence is via window.workspace.output (OutputFilesService via workspace).
 */
export function useWritingContextMenu(entries: WritingEntry[]): void {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname

  useEffect(() => {
    const cleanup = window.app.onWritingAction(async (data) => {
      const { action, writingId } = data

      switch (action) {
        case 'open':
          navigate(`/content/${writingId}`)
          break

        case 'duplicate': {
          const source = entriesRef.current.find((e) => e.id === writingId)
          if (!source) break

          const now = new Date().toISOString()
          const newId = crypto.randomUUID()
          const duplicatedTitle = source.title ? `${source.title} (Copy)` : ''

          // Create duplicate on disk first via workspace-backed output service
          try {
            const result = await window.workspace.saveOutput({
              type: 'writings',
              blocks: source.blocks.map((b) => ({
                name: b.id,
                content: b.content,
                createdAt: now,
                updatedAt: now,
              })),
              metadata: {
                title: duplicatedTitle || 'Untitled Writing',
                category: source.category,
                tags: [...source.tags],
                visibility: 'private',
                provider: 'manual',
                model: '',
              },
            })

            dispatch(
              addEntry({
                id: newId,
                writingItemId: result.id,
                title: duplicatedTitle,
                blocks: source.blocks.map((b) => ({
                  id: crypto.randomUUID(),
                  type: b.type,
                  content: b.content,
                  createdAt: now,
                  updatedAt: now,
                })),
                category: source.category,
                tags: [...source.tags],
                createdAt: now,
                updatedAt: now,
                savedAt: result.savedAt,
              })
            )
            navigate(`/content/${newId}`)
          } catch (err) {
            console.error('[useWritingContextMenu] Failed to duplicate writing item:', err)
          }
          break
        }

        case 'rename':
          navigate(`/content/${writingId}`)
          break

        case 'delete': {
          const entryToDelete = entriesRef.current.find((e) => e.id === writingId)
          if (entryToDelete?.writingItemId) {
            try {
              await window.workspace.deleteOutput({ type: 'writings', id: entryToDelete.writingItemId })
            } catch (err) {
              console.error('[useWritingContextMenu] Failed to delete writing item from disk:', err)
            }
          }
          dispatch(removeEntry(writingId))
          if (pathnameRef.current === `/content/${writingId}`) {
            navigate('/home')
          }
          break
        }
      }
    })

    return cleanup
  }, [dispatch, navigate])
}
