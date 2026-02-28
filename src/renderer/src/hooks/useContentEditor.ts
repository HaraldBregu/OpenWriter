import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { createBlock, type Block, type BlockType } from '@/components/ContentBlock'
import {
  selectWritingEntryById,
  setWritingItemId,
  updateEntryBlocks,
  updateEntryTitle,
  type WritingEntry,
} from '@/store/writingItemsSlice'
import {
  DEFAULT_INFERENCE_SETTINGS,
  type InferenceSettings,
} from '@/components/personality/PersonalitySettingsSheet'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDraftEditorReturn {
  /** Always false — entries are created on disk before navigating. */
  isDraft: boolean
  /** Resolved title from the Redux entity. */
  title: string
  /** Resolved blocks from the Redux entity. */
  blocks: Block[]
  /** ID of the Redux entity. */
  entityId: string | undefined
  /** The on-disk writingItemId of the last successful save — used for deletion. */
  savedWritingItemIdRef: React.MutableRefObject<string | null>
  /** Update the title via Redux dispatch. */
  handleTitleChange: (value: string) => void
  /** Change a block's content. */
  handleChange: (blockId: string, content: string) => void
  /** Remove a block. */
  handleDelete: (blockId: string) => void
  /** Insert a new block immediately after the given block and focus it. */
  handleAddBlockAfter: (afterId: string) => void
  /** Replace the full block order after a drag-reorder. */
  handleReorder: (reordered: Block[]) => void
  /** Append a new block at the end and focus it. */
  handleAppendBlock: () => void
  /**
   * Change a block's type (and optionally its heading level).
   * For 'text' and 'media' types the level is ignored.
   * Content is preserved across type switches so the user does not lose work.
   */
  handleChangeBlockType: (blockId: string, type: BlockType, level?: Block['level']) => void
  /**
   * Update the media source and alt text of a 'media' block.
   * Passing empty strings for both clears the media.
   */
  handleChangeMedia: (blockId: string, mediaSrc: string, mediaAlt: string) => void
  /** Current AI settings (local state, not stored in Redux between page visits). */
  aiSettings: InferenceSettings
  /** Update AI settings. */
  handleAiSettingsChange: (next: InferenceSettings) => void
  /**
   * The block ID that should receive focus on the next render.
   * Consumed by ContentBlock via `autoFocus`. Reset to null after one render.
   */
  focusBlockId: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serialize blocks to the output format expected by window.workspace.saveOutput/updateOutput.
 * Each block becomes an object with a stable name (UUID), its content, and
 * timestamps. The name is preserved across saves using the block's own `id`.
 */
function serializeBlocksForOutput(
  blocks: Block[]
): Array<{
  name: string
  content: string
  createdAt: string
  updatedAt: string
  blockType?: Block['type']
  blockLevel?: Block['level']
  mediaSrc?: string
  mediaAlt?: string
}> {
  return blocks.map((b) => ({
    name: b.id,
    content: b.content,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    // Only serialize optional fields when they carry meaningful values so the
    // output stays lean for standard 'paragraph' blocks.
    ...(b.type !== 'paragraph' ? { blockType: b.type } : {}),
    ...(b.level !== undefined ? { blockLevel: b.level } : {}),
    ...(b.mediaSrc !== undefined ? { mediaSrc: b.mediaSrc } : {}),
    ...(b.mediaAlt !== undefined ? { mediaAlt: b.mediaAlt } : {}),
  }))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages shared state and side-effects for ContentPage.
 *
 * The entry is always created on disk (via useCreateWriting) before navigation,
 * so this hook only operates in "edit" mode — reading from Redux and auto-saving
 * to disk on changes.
 *
 * Responsibilities:
 *  - Reads entity from Redux, auto-save timer (1 s debounce)
 *  - Block CRUD callbacks via Redux dispatch
 *  - AI settings local state (no persistence to disk — simple defaults)
 *  - focusBlockId management (set on block insert, cleared after one render)
 *
 * Persistence backend: `window.workspace.output` (OutputFilesService via workspace).
 * Each writing is stored as:
 *   <workspace>/output/writings/<YYYY-MM-DD_HHmmss>/config.json   (metadata)
 *   <workspace>/output/writings/<YYYY-MM-DD_HHmmss>/<blockId>.md  (per block)
 *
 * @param id         - Route param (always defined — entries are pre-created).
 * @param _routeBase - Navigation base path (kept for API compatibility).
 */
export function useContentEditor(
  id: string | undefined,
  _routeBase: string
): UseDraftEditorReturn {
  const dispatch = useAppDispatch()

  // ---------------------------------------------------------------------------
  // Redux entity
  // ---------------------------------------------------------------------------
  const entry: WritingEntry | null = useAppSelector(selectWritingEntryById(id ?? ''))

  // Tracks the on-disk writingItemId.
  // Seeded from the existing entity so it survives remounts.
  const savedWritingItemIdRef = useRef<string | null>(entry?.writingItemId ?? null)
  useEffect(() => {
    if (entry?.writingItemId) {
      savedWritingItemIdRef.current = entry.writingItemId
    }
  }, [entry?.writingItemId])

  // ---------------------------------------------------------------------------
  // AI settings — simple local state, not persisted to disk in this system
  // ---------------------------------------------------------------------------
  const [aiSettings, setAiSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)

  // ---------------------------------------------------------------------------
  // focusBlockId — set when a block is inserted; cleared after one render
  // ---------------------------------------------------------------------------
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  useEffect(() => {
    if (!focusBlockId) return
    setFocusBlockId(null)
  }, [focusBlockId])

  // ---------------------------------------------------------------------------
  // Auto-save to disk 1 s after changes via window.workspace.updateOutput
  // ---------------------------------------------------------------------------
  const isFirstEditRender = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!entry) return
    if (isFirstEditRender.current) {
      isFirstEditRender.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const workspace = await window.workspace.getCurrent()
      if (!workspace) return

      const title = entry.title || 'Untitled Writing'
      const currentWritingItemId = savedWritingItemIdRef.current

      if (currentWritingItemId) {
        // Update existing writing item on disk (partial update via output.update)
        try {
          await window.workspace.updateOutput({
            type: 'writings',
            id: currentWritingItemId,
            blocks: serializeBlocksForOutput(entry.blocks),
            metadata: {
              title,
              category: entry.category,
              tags: entry.tags,
              visibility: 'private',
              provider: 'manual',
              model: '',
            },
          })
        } catch (err) {
          console.error('[useDraftEditor] Failed to save writing item:', err)
        }
      } else {
        // First save for an entry that was added to Redux but not yet persisted
        try {
          const result = await window.workspace.saveOutput({
            type: 'writings',
            blocks: serializeBlocksForOutput(entry.blocks),
            metadata: {
              title,
              category: entry.category,
              tags: entry.tags,
              visibility: 'private',
              provider: 'manual',
              model: '',
            },
          })
          savedWritingItemIdRef.current = result.id
          dispatch(setWritingItemId({ entryId: entry.id, writingItemId: result.id }))
        } catch (err) {
          console.error('[useDraftEditor] Failed to create writing item on first save:', err)
        }
      }
    }, 1000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [entry, dispatch])

  // ---------------------------------------------------------------------------
  // Callbacks — always dispatch to Redux
  // ---------------------------------------------------------------------------

  const handleTitleChange = useCallback(
    (value: string) => {
      if (entry) {
        dispatch(updateEntryTitle({ entryId: entry.id, title: value }))
      }
    },
    [entry, dispatch]
  )

  const handleChange = useCallback(
    (blockId: string, content: string) => {
      const now = new Date().toISOString()
      if (entry) {
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: entry.blocks.map((b) =>
              b.id === blockId ? { ...b, content, updatedAt: now } : b
            ),
          })
        )
      }
    },
    [entry, dispatch]
  )

  const handleDelete = useCallback(
    (blockId: string) => {
      if (entry) {
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: entry.blocks.filter((b) => b.id !== blockId),
          })
        )
      }
    },
    [entry, dispatch]
  )

  const handleAddBlockAfter = useCallback(
    (afterId: string) => {
      const newBlock = createBlock()
      if (entry) {
        const index = entry.blocks.findIndex((b) => b.id === afterId)
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: [
              ...entry.blocks.slice(0, index + 1),
              newBlock,
              ...entry.blocks.slice(index + 1),
            ],
          })
        )
      }
      setFocusBlockId(newBlock.id)
    },
    [entry, dispatch]
  )

  const handleReorder = useCallback(
    (reordered: Block[]) => {
      if (entry) {
        dispatch(updateEntryBlocks({ entryId: entry.id, blocks: reordered }))
      }
    },
    [entry, dispatch]
  )

  const handleAppendBlock = useCallback(() => {
    const newBlock = createBlock()
    if (entry) {
      dispatch(
        updateEntryBlocks({ entryId: entry.id, blocks: [...entry.blocks, newBlock] })
      )
    }
    setFocusBlockId(newBlock.id)
  }, [entry, dispatch])

  const handleChangeBlockType = useCallback(
    (blockId: string, type: BlockType, level?: Block['level']) => {
      const now = new Date().toISOString()
      const applyToBlock = (b: Block): Block => {
        if (b.id !== blockId) return b
        const updated: Block = { ...b, type, updatedAt: now }
        // Carry heading level when switching to 'heading'; clear it otherwise.
        if (type === 'heading') {
          updated.level = level ?? 1
        } else {
          delete updated.level
        }
        // Clear media fields when switching away from 'media'.
        if (type !== 'media') {
          delete updated.mediaSrc
          delete updated.mediaAlt
        }
        return updated
      }

      if (entry) {
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: entry.blocks.map(applyToBlock),
          })
        )
      }
    },
    [entry, dispatch]
  )

  const handleChangeMedia = useCallback(
    (blockId: string, mediaSrc: string, mediaAlt: string) => {
      const now = new Date().toISOString()
      const applyToBlock = (b: Block): Block =>
        b.id === blockId ? { ...b, mediaSrc, mediaAlt, updatedAt: now } : b

      if (entry) {
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: entry.blocks.map(applyToBlock),
          })
        )
      }
    },
    [entry, dispatch]
  )

  const handleAiSettingsChange = useCallback((next: InferenceSettings) => {
    setAiSettings(next)
  }, [])

  // ---------------------------------------------------------------------------
  // Resolved display values
  // ---------------------------------------------------------------------------
  const title = entry?.title ?? ''
  const blocks = entry?.blocks ?? []

  return {
    isDraft: false,
    title,
    blocks,
    entityId: id,
    savedWritingItemIdRef,
    handleTitleChange,
    handleChange,
    handleDelete,
    handleAddBlockAfter,
    handleReorder,
    handleAppendBlock,
    handleChangeBlockType,
    handleChangeMedia,
    aiSettings,
    handleAiSettingsChange,
    focusBlockId,
  }
}
