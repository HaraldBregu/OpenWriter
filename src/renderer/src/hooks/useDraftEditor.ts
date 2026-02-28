import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { createBlock, type Block } from '@/components/ContentBlock'
import {
  selectWritingEntryById,
  addEntry,
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
  /** True when there is no persisted entity yet (first visit to /new/writing). */
  isDraft: boolean
  /** Resolved title for the current mode (draft local state or Redux entity). */
  title: string
  /** Resolved blocks for the current mode (draft local state or Redux entity). */
  blocks: Block[]
  /** ID of the Redux entity (undefined while in draft mode). */
  entityId: string | undefined
  /** The on-disk writingItemId of the last successful save — used for deletion. */
  savedWritingItemIdRef: React.MutableRefObject<string | null>
  /** Update the title — routes to local draft state or a Redux dispatch automatically. */
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
    // output stays lean for standard 'text' blocks.
    ...(b.type !== 'text' ? { blockType: b.type } : {}),
    ...(b.level !== undefined ? { blockLevel: b.level } : {}),
    ...(b.mediaSrc !== undefined ? { mediaSrc: b.mediaSrc } : {}),
    ...(b.mediaAlt !== undefined ? { mediaAlt: b.mediaAlt } : {}),
  }))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages shared state and side-effects for NewWritingPage.
 *
 * Responsibilities:
 *  - Draft mode: local title/blocks state, auto-commit timer (1 s after first content)
 *  - Edit mode: reads entity from Redux, auto-save timer (1 s debounce)
 *  - Draft key reset: detects "New Writing" being clicked again via navigation state
 *  - Block CRUD callbacks — routes to draft local state or Redux dispatch based on mode
 *  - AI settings local state (no persistence to disk — simple defaults)
 *  - focusBlockId management (set on block insert, cleared after one render)
 *
 * Persistence backend: `window.workspace.output` (OutputFilesService via workspace).
 * Each writing is stored as:
 *   <workspace>/output/writings/<YYYY-MM-DD_HHmmss>/config.json   (metadata)
 *   <workspace>/output/writings/<YYYY-MM-DD_HHmmss>/<blockId>.md  (per block)
 *
 * @param id         - Route param. Undefined means draft mode.
 * @param routeBase  - Navigation base path, e.g. '/new/writing'
 */
export function useDraftEditor(
  id: string | undefined,
  routeBase: string
): UseDraftEditorReturn {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const isDraft = id === undefined

  // ---------------------------------------------------------------------------
  // Redux entity
  // ---------------------------------------------------------------------------
  const entry: WritingEntry | null = useAppSelector(selectWritingEntryById(id ?? ''))

  // ---------------------------------------------------------------------------
  // Draft state
  // ---------------------------------------------------------------------------
  const draftIdRef = useRef(crypto.randomUUID())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([createBlock()])
  const committedRef = useRef(false)

  // Tracks the on-disk writingItemId for both modes.
  // Seeded from the existing entity so it survives remounts.
  const savedWritingItemIdRef = useRef<string | null>(entry?.writingItemId ?? null)
  useEffect(() => {
    if (!isDraft && entry?.writingItemId) {
      savedWritingItemIdRef.current = entry.writingItemId
    }
  }, [isDraft, entry?.writingItemId])

  // ---------------------------------------------------------------------------
  // Draft key reset — fires when the user clicks "New Writing" again while
  // already on the /new/writing route (navigation state carries a new draftKey)
  // ---------------------------------------------------------------------------
  const draftKey = (location.state as { draftKey?: number } | null)?.draftKey ?? 0
  const prevDraftKeyRef = useRef(draftKey)
  useEffect(() => {
    if (!isDraft) return
    if (prevDraftKeyRef.current === draftKey) return
    prevDraftKeyRef.current = draftKey
    setDraftTitle('')
    setDraftBlocks([createBlock()])
    draftIdRef.current = crypto.randomUUID()
    committedRef.current = false
    savedWritingItemIdRef.current = null
  }, [isDraft, draftKey])

  // ---------------------------------------------------------------------------
  // AI settings — simple local state, not persisted to disk in this system
  // ---------------------------------------------------------------------------
  const [aiSettings, setAiSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)
  // Keep a ref so the async auto-save timer always reads the latest value
  const aiSettingsRef = useRef(aiSettings)
  aiSettingsRef.current = aiSettings

  // ---------------------------------------------------------------------------
  // focusBlockId — set when a block is inserted; cleared after one render
  // ---------------------------------------------------------------------------
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  useEffect(() => {
    if (!focusBlockId) return
    setFocusBlockId(null)
  }, [focusBlockId])

  // ---------------------------------------------------------------------------
  // Draft mode: auto-commit to Redux + disk on first real content (1 s delay)
  // Writes to window.workspace.saveOutput (workspace-backed OutputFilesService).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isDraft || committedRef.current) return

    const hasContent = draftTitle.trim() || draftBlocks.some((b) => b.content.trim())
    if (!hasContent) return

    const timer = setTimeout(async () => {
      if (committedRef.current) return
      committedRef.current = true

      const workspace = await window.workspace.getCurrent()
      if (!workspace) return

      const now = new Date().toISOString()
      const entryId = draftIdRef.current

      // Create on disk first via workspace-backed output service
      let result: { id: string; path: string; savedAt: number }
      try {
        result = await window.workspace.saveOutput({
          type: 'writings',
          blocks: serializeBlocksForOutput(draftBlocks),
          metadata: {
            title: draftTitle || 'Untitled Writing',
            category: 'writing',
            tags: [],
            visibility: 'private',
            provider: 'manual',
            model: '',
          },
        })
      } catch (err) {
        console.error('[useDraftEditor] Failed to create writing item on disk:', err)
        committedRef.current = false
        return
      }

      savedWritingItemIdRef.current = result.id

      // Commit to Redux only after disk write succeeds
      dispatch(
        addEntry({
          id: entryId,
          writingItemId: result.id,
          title: draftTitle,
          blocks: draftBlocks,
          category: 'writing',
          tags: [],
          createdAt: now,
          updatedAt: now,
          savedAt: result.savedAt,
        })
      )

      navigate(`${routeBase}/${entryId}`, { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDraft, draftTitle, draftBlocks, dispatch, navigate, routeBase])

  // ---------------------------------------------------------------------------
  // Edit mode: auto-save to disk 1 s after changes via window.workspace.updateOutput
  // ---------------------------------------------------------------------------
  const isFirstEditRender = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDraft || !entry) return
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
  }, [isDraft, entry, dispatch]) // aiSettings accessed via ref; entry covers block/title changes

  // ---------------------------------------------------------------------------
  // Callbacks — route to draft local state or Redux dispatch based on isDraft
  // ---------------------------------------------------------------------------

  const handleTitleChange = useCallback(
    (value: string) => {
      if (isDraft) {
        setDraftTitle(value)
      } else if (entry) {
        dispatch(updateEntryTitle({ entryId: entry.id, title: value }))
      }
    },
    [isDraft, entry, dispatch]
  )

  const handleChange = useCallback(
    (blockId: string, content: string) => {
      const now = new Date().toISOString()
      if (isDraft) {
        setDraftBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, content, updatedAt: now } : b))
        )
      } else if (entry) {
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
    [isDraft, entry, dispatch]
  )

  const handleDelete = useCallback(
    (blockId: string) => {
      if (isDraft) {
        setDraftBlocks((prev) => prev.filter((b) => b.id !== blockId))
      } else if (entry) {
        dispatch(
          updateEntryBlocks({
            entryId: entry.id,
            blocks: entry.blocks.filter((b) => b.id !== blockId),
          })
        )
      }
    },
    [isDraft, entry, dispatch]
  )

  const handleAddBlockAfter = useCallback(
    (afterId: string) => {
      const newBlock = createBlock()
      if (isDraft) {
        setDraftBlocks((prev) => {
          const index = prev.findIndex((b) => b.id === afterId)
          return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
        })
      } else if (entry) {
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
    [isDraft, entry, dispatch]
  )

  const handleReorder = useCallback(
    (reordered: Block[]) => {
      if (isDraft) {
        setDraftBlocks(reordered)
      } else if (entry) {
        dispatch(updateEntryBlocks({ entryId: entry.id, blocks: reordered }))
      }
    },
    [isDraft, entry, dispatch]
  )

  const handleAppendBlock = useCallback(() => {
    const newBlock = createBlock()
    if (isDraft) {
      setDraftBlocks((prev) => [...prev, newBlock])
    } else if (entry) {
      dispatch(
        updateEntryBlocks({ entryId: entry.id, blocks: [...entry.blocks, newBlock] })
      )
    }
    setFocusBlockId(newBlock.id)
  }, [isDraft, entry, dispatch])

  const handleAiSettingsChange = useCallback((next: InferenceSettings) => {
    setAiSettings(next)
  }, [])

  // ---------------------------------------------------------------------------
  // Resolved display values
  // ---------------------------------------------------------------------------
  const title = isDraft ? draftTitle : (entry?.title ?? '')
  const blocks = isDraft ? draftBlocks : (entry?.blocks ?? [])

  return {
    isDraft,
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
    aiSettings,
    handleAiSettingsChange,
    focusBlockId,
  }
}
