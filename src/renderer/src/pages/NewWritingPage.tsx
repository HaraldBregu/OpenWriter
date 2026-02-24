import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Download, Eye, Settings2, Share2, MoreHorizontal, Copy, Trash2, PenLine } from 'lucide-react'
import { Reorder } from 'framer-motion'
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@/components/app'
import { ContentBlock, InsertBlockPlaceholder, createBlock, type Block } from '@/components/ContentBlock'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectWritingById,
  addWriting,
  setWritingOutputId,
  updateWritingBlocks,
  updateWritingTitle,
  deleteWriting,
} from '../store/writingsSlice'
import { saveOutputItem, updateOutputItem, deleteOutputItem } from '@/store/outputSlice'
import {
  PersonalitySettingsPanel,
  DEFAULT_INFERENCE_SETTINGS,
} from '@/components/personality/PersonalitySettingsSheet'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewWritingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const isDraft = id === undefined

  // Redux writing (edit mode only)
  const writing = useAppSelector(selectWritingById(id ?? ''))

  // Draft state (used only when no id yet)
  const draftIdRef = useRef(crypto.randomUUID())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([createBlock()])
  const committedRef = useRef(false)

  // Tracks the output folder ID of the last successful save (both modes).
  // Seeded from writing.outputId so it survives component remounts.
  const savedOutputIdRef = useRef<string | null>(writing?.outputId ?? null)

  // Reset draft whenever "New Writing" is clicked again (navigation state key changes)
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

  const [showSidebar, setShowSidebar] = useState(true)
  const [aiSettings, setAiSettings] = useState(DEFAULT_INFERENCE_SETTINGS)

  // ---------------------------------------------------------------------------
  // Draft mode: commit to Redux + save to output on first real content
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isDraft || committedRef.current) return

    const hasContent = draftTitle.trim() || draftBlocks.some((b) => b.content.trim())
    if (!hasContent) return

    const timer = setTimeout(async () => {
      if (committedRef.current) return
      committedRef.current = true

      const workspace = await window.api.workspaceGetCurrent()
      if (!workspace) return

      const now = Date.now()
      const newWriting = {
        id: draftIdRef.current,
        title: draftTitle,
        blocks: draftBlocks,
        category: 'writing',
        tags: [],
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      }

      dispatch(addWriting(newWriting))

      const saved = await dispatch(saveOutputItem({
        type: 'writings',
        title: draftTitle || 'Untitled Writing',
        content: draftBlocks.map((b) => b.content).join('\n\n'),
        category: 'writing',
        visibility: 'private',
        provider: 'manual',
        model: '',
      })).unwrap()
      savedOutputIdRef.current = saved.id
      dispatch(setWritingOutputId({ writingId: draftIdRef.current, outputId: saved.id }))

      navigate(`/new/writing/${draftIdRef.current}`, { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDraft, draftTitle, draftBlocks, dispatch, navigate])

  // ---------------------------------------------------------------------------
  // Edit mode: auto-save to output 1s after changes
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
      const workspace = await window.api.workspaceGetCurrent()
      if (!workspace) return
      const content = writing.blocks.map((b) => b.content).join('\n\n')
      const title = writing.title || 'Untitled Writing'
      const outputId = savedOutputIdRef.current
      if (outputId) {
        dispatch(updateOutputItem({
          id: outputId,
          type: 'writings',
          title,
          content,
          category: 'writing',
          visibility: 'private',
          provider: 'manual',
          model: '',
        }))
      } else {
        const saved = await dispatch(saveOutputItem({
          type: 'writings',
          title,
          content,
          category: 'writing',
          visibility: 'private',
          provider: 'manual',
          model: '',
        })).unwrap()
        savedOutputIdRef.current = saved.id
        if (writing) dispatch(setWritingOutputId({ writingId: writing.id, outputId: saved.id }))
      }
    }, 1000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [isDraft, writing, dispatch])

  // ---------------------------------------------------------------------------
  // Edit mode callbacks
  // ---------------------------------------------------------------------------
  const handleChange = useCallback((blockId: string, content: string) => {
    if (!writing) return
    const updated = writing.blocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    dispatch(updateWritingBlocks({ writingId: writing.id, blocks: updated }))
  }, [writing, dispatch])

  const handleDelete = useCallback((blockId: string) => {
    if (!writing) return
    const updated = writing.blocks.filter((b) => b.id !== blockId)
    dispatch(updateWritingBlocks({ writingId: writing.id, blocks: updated }))
  }, [writing, dispatch])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    if (!writing) return
    const index = writing.blocks.findIndex((b) => b.id === afterId)
    const newBlock: Block = createBlock()
    const updated = [...writing.blocks.slice(0, index + 1), newBlock, ...writing.blocks.slice(index + 1)]
    dispatch(updateWritingBlocks({ writingId: writing.id, blocks: updated }))
  }, [writing, dispatch])

  const handleReorder = useCallback((reordered: Block[]) => {
    if (!writing) return
    dispatch(updateWritingBlocks({ writingId: writing.id, blocks: reordered }))
  }, [writing, dispatch])

  // ---------------------------------------------------------------------------
  // Draft mode callbacks
  // ---------------------------------------------------------------------------
  const handleDraftChange = useCallback((blockId: string, content: string) => {
    setDraftBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content } : b)))
  }, [])

  const handleDraftDelete = useCallback((blockId: string) => {
    setDraftBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }, [])

  const handleDraftAddBlockAfter = useCallback((afterId: string) => {
    setDraftBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterId)
      const newBlock: Block = createBlock()
      return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
    })
  }, [])

  const handleDraftReorder = useCallback((reordered: Block[]) => {
    setDraftBlocks(reordered)
  }, [])

  // ---------------------------------------------------------------------------
  // Guard: existing writing not found in Redux
  // ---------------------------------------------------------------------------
  if (!isDraft && !writing) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Writing not found.</p>
      </div>
    )
  }

  // Resolve display values for both modes
  const title = isDraft ? draftTitle : writing!.title
  const blocks = isDraft ? draftBlocks : writing!.blocks

  const { charCount, wordCount } = useMemo(() => {
    const joined = blocks.map((b) => b.content).join(' ').trim()
    const chars = joined.length
    const words = joined.length === 0 ? 0 : joined.split(/\s+/).filter(Boolean).length
    return { charCount: chars, wordCount: words }
  }, [blocks])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => {
              if (isDraft) {
                setDraftTitle(e.target.value)
              } else {
                dispatch(updateWritingTitle({ writingId: writing!.id, title: e.target.value }))
              }
            }}
            placeholder="Untitled Writing"
            className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <AppDropdownMenu>
            <AppDropdownMenuTrigger asChild>
              <AppButton
                type="button"
                variant="outline"
                size="icon"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </AppButton>
            </AppDropdownMenuTrigger>
            <AppDropdownMenuContent align="end">
              <AppDropdownMenuItem>
                <Eye className="h-4 w-4" />
                Preview
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Download className="h-4 w-4" />
                Download
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Share2 className="h-4 w-4" />
                Share
              </AppDropdownMenuItem>
              <AppDropdownMenuSeparator />
              <AppDropdownMenuItem>
                <Copy className="h-4 w-4" />
                Duplicate
              </AppDropdownMenuItem>
              {!isDraft && (
                <AppDropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    const outputId = writing!.outputId ?? savedOutputIdRef.current
                    if (outputId) dispatch(deleteOutputItem({ type: 'writings', id: outputId }))
                    dispatch(deleteWriting(writing!.id))
                    navigate('/home')
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Move to Trash
                </AppDropdownMenuItem>
              )}
            </AppDropdownMenuContent>
          </AppDropdownMenu>
          <AppButton
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? 'Hide settings' : 'Show settings'}
          >
            <Settings2 className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-background">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">
            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={isDraft ? handleDraftReorder : handleReorder}
              className="flex flex-col gap-0"
            >
              {blocks.map((block) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isOnly={blocks.length === 1}
                  onChange={isDraft ? handleDraftChange : handleChange}
                  onDelete={isDraft ? handleDraftDelete : handleDelete}
                  onAdd={isDraft ? handleDraftAddBlockAfter : handleAddBlockAfter}
                  placeholder="Start writing..."
                />
              ))}
            </Reorder.Group>
            <InsertBlockPlaceholder
              onClick={() => {
                if (isDraft) {
                  setDraftBlocks((prev) => [...prev, createBlock()])
                } else if (writing) {
                  dispatch(updateWritingBlocks({ writingId: writing.id, blocks: [...writing.blocks, createBlock()] }))
                }
              }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <PersonalitySettingsPanel
            settings={aiSettings}
            onSettingsChange={setAiSettings}
          />
        )}
      </div>
    </div>
  )
}

export default NewWritingPage
