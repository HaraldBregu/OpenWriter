import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Download, Eye, Settings2, Share2, MoreHorizontal, Copy, Trash2, PenLine } from 'lucide-react'
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
  AppTextarea,
} from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectWritingById,
  addWriting,
  setWritingOutputId,
  updateWritingContent,
  updateWritingTitle,
  deleteWriting
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
  const [draftContent, setDraftContent] = useState('')
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
    setDraftContent('')
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

    const hasContent = draftTitle.trim() || draftContent.trim()
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
        content: draftContent,
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
        content: draftContent,
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
  }, [isDraft, draftTitle, draftContent, dispatch, navigate])

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
      const content = writing.content
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
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleContentChange = useCallback((value: string) => {
    if (isDraft) {
      setDraftContent(value)
    } else if (writing) {
      dispatch(updateWritingContent({ writingId: writing.id, content: value }))
    }
  }, [isDraft, writing, dispatch])

  const handleTitleChange = useCallback((value: string) => {
    if (isDraft) {
      setDraftTitle(value)
    } else if (writing) {
      dispatch(updateWritingTitle({ writingId: writing.id, title: value }))
    }
  }, [isDraft, writing, dispatch])

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
  const content = isDraft ? draftContent : writing!.content

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
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
          <div className="max-w-2xl mx-auto px-6 py-10">
            <AppTextarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing..."
              className="w-full min-h-[60vh] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 text-base leading-relaxed p-0"
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
