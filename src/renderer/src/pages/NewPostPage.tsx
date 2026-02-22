import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Eye, X, Settings2, Share2, MoreHorizontal, Copy, Trash2, Brain, Cpu, Zap, Database, Sparkles } from 'lucide-react'
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
} from '@/components/app'
import { ContentBlock, createBlock, type Block } from '@/components/ContentBlock'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectPostById,
  updatePostBlocks,
  updatePostTitle,
  deletePost
} from '../store/postsSlice'

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

  // AI Settings state
  const [ragEnabled, setRagEnabled] = useState(false)
  const [reasoningModel, setReasoningModel] = useState('gpt-4')
  const [modelName, setModelName] = useState('claude-sonnet-4.5')
  const [temperature, setTemperature] = useState('0.7')
  const [maxTokens, setMaxTokens] = useState('4096')

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
          <div className="w-96 border-l border-border bg-muted/20 overflow-y-auto">
            <div className="p-5 flex flex-col gap-5">

              {/* Close button */}
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  AI Settings
                </h3>
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

              {/* Use Knowledge Base */}
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-3.5 w-3.5" />
                  Use Your Documents
                </AppLabel>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Search my files</span>
                    <span className="text-xs text-muted-foreground">Include your documents in responses</span>
                  </div>
                  <AppButton
                    type="button"
                    variant={ragEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRagEnabled(!ragEnabled)}
                  >
                    {ragEnabled ? 'On' : 'Off'}
                  </AppButton>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5" />
                  AI Assistant
                </AppLabel>
                <AppSelect value={modelName} onValueChange={setModelName}>
                  <AppSelectTrigger>
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
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" />
                  Thinking Style
                </AppLabel>
                <AppSelect value={reasoningModel} onValueChange={setReasoningModel}>
                  <AppSelectTrigger>
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
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Creativity Level
                </AppLabel>
                <AppSelect value={temperature} onValueChange={setTemperature}>
                  <AppSelectTrigger>
                    <AppSelectValue placeholder="Set creativity" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="0.0">Precise & Consistent</AppSelectItem>
                    <AppSelectItem value="0.3">Mostly Focused</AppSelectItem>
                    <AppSelectItem value="0.7">Balanced</AppSelectItem>
                    <AppSelectItem value="1.0">More Creative</AppSelectItem>
                    <AppSelectItem value="1.5">Very Creative</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

              {/* Response Length */}
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Response Length
                </AppLabel>
                <AppSelect value={maxTokens} onValueChange={setMaxTokens}>
                  <AppSelectTrigger>
                    <AppSelectValue placeholder="How long should responses be?" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="1024">Brief</AppSelectItem>
                    <AppSelectItem value="2048">Moderate</AppSelectItem>
                    <AppSelectItem value="4096">Detailed</AppSelectItem>
                    <AppSelectItem value="8192">Comprehensive</AppSelectItem>
                    <AppSelectItem value="16384">Very Detailed</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Tip:</strong> These settings help customize how the AI assists you with writing.
                </p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewPostPage
