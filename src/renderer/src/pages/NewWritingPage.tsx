import React, { useState, useCallback } from 'react'
import { Settings2, Save, PenLine } from 'lucide-react'
import {
  AppButton,
  AppTextarea,
} from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import { saveOutputItem, selectOutputLoading, selectOutputError } from '../store/outputSlice'
import {
  PersonalitySettingsPanel,
  DEFAULT_INFERENCE_SETTINGS,
  type InferenceSettings,
} from '@/components/personality/PersonalitySettingsSheet'

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
  const [aiSettings, setAiSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)

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
        provider: aiSettings.providerId,
        model: aiSettings.modelId,
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.maxTokens,
        reasoning: aiSettings.reasoning
      })
    )
  }, [canSave, title, content, aiSettings, dispatch])

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
