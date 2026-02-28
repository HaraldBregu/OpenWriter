import { useCallback, useMemo } from 'react'
import { useAppSelector } from '../store'
import {
  selectEnhancingBlockIds,
  selectStreamingEntries,
  selectIsBlockEnhancing,
  selectBlockStreamingContent,
} from '../store/enhancementSlice'
import { selectWritingEntryById } from '../store/writingItemsSlice'
import { useEnhancementContext } from '@/contexts/EnhancementContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsePageEnhancementOptions {
  /**
   * The client-side UUID of the writing entry being edited.
   * Required so EnhancementContext can dispatch `updateBlockContent` to the
   * correct Redux entry when a task completes or reverts.
   */
  entryId: string
}

export interface UsePageEnhancementReturn {
  /**
   * Set of block IDs that are currently being enhanced.
   * ContentBlock uses this to show the loading state for each matching block.
   */
  enhancingBlockIds: Set<string>
  /**
   * Live streaming content keyed by block ID.
   * Pass `streamingEntries.get(block.id)` directly to the target AppTextEditor
   * as `streamingContent` so tokens render without redundant re-renders.
   */
  streamingEntries: Map<string, string>
  /**
   * Trigger AI enhancement for the given block.
   * No-ops if that block is already being enhanced.
   * Multiple different blocks can enhance concurrently.
   */
  handleEnhance: (blockId: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePageEnhancement — thin adapter between ContentPage and EnhancementContext.
 *
 * All task submission, subscription, and streaming logic lives in
 * EnhancementContext (app-root-level provider that never unmounts on
 * navigation).  This hook simply:
 *
 *   1. Reads `enhancingBlockIds` and `streamingEntries` from Redux and converts
 *      them from the serialisable array/record form to the Set/Map form that
 *      ContentBlock expects.
 *   2. Reads the current block content from Redux so `startEnhancement` can
 *      snapshot it when `handleEnhance` is called.
 *   3. Delegates the actual enhancement to `startEnhancement` from context.
 *
 * Because state is in Redux, navigation away from ContentPage no longer loses
 * streaming progress — the app-root provider keeps running.
 */
export function usePageEnhancement({ entryId }: UsePageEnhancementOptions): UsePageEnhancementReturn {
  const { startEnhancement } = useEnhancementContext()

  // ---------------------------------------------------------------------------
  // Redux state — serialisable forms, converted to Set/Map for ContentBlock.
  // ---------------------------------------------------------------------------

  const enhancingIdsArray = useAppSelector(selectEnhancingBlockIds)
  const streamingEntriesRecord = useAppSelector(selectStreamingEntries)

  // Memoised conversions — only allocate a new Set/Map when the underlying
  // Redux value changes reference (createSelector handles that guarantee).
  const enhancingBlockIds = useMemo(
    () => new Set(enhancingIdsArray),
    [enhancingIdsArray],
  )

  const streamingEntries = useMemo(
    () => new Map(Object.entries(streamingEntriesRecord)),
    [streamingEntriesRecord],
  )

  // ---------------------------------------------------------------------------
  // Entry selector — stable factory selector (module-level cache is safe here
  // because entryId is a stable UUID per ContentPage mount).
  // ---------------------------------------------------------------------------

  // selectWritingEntryById returns a factory; call inside useMemo is fine
  // because the selector instance is stable for a given entryId.
  const entrySelector = useMemo(() => selectWritingEntryById(entryId), [entryId])
  const entry = useAppSelector(entrySelector)

  // ---------------------------------------------------------------------------
  // handleEnhance
  // ---------------------------------------------------------------------------

  const handleEnhance = useMemo(
    () =>
      async (blockId: string): Promise<void> => {
        // Read current block content from Redux at call-time (no stale closure).
        const currentText = entry?.blocks.find((b) => b.id === blockId)?.content ?? ''
        await startEnhancement({ blockId, entryId, text: currentText })
      },
    // entry reference changes when blocks are edited; entryId is stable per page.
    [entry, entryId, startEnhancement],
  )

  return { enhancingBlockIds, streamingEntries, handleEnhance }
}

// ---------------------------------------------------------------------------
// useBlockEnhancement — per-block hook for use inside ContentBlock
// ---------------------------------------------------------------------------

export interface UseBlockEnhancementReturn {
  /** True while this specific block is being AI-enhanced. */
  isEnhancing: boolean
  /** Live streamed content for this block, or undefined when idle. */
  streamingContent: string | undefined
  /** Trigger enhancement for this block. */
  handleEnhance: () => void
}

/**
 * Per-block hook that reads only this block's slice of Redux enhancement state.
 * Because the selectors are scoped to a single blockId, only this block
 * re-renders when its own streaming content changes — other blocks are unaffected.
 *
 * @param blockId  - The stable block UUID.
 * @param entryId  - The writing entry UUID (needed to read current block content).
 */
export function useBlockEnhancement(
  blockId: string,
  entryId: string,
): UseBlockEnhancementReturn {
  const { startEnhancement } = useEnhancementContext()

  // Per-block selectors — stable factory instances (created once per blockId).
  const isEnhancingSelector = useMemo(() => selectIsBlockEnhancing(blockId), [blockId])
  const streamingContentSelector = useMemo(() => selectBlockStreamingContent(blockId), [blockId])
  const entrySelector = useMemo(() => selectWritingEntryById(entryId), [entryId])

  const isEnhancing = useAppSelector(isEnhancingSelector)
  const streamingContent = useAppSelector(streamingContentSelector)
  const entry = useAppSelector(entrySelector)

  const handleEnhance = useCallback(() => {
    const text = entry?.blocks.find((b) => b.id === blockId)?.content ?? ''
    startEnhancement({ blockId, entryId, text })
  }, [blockId, entryId, entry, startEnhancement])

  return { isEnhancing, streamingContent, handleEnhance }
}
