import React, { useState, useCallback } from 'react'
import { Save, StickyNote, Settings2, X, Zap, Sparkles } from 'lucide-react'
import {
  AppButton,
  AppTextarea,
  AppLabel,
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSlider,
  AppInput,
} from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import { saveOutputItem, selectOutputLoading, selectOutputError } from '../store/outputSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewNotePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const isSaving = useAppSelector(selectOutputLoading)
  const saveError = useAppSelector(selectOutputError)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false)
  const [creativity, setCreativity] = useState('0.7')
  const [customCreativity, setCustomCreativity] = useState(1.0)
  const [maxChars, setMaxChars] = useState('')

  const canSave = title.trim().length > 0 || content.trim().length > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return

    await dispatch(
      saveOutputItem({
        type: 'notes',
        title: title.trim() || 'Untitled Note',
        content,
        category: 'note',
        tags: [],
        visibility: 'private',
        provider: 'manual',
        model: '',
        temperature: 0,
        maxTokens: null,
        reasoning: false
      })
    )
  }, [canSave, title, content, dispatch])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StickyNote className="h-4 w-4 text-amber-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {saveError && (
            <span className="text-xs text-destructive max-w-48 truncate" title={saveError}>
              {saveError}
            </span>
          )}
          <AppButton
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </AppButton>
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

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-10">
            <AppTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Capture a quick thought..."
              className="w-full min-h-[50vh] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 text-base leading-relaxed p-0"
              autoFocus
            />
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

              {/* Creativity Level */}
              <div className="space-y-1.5">
                <AppLabel className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Creativity Level
                </AppLabel>
                <AppSelect value={creativity} onValueChange={setCreativity}>
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
                {creativity === 'custom' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <AppLabel className="text-xs text-muted-foreground">Value</AppLabel>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{customCreativity.toFixed(1)}</span>
                    </div>
                    <AppSlider
                      min={0}
                      max={2}
                      step={0.1}
                      value={customCreativity}
                      onValueChange={setCustomCreativity}
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

export default NewNotePage
