import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye, Settings2, Share2, MoreHorizontal, Copy, Trash2 } from 'lucide-react'
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
  selectPostById,
  addPost,
  setPostOutputId,
  updatePostBlocks,
  updatePostTitle,
  deletePost,
  updatePostInferenceSettings,
} from '../store/postsSlice'
import { saveOutputItem, updateOutputItem, deleteOutputItem, selectOutputItemById } from '@/store/outputSlice'
import {
  PersonalitySettingsPanel,
  DEFAULT_INFERENCE_SETTINGS,
  type InferenceSettings,
} from '@/components/personality/PersonalitySettingsSheet'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const isDraft = id === undefined

  // Redux post (edit mode only)
  const post = useAppSelector(selectPostById(id ?? ''))

  // Draft state (used only when no id yet)
  const draftIdRef = useRef(crypto.randomUUID())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([createBlock()])
  const committedRef = useRef(false)

  // Tracks the output folder ID of the last successful save (both modes).
  // Seeded from post.outputId so it survives component remounts.
  const savedOutputIdRef = useRef<string | null>(post?.outputId ?? null)

  // Reset draft whenever "New Post" is clicked again (navigation state key changes)
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
  // ID of the block that should receive focus on its next render (set when a
  // new block is inserted via Enter). Cleared after one render so subsequent
  // re-renders do not re-focus the same block.
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  useEffect(() => {
    if (!focusBlockId) return
    setFocusBlockId(null)
  }, [focusBlockId])

  // Restore inference settings from the saved output config when editing an existing post
  const outputItem = useAppSelector(selectOutputItemById('posts', post?.outputId ?? ''))
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
  }, [isDraft, outputItem?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

      const workspace = await window.workspace.getCurrent()
      if (!workspace) return

      const now = Date.now()
      const newPost = {
        id: draftIdRef.current,
        title: draftTitle,
        blocks: draftBlocks,
        category: 'technology',
        tags: [],
        visibility: 'public',
        createdAt: now,
        updatedAt: now,
      }

      dispatch(addPost(newPost))

      const saved = await dispatch(saveOutputItem({
        type: 'posts',
        title: draftTitle || 'Untitled Post',
        blocks: draftBlocks.map((b) => ({
          name: b.id,
          content: b.content,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
        visibility: 'private',
        provider: aiSettings.providerId,
        model: aiSettings.modelId,
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.maxTokens,
        reasoning: aiSettings.reasoning,
      })).unwrap()
      savedOutputIdRef.current = saved.id
      dispatch(setPostOutputId({ postId: draftIdRef.current, outputId: saved.id }))

      navigate(`/new/post/${draftIdRef.current}`, { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDraft, draftTitle, draftBlocks, dispatch, navigate])

  // ---------------------------------------------------------------------------
  // Edit mode: auto-save to output 1s after changes
  // ---------------------------------------------------------------------------
  const isFirstEditRender = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDraft || !post) return
    if (isFirstEditRender.current) {
      isFirstEditRender.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const workspace = await window.workspace.getCurrent()
      if (!workspace) return
      const outputBlocks = post.blocks.map((b) => ({
        name: b.id,
        content: b.content,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
      const title = post.title || 'Untitled Post'
      const outputId = savedOutputIdRef.current
      if (outputId) {
        dispatch(updateOutputItem({
          id: outputId,
          type: 'posts',
          title,
          blocks: outputBlocks,
          visibility: 'private',
          provider: aiSettings.providerId,
          model: aiSettings.modelId,
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
          reasoning: aiSettings.reasoning,
        }))
      } else {
        const saved = await dispatch(saveOutputItem({
          type: 'posts',
          title,
          blocks: outputBlocks,
          visibility: 'private',
          provider: aiSettings.providerId,
          model: aiSettings.modelId,
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
          reasoning: aiSettings.reasoning,
        })).unwrap()
        savedOutputIdRef.current = saved.id
        if (post) dispatch(setPostOutputId({ postId: post.id, outputId: saved.id }))
      }
    }, 1000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [isDraft, post, aiSettings, dispatch])

  // ---------------------------------------------------------------------------
  // Edit mode callbacks
  // ---------------------------------------------------------------------------
  const handleChange = useCallback((blockId: string, content: string) => {
    if (!post) return
    const now = new Date().toISOString()
    const updated = post.blocks.map((b) =>
      b.id === blockId ? { ...b, content, updatedAt: now } : b
    )
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }, [post, dispatch])

  const handleDelete = useCallback((blockId: string) => {
    if (!post) return
    const updated = post.blocks.filter((b) => b.id !== blockId)
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }, [post, dispatch])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    if (!post) return
    const index = post.blocks.findIndex((b) => b.id === afterId)
    const newBlock: Block = createBlock()
    const updated = [...post.blocks.slice(0, index + 1), newBlock, ...post.blocks.slice(index + 1)]
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
    setFocusBlockId(newBlock.id)
  }, [post, dispatch])

  const handleReorder = useCallback((reordered: Block[]) => {
    if (!post) return
    dispatch(updatePostBlocks({ postId: post.id, blocks: reordered }))
  }, [post, dispatch])

  // ---------------------------------------------------------------------------
  // Draft mode callbacks
  // ---------------------------------------------------------------------------
  const handleDraftChange = useCallback((blockId: string, content: string) => {
    const now = new Date().toISOString()
    setDraftBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content, updatedAt: now } : b))
    )
  }, [])

  const handleDraftDelete = useCallback((blockId: string) => {
    setDraftBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }, [])

  const handleDraftAddBlockAfter = useCallback((afterId: string) => {
    const newBlock: Block = createBlock()
    setDraftBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterId)
      return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
    })
    setFocusBlockId(newBlock.id)
  }, [])

  const handleDraftReorder = useCallback((reordered: Block[]) => {
    setDraftBlocks(reordered)
  }, [])

  const handleAiSettingsChange = useCallback((next: InferenceSettings) => {
    setAiSettings(next)
    if (!isDraft && post) {
      dispatch(updatePostInferenceSettings({
        postId: post.id,
        provider: next.providerId,
        model: next.modelId,
        temperature: next.temperature,
        maxTokens: next.maxTokens,
        reasoning: next.reasoning,
      }))
    }
  }, [isDraft, post, dispatch])

  // ---------------------------------------------------------------------------
  // Guard: existing post not found in Redux
  // ---------------------------------------------------------------------------
  if (!isDraft && !post) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>{t('post.notFound')}</p>
      </div>
    )
  }

  // Resolve display values for both modes
  const title = isDraft ? draftTitle : post!.title
  const blocks = isDraft ? draftBlocks : post!.blocks

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
        <input
          type="text"
          value={title}
          onChange={(e) =>
            isDraft
              ? setDraftTitle(e.target.value)
              : dispatch(updatePostTitle({ postId: post!.id, title: e.target.value }))
          }
          placeholder={t('post.titlePlaceholder')}
          className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full"
        />
        <div className="flex items-center gap-3">
          <AppDropdownMenu>
            <AppDropdownMenuTrigger asChild>
              <AppButton
                type="button"
                variant="outline"
                size="icon"
                title={t('common.moreOptions')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </AppButton>
            </AppDropdownMenuTrigger>
            <AppDropdownMenuContent align="end">
              <AppDropdownMenuItem>
                <Eye className="h-4 w-4" />
                {t('common.preview')}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Download className="h-4 w-4" />
                {t('common.download')}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Share2 className="h-4 w-4" />
                {t('common.share')}
              </AppDropdownMenuItem>
              <AppDropdownMenuSeparator />
              <AppDropdownMenuItem>
                <Copy className="h-4 w-4" />
                {t('common.duplicate')}
              </AppDropdownMenuItem>
              {!isDraft && (
                <AppDropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    const outputId = post!.outputId ?? savedOutputIdRef.current
                    if (outputId) dispatch(deleteOutputItem({ type: 'posts', id: outputId }))
                    dispatch(deletePost(post!.id))
                    navigate('/home')
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.moveToTrash')}
                </AppDropdownMenuItem>
              )}
            </AppDropdownMenuContent>
          </AppDropdownMenu>
          <AppButton
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? t('common.hideSettings') : t('common.showSettings')}
          >
            <Settings2 className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-background">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">
            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={isDraft ? handleDraftReorder : handleReorder}
              className="flex flex-col gap-0"
            >
              {blocks.map((block, index) => {
                const shouldFocus = focusBlockId === block.id
                return (
                  <ContentBlock
                    key={block.id}
                    block={block}
                    isOnly={blocks.length === 1}
                    isLast={index === blocks.length - 1}
                    onChange={isDraft ? handleDraftChange : handleChange}
                    onDelete={isDraft ? handleDraftDelete : handleDelete}
                    onAdd={isDraft ? handleDraftAddBlockAfter : handleAddBlockAfter}
                    placeholder={t('writing.typeHere')}
                    autoFocus={shouldFocus}
                  />
                )
              })}
            </Reorder.Group>
            <InsertBlockPlaceholder
              onClick={() => {
                if (isDraft) {
                  setDraftBlocks((prev) => [...prev, createBlock()])
                } else if (post) {
                  dispatch(updatePostBlocks({ postId: post.id, blocks: [...post.blocks, createBlock()] }))
                }
              }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <PersonalitySettingsPanel
            settings={aiSettings}
            onSettingsChange={handleAiSettingsChange}
          />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end px-8 py-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {t('post.charactersAndWords', { chars: charCount, words: wordCount })}
        </span>
      </div>
    </div>
  )
}

export default NewPostPage
