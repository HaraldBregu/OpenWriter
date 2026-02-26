import { useCallback, useRef, useState } from 'react'
import { useAppDispatch } from '@/store'
import { addWriting, setWritingOutputId } from '@/store/writingsSlice'
import { saveOutputItem } from '@/store/outputSlice'
import { DEFAULT_INFERENCE_SETTINGS } from '../../../shared/types/aiSettings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCreateWritingOptions {
  /** Default title used when none is provided at call time. Defaults to ''. */
  defaultTitle?: string
  /** Called with the new writing's Redux entity ID after a successful creation. */
  onSuccess?: (writingId: string) => void
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
  /** True while an output-save operation is in flight. */
  isLoading: boolean
  /** Last creation error, or null when the hook is idle / last attempt succeeded. */
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
 * 3. Calls `window.output.save` to create the output folder + metadata on disk.
 * 4. Dispatches `addWriting` + `setWritingOutputId` to Redux.
 * 5. Returns the new entity ID so the caller can navigate immediately.
 *
 * The hook uses a conservative (non-optimistic) approach: Redux state is only
 * updated after the workspace save succeeds, preventing ghost entries in the
 * sidebar on failure.
 *
 * @example
 * ```tsx
 * const { createWriting, isLoading, error } = useCreateWriting({
 *   onSuccess: (id) => navigate(`/new/writing/${id}`),
 * })
 *
 * <button disabled={isLoading} onClick={() => createWriting()}>
 *   New Writing
 * </button>
 * ```
 */
export function useCreateWriting(options: UseCreateWritingOptions = {}): UseCreateWritingReturn {
  const { defaultTitle = '', onSuccess, onError } = options

  const dispatch = useAppDispatch()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Guard ref prevents a second call from racing while one is already running.
  // Using a ref (not state) means the guard flip does not trigger a re-render.
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
        // Verify workspace exists before doing any work
        const workspace = await window.workspace.getCurrent()
        if (!workspace) {
          throw new Error('No active workspace. Please open a workspace before creating a writing.')
        }

        const resolvedTitle = title ?? defaultTitle
        const now = new Date().toISOString()
        const writingId = crypto.randomUUID()

        // Initial empty block — mirrors what useDraftEditor/makeBlock creates
        const initialBlock = {
          name: crypto.randomUUID(),
          content: '',
          createdAt: now,
          updatedAt: now,
        }

        const settings = DEFAULT_INFERENCE_SETTINGS

        // Persist the output folder + config.json to disk immediately.
        // saveOutputItem is an RTK async thunk; we unwrap so errors surface here.
        const saved = await dispatch(
          saveOutputItem({
            type: 'writings',
            title: resolvedTitle,
            blocks: [initialBlock],
            category: 'writing',
            tags: [],
            visibility: 'private',
            provider: settings.providerId,
            model: settings.modelId,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            reasoning: settings.reasoning,
          })
        ).unwrap()

        const nowMs = Date.now()

        // Commit writing to Redux state — only after disk write succeeds.
        dispatch(
          addWriting({
            id: writingId,
            title: resolvedTitle,
            blocks: [
              {
                id: initialBlock.name,
                content: initialBlock.content,
                createdAt: initialBlock.createdAt,
                updatedAt: initialBlock.updatedAt,
              },
            ],
            category: 'writing',
            tags: [],
            visibility: 'private',
            createdAt: nowMs,
            updatedAt: nowMs,
          })
        )

        // Link the Redux entity to its output folder on disk
        dispatch(setWritingOutputId({ writingId, outputId: saved.id }))

        onSuccess?.(writingId)
        return writingId
      } catch (err) {
        // RTK's `.unwrap()` may throw:
        //   - a plain `string` (from `rejectWithValue(string)`)
        //   - a `SerializedError` object with a `message` field
        //   - a native `Error` instance
        // We normalise all three into a proper Error so callers always receive
        // an Error object.
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'An unexpected error occurred while creating the writing.'
        const error = new Error(message)
        setError(error)
        onError?.(error)
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
