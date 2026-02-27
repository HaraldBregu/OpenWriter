/**
 * PersonalityTaskContext — thin adapter over EntityTaskContext.
 *
 * This file is the complete replacement for the original monolithic
 * PersonalityTaskContext.tsx. The entire hand-rolled store, event-routing
 * loop, action callbacks, and hook are now gone. This file only:
 *
 *   1. Defines the Personality-domain types (submit input, save options, etc.)
 *   2. Calls createEntityTaskContext() with domain-specific config
 *   3. Exports the provider, hook, and service interface under the
 *      existing public names so no call-site changes are required.
 *
 * Before:  ~500 LOC of duplicated store machinery
 * After:   ~120 LOC of domain-specific configuration
 *
 * The public API surface is backwards-compatible:
 *   - PersonalityTaskProvider  (same props)
 *   - usePersonalityTask(sectionId, systemPrompt, providerId, options)  (same return shape)
 */

import { loadPersonalityFiles } from '@/store/personalityFilesSlice'
import { createEntityTaskContext } from '@/contexts/EntityTaskContext'
import type { EntityTaskState, EntityChatMessage } from '@/contexts/EntityTaskContext'
import type {
  IEntityTaskService,
  EntityTaskSubmitResult,
  EntityTaskSaveResult,
} from '@/services/IEntityTaskService'

// Re-export for components that type-check against the message shape.
export type { EntityChatMessage as AIMessage }

// ---------------------------------------------------------------------------
// 1. Domain-specific types
// ---------------------------------------------------------------------------

/** Payload sent to the main process for a personality AI task. */
export interface PersonalitySubmitInput {
  readonly prompt: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly messages: ReadonlyArray<{ role: string; content: string }>
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
}

/** What the main process returns for a successful personality task submit. */
export interface PersonalitySubmitResult extends EntityTaskSubmitResult {
  readonly taskId: string
}

/** Options passed to the personality save call. */
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

/** What the workspace returns after saving a personality file. */
export interface PersonalitySaveResult extends EntityTaskSaveResult {
  readonly id: string
}

// ---------------------------------------------------------------------------
// 2. Service interface — re-export the generic one narrowed to this domain
// ---------------------------------------------------------------------------

/**
 * IPersonalityTaskService — the interface injected into PersonalityTaskProvider.
 * This replaces the hand-written interface in IPersonalityTaskService.ts with a
 * narrowed alias of the generic interface; no concrete code changes needed.
 */
export type IPersonalityTaskService = IEntityTaskService<
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult
>

// ---------------------------------------------------------------------------
// 3. createEntityTaskContext call — all domain logic lives here as pure config
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

  // -------------------------------------------------------------------------
  // buildSubmitInput — maps hook arguments to the IPC payload shape.
  // This is the only place that knows about the Personality domain's wire format.
  // -------------------------------------------------------------------------
  buildSubmitInput: (
    entityId,           // sectionId
    prompt,
    systemPrompt,
    state: EntityTaskState<PersonalitySaveResult>,
    options,
  ): PersonalitySubmitInput => {
    // Reconstruct the conversation history from the accumulated messages.
    const history = state.messages.map((m) => ({ role: m.role, content: m.content }))
    return {
      prompt,
      providerId: state.providerId,
      systemPrompt,
      // Include the full history so the model has context.
      messages: history,
      modelId: options.modelId ?? null,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    }
  },

  // -------------------------------------------------------------------------
  // extractResultContent — pulls the text out of the main-process result.
  // The existing handler sends { content: string; tokenCount: number }.
  // -------------------------------------------------------------------------
  extractResultContent: (result: unknown): string => {
    if (result && typeof result === 'object' && 'content' in result) {
      return String((result as { content: unknown }).content)
    }
    return ''
  },

  // -------------------------------------------------------------------------
  // buildSaveOptions — constructs the workspace.savePersonality payload.
  // Returning null suppresses the save (e.g. empty conversation).
  // -------------------------------------------------------------------------
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
        // The model name is resolved at submit time and stored on state.
        model: state.modelId ?? import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        reasoning: state.reasoning,
      },
    }
  },

  // -------------------------------------------------------------------------
  // completionHandler — post-save Redux side effects.
  // -------------------------------------------------------------------------
  completionHandler: {
    onSaved: (_entityId, _result, dispatch) => {
      // Refresh the sidebar's personality file list after a successful save.
      dispatch(loadPersonalityFiles())
    },
  },
})

// ---------------------------------------------------------------------------
// 4. Exports — preserve the existing public API surface
// ---------------------------------------------------------------------------

export { PersonalityTaskProvider, usePersonalityTask, PersonalityTaskContext }
