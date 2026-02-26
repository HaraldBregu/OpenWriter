import { useCallback, useRef, useState } from 'react'
import { useAppDispatch } from '@/store'
import { addEntry, type WritingEntry } from '@/store/writingItemsSlice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCreateWritingOptions {
  /** Default title used when none is provided at call time. Defaults to ''. */
  defaultTitle?: string
  /** Called with the new writing's Redux entity ID after a successful creation. */
  onSuccess?: (entryId: string) => void
  /** Called when creation fails for any reason. */
  onError?: (error: Error) => void
}

export interface UseCreateWritingReturn {
  /**
   * Trigger writing creation. Accepts an optional title that overrides the
   * hook-level `defaultTitle`. Returns the new Redux entity ID on success,
   * or `null` when creation fails or there is no active workspace.
   */
  createWriting: (title?: string) => Promise<string | null>
  /** True while a disk-write operation is in flight. */
  isLoading: boolean
  /** Last creation error, or null when idle / last attempt succeeded. */
  error: Error | null
  /** Reset error state so the caller can retry without stale error UI. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides an imperative `createWriting` function that:
 *
 * 1. Guards against concurrent calls while a creation is in flight.
 * 2. Verifies that a workspace is active before attempting any file I/O.
 * 3. Calls `window.output.save` to create the folder + config.json + block
 *    .md files on disk under <workspace>/output/writings/<timestamp>/.
 * 4. Dispatches `addEntry` to Redux with the new entry so the sidebar updates
 *    immediately without waiting for the next file-watcher reload.
 * 5. Returns the new entity ID so the caller can navigate immediately.
 *
 * Uses a conservative (non-optimistic) approach: Redux is only updated after
 * the disk write succeeds, preventing ghost entries on failure.
 */
export function useCreateWriting(options: UseCreateWritingOptions = {}): UseCreateWritingReturn {
  const { defaultTitle = '', onSuccess, onError } = options

  const dispatch = useAppDispatch()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Guard ref — prevents a second call from racing while one is running.
  // A ref (not state) so the guard flip does not trigger a re-render.
  const inFlightRef = useRef(false)

  const reset = useCallback((): void => {
    setError(null)
  }, [])

  const createWriting = useCallback(
    async (title?: string): Promise<string | null> => {
      // Prevent double-creation from rapid clicks
      if (inFlightRef.current) return null
      inFlightRef.current = true

      setIsLoading(true)
      setError(null)

      try {
        // Verify workspace exists before doing any I/O
        const workspace = await window.workspace.getCurrent()
        if (!workspace) {
          throw new Error(
            'No active workspace. Please open a workspace before creating a writing.'
          )
        }

        const resolvedTitle = title ?? defaultTitle
        const now = new Date().toISOString()

        // Create the initial block for this writing
        const blockName = crypto.randomUUID()

        // Persist to disk via window.output.save (workspace-backed OutputFilesService).
        // This writes <workspace>/output/writings/<YYYY-MM-DD_HHmmss>/config.json
        // and one <blockName>.md file per block.
        const result = await window.output.save({
          type: 'writings',
          blocks: [
            {
              name: blockName,
              content: '',
              createdAt: now,
              updatedAt: now,
            },
          ],
          metadata: {
            title: resolvedTitle || 'Untitled Writing',
            category: 'writing',
            tags: [],
            visibility: 'private',
            provider: 'manual',
            model: '',
          },
        })

        const savedAt = result.savedAt
        const savedAtIso = new Date(savedAt).toISOString()
        const entryId = crypto.randomUUID()

        const newEntry: WritingEntry = {
          id: entryId,
          writingItemId: result.id,
          title: resolvedTitle,
          blocks: [
            {
              id: crypto.randomUUID(),
              content: '',
              createdAt: savedAtIso,
              updatedAt: savedAtIso,
            },
          ],
          category: 'writing',
          tags: [],
          createdAt: savedAtIso,
          updatedAt: savedAtIso,
          savedAt,
        }

        // Commit to Redux only after disk write succeeds
        dispatch(addEntry(newEntry))

        onSuccess?.(entryId)
        return entryId
      } catch (err) {
        // Normalise all error shapes into a proper Error object
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'An unexpected error occurred while creating the writing.'
        const normalised = new Error(message)
        setError(normalised)
        onError?.(normalised)
        return null
      } finally {
        setIsLoading(false)
        inFlightRef.current = false
      }
    },
    [defaultTitle, dispatch, onSuccess, onError]
  )

  return { createWriting, isLoading, error, reset }
}
