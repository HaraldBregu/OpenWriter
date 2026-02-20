import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Eye, X, Filter, Tag, Clock, Globe, Share2 } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ContentBlock, createBlock, type Block } from '@/components/ContentBlock'
import { useAppDispatch, useAppSelector } from '../store'
import {
  selectPostById,
  updatePostBlocks,
  updatePostTitle,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility
} from '../store/postsSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()

  // Stable selector instance — created once per render cycle; safe because id
  // is stable for the lifetime of this mounted route.
  const post = useAppSelector(selectPostById(id ?? ''))

  const [tagInput, setTagInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  // Guard: if the post doesn't exist in Redux (e.g. navigated directly to a
  // stale URL), show a fallback rather than crashing.
  if (!post) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Post not found.</p>
      </div>
    )
  }

  const { blocks, category, tags, visibility } = post

  const handleChange = (blockId: string, content: string) => {
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }

  const handleDelete = (blockId: string) => {
    const updated = blocks.filter((b) => b.id !== blockId)
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }

  const handleAddBlockAfter = (afterId: string) => {
    const index = blocks.findIndex((b) => b.id === afterId)
    const newBlock: Block = createBlock()
    const updated = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]
    dispatch(updatePostBlocks({ postId: post.id, blocks: updated }))
  }

  const handleReorder = (reordered: Block[]) => {
    dispatch(updatePostBlocks({ postId: post.id, blocks: reordered }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      dispatch(updatePostTags({ postId: post.id, tags: [...tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    dispatch(updatePostTags({ postId: post.id, tags: tags.filter((t) => t !== tagToRemove) }))
  }

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
          <Button
            type="button"
            variant="outline"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            type="button"
            variant="outline"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <Filter className="h-4 w-4" />
          </Button>
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
              className="flex flex-col gap-2"
            >
              {blocks.map((block, index) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isOnly={blocks.length === 1}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onAdd={handleAddBlockAfter}
                  placeholder={`Block ${index + 1}`}
                />
              ))}
            </Reorder.Group>

          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-72 border-l border-border bg-muted/20 overflow-y-auto">
            <div className="p-5 flex flex-col gap-5">

              {/* Close button */}
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Post Settings
                </h3>
                <Button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) =>
                    dispatch(updatePostCategory({ postId: post.id, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="h-10"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Visibility
                </Label>
                <RadioGroup
                  value={visibility}
                  onValueChange={(value) =>
                    dispatch(updatePostVisibility({ postId: post.id, visibility: value }))
                  }
                >
                  {['public', 'private', 'draft'].map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={`${post.id}-${option}`} />
                      <Label htmlFor={`${post.id}-${option}`} className="text-sm font-normal cursor-pointer">
                        <span className="capitalize">{option}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Schedule */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </Label>
                <Input
                  type="datetime-local"
                  className="h-10"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full"
                >
                  Preview
                </Button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewPostPage
