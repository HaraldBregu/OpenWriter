import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { ContentBlock, createBlock, type Block } from '@/components/ContentBlock'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectPostById,
  updatePostBlocks,
  updatePostTitle,
  deletePost
} from '../store/postsSlice'
import { saveOutputItem } from '@/store/outputSlice'
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
  const [aiSettings, setAiSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)

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
      // Verify workspace is set before attempting save
      const workspace = await window.api.workspaceGetCurrent()
      if (!workspace) {
        throw new Error('No workspace selected. Please open a workspace first.')
      }

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
          <PersonalitySettingsPanel
            settings={aiSettings}
            onSettingsChange={setAiSettings}
          />
        )}
      </div>
    </div>
  )
}

export default NewPostPage
