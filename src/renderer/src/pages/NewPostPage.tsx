import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Eye, X, Settings2, Share2, MoreHorizontal, Copy, Trash2, Brain, Cpu, Zap, Sparkles } from 'lucide-react'
import { Reorder } from 'framer-motion'
import {
  AppLabel,
  AppButton,
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
  AppSlider,
  AppInput,
} from '@/components/app'
import { ContentBlock, createBlock, type Block } from '@/components/ContentBlock'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectPostById,
  updatePostBlocks,
  updatePostTitle,
  deletePost
} from '../store/postsSlice'
import { saveOutputItem } from '@/store/outputSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  // Stable selector instance — created once per render cycle; safe because id
  // is stable for the lifetime of this mounted page.
  const post = useAppSelector(selectPostById(id ?? ''))

  // IMPORTANT: All hooks must be called before any early returns
  // to maintain consistent hook ordering between renders
  const [showSidebar, setShowSidebar] = useState(true)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // AI Settings state
  const [reasoningModel, setReasoningModel] = useState('gpt-4')
  const [modelName, setModelName] = useState('claude-sonnet-4.5')
  const [temperature, setTemperature] = useState('0.7')
  const [customTemperature, setCustomTemperature] = useState(1.0)
  const [maxChars, setMaxChars] = useState('')

  // Callbacks must also be before early return to maintain hook order
  const handleChange = useCallback((blockId: string, content: string) => {
    if (!post) return
    const blocks = post.blocks
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }, [post, dispatch])

  const handleDelete = useCallback((blockId: string) => {
    if (!post) return
    const blocks = post.blocks
    const updated = blocks.filter((b) => b.id !== blockId)
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }, [post, dispatch])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    if (!post) return
    const blocks = post.blocks
    const index = blocks.findIndex((b) => b.id === afterId)
    const newBlock: Block = createBlock()
    const updated = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }, [post, dispatch])

  const handleReorder = useCallback((reordered: Block[]) => {
    if (!post) return
    dispatch(updatePostBlocks({ postId: post.id, blocks: reordered }))
  }, [post, dispatch])

  const handleSave = useCallback(async () => {
    if (!post) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const markdownContent = post.blocks.map((b) => b.content).join('\n\n')
      const saved = await dispatch(saveOutputItem({
        type: 'posts',
        title: post.title || 'Untitled Post',
        content: markdownContent,
        visibility: 'private',
        provider: 'manual',
        model: ''
      })).unwrap()
      setLastSavedId(saved.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }, [post, dispatch])

  // Guard: if the post doesn't exist in Redux (e.g. navigated directly to a
  // stale URL or deleted externally), show a fallback rather than crashing.
  if (!post) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Post not found.</p>
      </div>
    )
  }

  const { blocks } = post

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <input
          type="text"
          value={post.title}
          onChange={(e) => dispatch(updatePostTitle({ postId: post.id, title: e.target.value }))}
          placeholder="New post"
          className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full"
        />
        <div className="flex items-center gap-3">
          <AppButton
            type="button"
            variant={lastSavedId ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : lastSavedId ? 'Saved' : 'Save'}
          </AppButton>
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
              <AppDropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  dispatch(deletePost(post.id))
                  navigate('/home')
                }}
              >
                <Trash2 className="h-4 w-4" />
                Move to Trash
              </AppDropdownMenuItem>
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

      {saveError && (
        <div className="px-8 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
          {saveError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-background">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">

            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={handleReorder}
              className="flex flex-col gap-0"
            >
              {blocks.map((block) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isOnly={blocks.length === 1}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onAdd={handleAddBlockAfter}
                  placeholder={`Write something...`}
                />
              ))}
            </Reorder.Group>

          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="flex h-full w-[280px] shrink-0 flex-col border-l border-border bg-background overflow-y-auto">
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">AI Settings</h2>
              <AppButton
                type="button"
                onClick={() => setShowSidebar(false)}
                variant="ghost"
                size="icon"
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>
            <div className="p-4 space-y-5">

              {/* AI Assistant */}
              <div className="space-y-1.5">
                <AppLabel className="text-xs flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  AI Assistant
                </AppLabel>
                <AppSelect value={modelName} onValueChange={setModelName}>
                  <AppSelectTrigger className="w-full h-8 text-xs">
                    <AppSelectValue placeholder="Choose your assistant" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="claude-sonnet-4.5">Claude (Fast & Smart)</AppSelectItem>
                    <AppSelectItem value="claude-opus-4">Claude (Most Capable)</AppSelectItem>
                    <AppSelectItem value="claude-haiku-4">Claude (Quick Responses)</AppSelectItem>
                    <AppSelectItem value="gpt-4-turbo">ChatGPT (Latest)</AppSelectItem>
                    <AppSelectItem value="gpt-4">ChatGPT (Classic)</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

              {/* Thinking Style */}
              <div className="space-y-1.5">
                <AppLabel className="text-xs flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  Thinking Style
                </AppLabel>
                <AppSelect value={reasoningModel} onValueChange={setReasoningModel}>
                  <AppSelectTrigger className="w-full h-8 text-xs">
                    <AppSelectValue placeholder="How should AI think?" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="gpt-4">Step-by-step thinking</AppSelectItem>
                    <AppSelectItem value="claude-3-opus">Deep analysis</AppSelectItem>
                    <AppSelectItem value="deepseek-r1">Advanced reasoning</AppSelectItem>
                    <AppSelectItem value="o1-preview">Expert problem solving</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

              {/* Creativity Level */}
              <div className="space-y-1.5">
                <AppLabel className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Creativity Level
                </AppLabel>
                <AppSelect value={temperature} onValueChange={setTemperature}>
                  <AppSelectTrigger className="w-full h-8 text-xs">
                    <AppSelectValue placeholder="Set creativity" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="0.0">Precise & Consistent</AppSelectItem>
                    <AppSelectItem value="0.3">Mostly Focused</AppSelectItem>
                    <AppSelectItem value="0.7">Balanced</AppSelectItem>
                    <AppSelectItem value="1.0">More Creative</AppSelectItem>
                    <AppSelectItem value="1.5">Very Creative</AppSelectItem>
                    <AppSelectItem value="custom">Custom</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
                {temperature === 'custom' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <AppLabel className="text-xs text-muted-foreground">Value</AppLabel>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{customTemperature.toFixed(1)}</span>
                    </div>
                    <AppSlider
                      min={0}
                      max={2}
                      step={0.1}
                      value={customTemperature}
                      onValueChange={setCustomTemperature}
                    />
                  </div>
                )}
              </div>

              {/* Max Characters */}
              <div className="space-y-1.5">
                <AppLabel className="text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Max Characters
                </AppLabel>
                <AppInput
                  type="number"
                  min={0}
                  value={maxChars}
                  onChange={(e) => setMaxChars(e.target.value)}
                  placeholder="Max characters"
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">Leave empty for unlimited.</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewPostPage
