import { loadPersonalityFiles } from '@/store/personalityFilesSlice'
import { createEntityTaskContext } from '@/contexts/EntityTaskContext'
import type { EntityTaskState, EntityChatMessage } from '@/contexts/EntityTaskContext'
import type {
  IEntityTaskService,
  EntityTaskSubmitResult,
  EntityTaskSaveResult,
} from '@/services/IEntityTaskService'

export type { EntityChatMessage as AIMessage }

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PersonalitySubmitInput {
  readonly prompt: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly messages: ReadonlyArray<{ role: string; content: string }>
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
}

export interface PersonalitySubmitResult extends EntityTaskSubmitResult {
  readonly taskId: string
}

export interface PersonalitySaveOptions {
  readonly sectionId: string
  readonly content: string
  readonly metadata: {
    readonly title: string
    readonly provider: string
    readonly model: string
    readonly temperature?: number
    readonly maxTokens?: number | null
    readonly reasoning?: boolean
  }
}

export interface PersonalitySaveResult extends EntityTaskSaveResult {
  readonly id: string
}

export type IPersonalityTaskService = IEntityTaskService<
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult
>

// ---------------------------------------------------------------------------
// Context bundle — thin adapter over the generic EntityTaskContext
// ---------------------------------------------------------------------------

const {
  Provider: PersonalityTaskProvider,
  useEntityTask: usePersonalityTask,
  Context: PersonalityTaskContext,
} = createEntityTaskContext<
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult
>({
  displayName: 'PersonalityTask',
  defaultProviderId: 'openai',
  taskType: 'ai-chat',

  buildSubmitInput: (
    _entityId,
    prompt,
    systemPrompt,
    state: EntityTaskState<PersonalitySaveResult>,
    options,
  ): PersonalitySubmitInput => {
    const history = state.messages.map((m) => ({ role: m.role, content: m.content }))
    return {
      prompt,
      providerId: state.providerId,
      systemPrompt,
      messages: history,
      modelId: options.modelId ?? null,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    }
  },

  extractResultContent: (result: unknown): string => {
    if (result && typeof result === 'object' && 'content' in result) {
      return String((result as { content: unknown }).content)
    }
    return ''
  },

  buildSaveOptions: (
    entityId,
    state: EntityTaskState<PersonalitySaveResult>,
    finalContent,
  ): PersonalitySaveOptions | null => {
    if (!finalContent || state.messages.length === 0) return null

    return {
      sectionId: entityId,
      content: finalContent,
      metadata: {
        title: entityId,
        provider: state.providerId,
        model: state.modelId ?? DEFAULT_MODEL,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        reasoning: state.reasoning,
      },
    }
  },

  completionHandler: {
    onSaved: (_entityId, _result, dispatch) => {
      dispatch(loadPersonalityFiles())
    },
  },
})

export { PersonalityTaskProvider, usePersonalityTask, PersonalityTaskContext }
