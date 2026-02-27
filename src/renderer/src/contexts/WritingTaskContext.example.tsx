/**
 * WritingTaskContext — example second domain built on EntityTaskContext.
 *
 * This file demonstrates that a completely different domain (AI-assisted
 * writing blocks) can get the same per-entity streaming chat behaviour by
 * calling createEntityTaskContext() with different types and config.
 *
 * Demonstrates:
 *  - Different TSubmitInput / TSaveOptions shapes
 *  - Domain-specific buildSubmitInput and buildSaveOptions
 *  - A completionHandler that dispatches a different Redux action
 *  - The Provider and hook names are domain-specific; the generic machinery is shared
 *
 * NOTE: This file intentionally ends in .example.tsx — it is a reference
 * implementation, not production code. Rename to WritingTaskContext.tsx when
 * you are ready to integrate.
 */

import { loadWritingItems } from '@/store/writingItemsSlice'
import { createEntityTaskContext } from '@/contexts/EntityTaskContext'
import type { EntityTaskState } from '@/contexts/EntityTaskContext'
import type {
  IEntityTaskService,
  EntityTaskSubmitResult,
  EntityTaskSaveResult,
} from '@/services/IEntityTaskService'

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface WritingSubmitInput {
  readonly writingId: string
  readonly prompt: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly existingContent: string
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
}

export interface WritingSubmitResult extends EntityTaskSubmitResult {
  readonly taskId: string
}

export interface WritingSaveOptions {
  readonly writingId: string
  readonly content: string
  readonly providerId: string
  readonly model: string
  readonly temperature?: number
  readonly maxTokens?: number | null
}

export interface WritingSaveResult extends EntityTaskSaveResult {
  readonly id: string
  readonly path: string
  readonly savedAt: number
}

// Service interface — the same generic contract, just narrowed to Writing types.
export type IWritingTaskService = IEntityTaskService<
  WritingSubmitInput,
  WritingSubmitResult,
  WritingSaveOptions,
  WritingSaveResult
>

// ---------------------------------------------------------------------------
// Context bundle
// ---------------------------------------------------------------------------

const {
  Provider: WritingTaskProvider,
  useEntityTask: useWritingTask,
  Context: WritingTaskContext,
} = createEntityTaskContext<
  WritingSubmitInput,
  WritingSubmitResult,
  WritingSaveOptions,
  WritingSaveResult
>({
  displayName: 'WritingTask',
  defaultProviderId: 'openai',
  taskType: 'ai-writing',

  buildSubmitInput: (
    entityId,         // writingId
    prompt,
    systemPrompt,
    state: EntityTaskState<WritingSaveResult>,
    options,
  ): WritingSubmitInput => ({
    writingId: entityId,
    prompt,
    providerId: state.providerId,
    systemPrompt,
    // Include the last AI response as existing content so the model can continue.
    existingContent: state.latestResponse,
    modelId: options.modelId ?? null,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  }),

  extractResultContent: (result: unknown): string => {
    const r = result as { generatedText?: string; content?: string } | null
    return r?.generatedText ?? r?.content ?? ''
  },

  buildSaveOptions: (
    entityId,
    state: EntityTaskState<WritingSaveResult>,
    finalContent,
  ): WritingSaveOptions | null => {
    if (!finalContent) return null
    return {
      writingId: entityId,
      content: finalContent,
      providerId: state.providerId,
      model: state.modelId ?? import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: state.temperature,
      maxTokens: state.maxTokens,
    }
  },

  completionHandler: {
    onSaved: (_entityId, _result, dispatch) => {
      // Reload the writing items list in the sidebar.
      dispatch(loadWritingItems())
    },
  },
})

export { WritingTaskProvider, useWritingTask, WritingTaskContext }
