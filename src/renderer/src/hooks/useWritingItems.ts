import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store'
import { loadWritingItems } from '@/store/writingItemsSlice'

/**
 * Loads writing items from the workspace and keeps them in sync.
 *
 * Responsibilities:
 *  1. Load items on mount when a workspace is active.
 *  2. Reload items whenever the workspace changes (user opens a different folder).
 *  3. Debounce file-watcher events so rapid filesystem notifications do not
 *     trigger redundant reloads (e.g. folder deletion fires multiple events).
 *
 * This hook must be called once at AppLayout level so a single IPC subscription
 * is active for the lifetime of the app window.
 */
export function useWritingItems(): void {
  const dispatch = useAppDispatch()

  // Shared debounce ref for both the workspace-change and file-watcher paths.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // -----------------------------------------------------------------------
    // Load helper — verifies a workspace exists before dispatching
    // -----------------------------------------------------------------------
    const loadItems = async (): Promise<void> => {
      try {
        const workspace = await window.workspace.getCurrent()
        if (workspace) {
          console.log('[useWritingItems] Loading writing items for workspace:', workspace)
          await dispatch(loadWritingItems()).unwrap()
        }
      } catch (err) {
        console.error('[useWritingItems] Failed to load writing items:', err)
      }
    }

    // -----------------------------------------------------------------------
    // Debounced reload helper
    // -----------------------------------------------------------------------
    const scheduleDebouncedLoad = (): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        dispatch(loadWritingItems())
      }, 500)
    }

    // Initial load on mount
    loadItems()

    // -----------------------------------------------------------------------
    // Workspace change listener — reload when user opens a different folder
    // -----------------------------------------------------------------------
    const unsubscribeWorkspace = window.workspace.onChange((event) => {
      if (event.currentPath) {
        console.log('[useWritingItems] Workspace changed, reloading writing items:', event.currentPath)
        scheduleDebouncedLoad()
      }
    })

    // -----------------------------------------------------------------------
    // File-watcher listener — reload when the filesystem changes externally
    // (e.g. another app edits content.md, or the user deletes a folder manually)
    // -----------------------------------------------------------------------
    const unsubscribeFileChange = window.writingItems.onFileChange((event) => {
      console.log(`[useWritingItems] File ${event.type}: item ${event.itemId}`)
      scheduleDebouncedLoad()
    })

    return () => {
      unsubscribeWorkspace()
      unsubscribeFileChange()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [dispatch])
}
