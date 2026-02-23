import React, { useState, useCallback } from 'react'
import { Settings2, X, Cpu, Brain, Zap, Sparkles, Save, PenLine } from 'lucide-react'
import {
  AppLabel,
  AppButton,
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppTextarea
} from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import { saveOutputItem, selectOutputLoading, selectOutputError } from '../store/outputSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewWritingPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const isSaving = useAppSelector(selectOutputLoading)
  const saveError = useAppSelector(selectOutputError)

  // Content state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(true)

  // AI settings state
  const [model, setModel] = useState('claude-sonnet-4.5')
  const [temperature, setTemperature] = useState('0.7')
  const [maxTokens, setMaxTokens] = useState('4096')
  const [reasoning, setReasoning] = useState(false)

  // Derived
  const canSave = title.trim().length > 0 || content.trim().length > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return

    await dispatch(
      saveOutputItem({
        type: 'writings',
        title: title.trim() || 'Untitled Writing',
        content,
        category: 'writing',
        tags: [],
        visibility: 'private',
        provider: 'manual',
        model,
        temperature: parseFloat(temperature),
        maxTokens: maxTokens === 'none' ? null : parseInt(maxTokens, 10),
        reasoning
      })
    )
  }, [canSave, title, content, model, temperature, maxTokens, reasoning, dispatch])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Writing"
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
            {isSaving ? 'Saving...' : 'Save'}
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

      <div className="flex flex-1 overflow-hidden bg-background">

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <AppTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="w-full min-h-[60vh] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 text-base leading-relaxed p-0"
            />
          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-border bg-muted/20 overflow-y-auto shrink-0">
            <div className="p-5 flex flex-col gap-5">

              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings
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

              {/* AI Assistant */}
              <div className="flex flex-col gap-2">
                <AppLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5" />
                  AI Assistant
                </AppLabel>
                <AppSelect value={model} onValueChange={setModel}>
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
                  Reasoning
                </AppLabel>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Extended thinking</span>
                    <span className="text-xs text-muted-foreground">Deeper analysis before responding</span>
                  </div>
                  <AppButton
                    type="button"
                    variant={reasoning ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReasoning(!reasoning)}
                  >
                    {reasoning ? 'On' : 'Off'}
                  </AppButton>
                </div>
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
                    <AppSelectItem value="none">No limit</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewWritingPage
