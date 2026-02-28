/**
 * AIAgentTaskContext — pre-built context+hook bundles for each named AI agent
 * registered in the main process.
 *
 * Design notes:
 *  - Each agent gets its own context bundle (Provider + hook) created via
 *    createEntityTaskContext(), exactly like PersonalityTaskContext.
 *  - `buildSubmitInput` captures `agentId` from the factory closure so the
 *    main process always knows which registered agent to invoke.
 *  - No `buildSaveOptions` is provided because these agents do not auto-save;
 *    results are consumed by the calling component directly via `latestResponse`.
 *  - TSaveOptions / TSaveResult stubs satisfy the IEntityTaskService type
 *    constraint without enabling any persistence path in the context.
 *
 * Usage:
 *
 *   // 1. Mount the provider (inside <TaskProvider>)
 *   <StoryWriterTask.Provider service={new ElectronAIAgentTaskService('story-writer')}>
 *     {children}
 *   </StoryWriterTask.Provider>
 *
 *   // 2. Consume in a component
 *   const { submit, latestResponse, isStreaming, cancel } =
 *     useStoryWriterTask('session-id', systemPrompt, 'openai')
 */

import { createEntityTaskContext } from '@/contexts/EntityTaskContext'
import type { EntityTaskState, EntityChatMessage } from '@/contexts/EntityTaskContext'
import type { EntityTaskSubmitResult, EntityTaskSaveResult } from '@/services/IEntityTaskService'

export type { EntityChatMessage as AIAgentMessage }

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface AIAgentSubmitInput {
  readonly agentId: string
  readonly prompt: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
  readonly reasoning?: boolean
}

export interface AIAgentSubmitResult extends EntityTaskSubmitResult {
  readonly taskId: string
}

/**
 * AIAgentSaveOptions — nominal stub required by the IEntityTaskService type
 * constraint. AI agents in this context do not trigger auto-save, so this
 * type is never instantiated at runtime (no buildSaveOptions is provided).
 */
export interface AIAgentSaveOptions {
  readonly agentId: string
}

/**
 * AIAgentSaveResult — nominal stub satisfying EntityTaskSaveResult.
 * Never produced at runtime for these no-save agents.
 */
export interface AIAgentSaveResult extends EntityTaskSaveResult {
  readonly id: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * toDisplayName — converts a kebab-case agent ID to a PascalCase display name
 * with a 'Task' suffix for use in React DevTools and error messages.
 *
 * @example toDisplayName('story-writer') === 'StoryWriterTask'
 */
function toDisplayName(agentId: string): string {
  const pascal = agentId
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
  return `${pascal}Task`
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * createAIAgentContext — thin wrapper around createEntityTaskContext for a
 * single named AI agent. Call once at module level for each agent ID.
 *
 * The returned bundle exposes:
 *   Provider     — mount inside <TaskProvider> with a concrete service instance
 *   useEntityTask — hook for components that need to submit / stream / cancel
 *   Context      — raw React context (for advanced composition or testing)
 */
export function createAIAgentContext(agentId: string): ReturnType<
  typeof createEntityTaskContext<
    AIAgentSubmitInput,
    AIAgentSubmitResult,
    AIAgentSaveOptions,
    AIAgentSaveResult
  >
> {
  return createEntityTaskContext<
    AIAgentSubmitInput,
    AIAgentSubmitResult,
    AIAgentSaveOptions,
    AIAgentSaveResult
  >({
    displayName: toDisplayName(agentId),
    defaultProviderId: 'openai',
    taskType: 'ai-agent',

    /**
     * buildSubmitInput — `agentId` is captured from the factory closure so
     * every submit automatically carries the correct registered agent ID.
     */
    buildSubmitInput: (
      _entityId,
      prompt,
      systemPrompt,
      state: EntityTaskState<AIAgentSaveResult>,
      options,
    ): AIAgentSubmitInput => {
      const history = state.messages.map((m) => ({ role: m.role, content: m.content }))
      return {
        agentId,
        prompt,
        providerId: state.providerId,
        systemPrompt,
        messages: history,
        modelId: options.modelId ?? null,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        reasoning: options.reasoning,
      }
    },

    extractResultContent: (result: unknown): string => {
      if (result && typeof result === 'object' && 'content' in result) {
        return String((result as { content: unknown }).content)
      }
      return ''
    },

    // No buildSaveOptions — AI agents do not auto-save their output.
  })
}

// ---------------------------------------------------------------------------
// Pre-built context bundles — one per registered main-process agent
// ---------------------------------------------------------------------------

export const StoryWriterTask = createAIAgentContext('story-writer')
export const ContentReviewTask = createAIAgentContext('content-review')
export const SummarizerTask = createAIAgentContext('summarizer')
export const ToneAdjusterTask = createAIAgentContext('tone-adjuster')
export const TextCompleterTask = createAIAgentContext('text-completer')

// ---------------------------------------------------------------------------
// Convenience hooks — match the naming convention used across the codebase
// ---------------------------------------------------------------------------

export const useStoryWriterTask = StoryWriterTask.useEntityTask
export const useContentReviewTask = ContentReviewTask.useEntityTask
export const useSummarizerTask = SummarizerTask.useEntityTask
export const useToneAdjusterTask = ToneAdjusterTask.useEntityTask
export const useTextCompleterTask = TextCompleterTask.useEntityTask
