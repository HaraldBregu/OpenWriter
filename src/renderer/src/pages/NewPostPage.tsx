import React, { useState } from 'react'
import { Plus, Send, Download, Eye, MoreHorizontal, X, Filter, Tag, Clock, Globe } from 'lucide-react'
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewPostPage: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([createBlock()])
  const [category, setCategory] = useState('technology')
  const [tags, setTags] = useState<string[]>(['AI', 'Writing'])
  const [visibility, setVisibility] = useState('public')
  const [tagInput, setTagInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  const handleChange = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  const handleDelete = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const handleAddBlock = () => {
    setBlocks(prev => [...prev, createBlock()])
  }

  const handleAddBlockAfter = (afterId: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterId)
      const newBlock = createBlock()
      return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
    })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput)) {
      setTags(prev => [...prev, tagInput])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold text-foreground">New Post</h1>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            type="button"
            variant="ghost"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            type="button"
          >
            <Send className="h-4 w-4" />
            Publish
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
              onReorder={setBlocks}
              className="flex flex-col gap-2"
            >
              {blocks.map(block => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isOnly={blocks.length === 1}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onAdd={handleAddBlockAfter}
                />
              ))}
            </Reorder.Group>

            {/* Add block */}
            <Button
              type="button"
              onClick={handleAddBlock}
              variant="outline"
              className="mt-1 w-full text-xs text-muted-foreground/50 hover:text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add block
            </Button>

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
                <Select value={category} onValueChange={setCategory}>
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
                    variant="secondary"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
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
                <RadioGroup value={visibility} onValueChange={setVisibility}>
                  {['public', 'private', 'draft'].map(option => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="text-sm font-normal cursor-pointer">
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
                  className="w-full"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
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
