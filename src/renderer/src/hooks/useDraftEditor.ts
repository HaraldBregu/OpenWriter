import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { createBlock, type Block } from '@/components/ContentBlock'
import {
  selectWritingById,
  addWriting,
  setWritingOutputId,
  updateWritingBlocks,
  updateWritingTitle,
  updateWritingInferenceSettings,
} from '@/store/writingsSlice'
import { saveOutputItem, updateOutputItem, selectOutputItemById } from '@/store/outputSlice'
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
  /** Output folder ID of the last successful save — exposed so the page can delete it. */
  savedOutputIdRef: React.MutableRefObject<string | null>
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
  /** Update AI settings — also persists to Redux when in edit mode. */
  handleAiSettingsChange: (next: InferenceSettings) => void
  /**
   * The block ID that should receive focus on the next render.
   * `ContentBlock` consumes this via `autoFocus`. It is reset to null after
   * one render so the same block is not re-focused on subsequent re-renders.
   */
  focusBlockId: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the shared state and side-effects for NewWritingPage.
 *
 * Responsibilities:
 *  - Draft mode: local title/blocks state, auto-commit timer (1 s after first content)
 *  - Edit mode: reads entity from Redux, auto-save timer (1 s debounce)
 *  - Draft key reset: detects "New Writing" being clicked again via navigation state
 *  - Block CRUD callbacks — routes to draft local state or Redux dispatch based on mode
 *  - AI settings local state with restore from output item on edit mode mount
 *  - focusBlockId management (set on block insert, cleared after one render)
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
  // Redux entity selectors
  // ---------------------------------------------------------------------------
  const writing = useAppSelector(selectWritingById(id ?? ''))

  const outputId = writing?.outputId ?? ''
  const outputItem = useAppSelector(selectOutputItemById('writings', outputId))

  // ---------------------------------------------------------------------------
  // Draft state
  // ---------------------------------------------------------------------------
  const draftIdRef = useRef(crypto.randomUUID())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([createBlock()])
  const committedRef = useRef(false)

  // Tracks the output folder ID for both modes.
  // Seeded from the entity's outputId so it survives remounts.
  const savedOutputIdRef = useRef<string | null>(writing?.outputId ?? null)

  // ---------------------------------------------------------------------------
  // Draft key reset — fires when the user clicks "New Writing" again
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
    savedOutputIdRef.current = null
  }, [isDraft, draftKey])

  // ---------------------------------------------------------------------------
  // AI settings
  // ---------------------------------------------------------------------------
  const [aiSettings, setAiSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)

  // Restore inference settings from the saved output config when opening an existing entity.
  useEffect(() => {
    if (!isDraft && outputItem) {
      setAiSettings({
        providerId: outputItem.provider || DEFAULT_INFERENCE_SETTINGS.providerId,
        modelId: outputItem.model || DEFAULT_INFERENCE_SETTINGS.modelId,
        temperature: outputItem.temperature ?? DEFAULT_INFERENCE_SETTINGS.temperature,
        maxTokens: outputItem.maxTokens !== undefined ? outputItem.maxTokens : DEFAULT_INFERENCE_SETTINGS.maxTokens,
        reasoning: outputItem.reasoning ?? DEFAULT_INFERENCE_SETTINGS.reasoning,
      })
    }
    // outputItem.id is a stable proxy for "a different output item was loaded"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, outputItem?.id])

  // ---------------------------------------------------------------------------
  // focusBlockId — set when a block is inserted; cleared after one render
  // ---------------------------------------------------------------------------
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  useEffect(() => {
    if (!focusBlockId) return
    setFocusBlockId(null)
  }, [focusBlockId])

  // ---------------------------------------------------------------------------
  // Draft mode: auto-commit to Redux + save output on first real content
  // ---------------------------------------------------------------------------
  // Capture aiSettings in a ref so the async timer always sees the latest value
  // without needing aiSettings in the dependency array (which would reset the
  // timer on every settings change before the user has typed anything).
  const aiSettingsRef = useRef(aiSettings)
  aiSettingsRef.current = aiSettings

  useEffect(() => {
    if (!isDraft || committedRef.current) return

    const hasContent = draftTitle.trim() || draftBlocks.some((b) => b.content.trim())
    if (!hasContent) return

    const timer = setTimeout(async () => {
      if (committedRef.current) return
      committedRef.current = true

      const workspace = await window.workspace.getCurrent()
      if (!workspace) return

      const now = Date.now()
      const settings = aiSettingsRef.current

      dispatch(addWriting({
        id: draftIdRef.current,
        title: draftTitle,
        blocks: draftBlocks,
        category: 'writing',
        tags: [],
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      }))
      const saved = await dispatch(saveOutputItem({
        type: 'writings',
        title: draftTitle || 'Untitled Writing',
        blocks: draftBlocks.map((b) => ({ name: b.id, content: b.content, createdAt: b.createdAt, updatedAt: b.updatedAt })),
        category: 'writing',
        visibility: 'private',
        provider: settings.providerId,
        model: settings.modelId,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        reasoning: settings.reasoning,
      })).unwrap()
      savedOutputIdRef.current = saved.id
      dispatch(setWritingOutputId({ writingId: draftIdRef.current, outputId: saved.id }))

      navigate(`${routeBase}/${draftIdRef.current}`, { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDraft, draftTitle, draftBlocks, dispatch, navigate, routeBase])

  // ---------------------------------------------------------------------------
  // Edit mode: auto-save to output 1 s after changes
  // ---------------------------------------------------------------------------
  const isFirstEditRender = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDraft || !writing) return
    if (isFirstEditRender.current) {
      isFirstEditRender.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const workspace = await window.workspace.getCurrent()
      if (!workspace) return

      const outputBlocks = writing.blocks.map((b) => ({
        name: b.id,
        content: b.content,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
      const settings = aiSettingsRef.current
      const title = writing.title || 'Untitled Writing'
      const currentOutputId = savedOutputIdRef.current

      const sharedPayload = {
        title,
        blocks: outputBlocks,
        visibility: 'private' as const,
        category: 'writing',
        provider: settings.providerId,
        model: settings.modelId,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        reasoning: settings.reasoning,
      }

      if (currentOutputId) {
        dispatch(updateOutputItem({
          id: currentOutputId,
          type: 'writings',
          ...sharedPayload,
        }))
      } else {
        const saved = await dispatch(saveOutputItem({
          type: 'writings',
          ...sharedPayload,
        })).unwrap()
        savedOutputIdRef.current = saved.id
        dispatch(setWritingOutputId({ writingId: writing.id, outputId: saved.id }))
      }
    }, 1000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [isDraft, writing, dispatch]) // aiSettings accessed via ref; writing covers block/title changes

  // ---------------------------------------------------------------------------
  // Callbacks — all route to draft local state or Redux dispatch based on isDraft
  // ---------------------------------------------------------------------------

  const handleTitleChange = useCallback((value: string) => {
    if (isDraft) {
      setDraftTitle(value)
    } else if (writing) {
      dispatch(updateWritingTitle({ writingId: writing.id, title: value }))
    }
  }, [isDraft, writing, dispatch])

  const handleChange = useCallback((blockId: string, content: string) => {
    const now = new Date().toISOString()
    if (isDraft) {
      setDraftBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, content, updatedAt: now } : b))
    } else if (writing) {
      dispatch(updateWritingBlocks({ writingId: writing.id, blocks: writing.blocks.map((b) => b.id === blockId ? { ...b, content, updatedAt: now } : b) }))
    }
  }, [isDraft, writing, dispatch])

  const handleDelete = useCallback((blockId: string) => {
    if (isDraft) {
      setDraftBlocks((prev) => prev.filter((b) => b.id !== blockId))
    } else if (writing) {
      dispatch(updateWritingBlocks({ writingId: writing.id, blocks: writing.blocks.filter((b) => b.id !== blockId) }))
    }
  }, [isDraft, writing, dispatch])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    const newBlock = createBlock()
    if (isDraft) {
      setDraftBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === afterId)
        return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
      })
    } else if (writing) {
      const index = writing.blocks.findIndex((b) => b.id === afterId)
      dispatch(updateWritingBlocks({ writingId: writing.id, blocks: [...writing.blocks.slice(0, index + 1), newBlock, ...writing.blocks.slice(index + 1)] }))
    }
    setFocusBlockId(newBlock.id)
  }, [isDraft, writing, dispatch])

  const handleReorder = useCallback((reordered: Block[]) => {
    if (isDraft) {
      setDraftBlocks(reordered)
    } else if (writing) {
      dispatch(updateWritingBlocks({ writingId: writing.id, blocks: reordered }))
    }
  }, [isDraft, writing, dispatch])

  const handleAppendBlock = useCallback(() => {
    const newBlock = createBlock()
    if (isDraft) {
      setDraftBlocks((prev) => [...prev, newBlock])
    } else if (writing) {
      dispatch(updateWritingBlocks({ writingId: writing.id, blocks: [...writing.blocks, newBlock] }))
    }
    setFocusBlockId(newBlock.id)
  }, [isDraft, writing, dispatch])

  const handleAiSettingsChange = useCallback((next: InferenceSettings) => {
    setAiSettings(next)
    if (!isDraft && writing) {
      dispatch(updateWritingInferenceSettings({
        writingId: writing.id,
        provider: next.providerId,
        model: next.modelId,
        temperature: next.temperature,
        maxTokens: next.maxTokens,
        reasoning: next.reasoning,
      }))
    }
  }, [isDraft, writing, dispatch])

  // ---------------------------------------------------------------------------
  // Resolved display values
  // ---------------------------------------------------------------------------
  const title = isDraft ? draftTitle : (writing?.title ?? '')
  const blocks = isDraft ? draftBlocks : (writing?.blocks ?? [])

  return {
    isDraft,
    title,
    blocks,
    entityId: id,
    savedOutputIdRef,
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
