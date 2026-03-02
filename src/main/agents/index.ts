/**
 * agents/index.ts — named agent definitions barrel.
 *
 * Definitions are plain exported constants. Registration is done explicitly
 * in bootstrapServices() via AgentRegistry.register(), following the same
 * pattern as TaskHandlerRegistry — visible, ordered, and test-isolation safe.
 */

export { StoryWriterAgent } from './StoryWriter'
export { TextCompleterAgent } from './TextCompleter'
export { ContentReviewAgent } from './ContentReview'
export { SummarizerAgent } from './Summarizer'
export { ToneAdjusterAgent } from './ToneAdjuster'
export { DemoAgent } from './DemoAgent'

export type { AgentDefinition, AgentDefinitionInfo } from './AgentDefinition'
export { toAgentDefinitionInfo } from './AgentDefinition'

export { executeAIAgentsStream } from './AgentExecutor'
export type { ExecutorInput } from './AgentExecutor'
export type { AgentStreamEvent, AgentRequest, AgentHistoryMessage } from './AgentTypes'
export { AgentRegistry } from './AgentRegistry'

import { StoryWriterAgent } from './StoryWriter'
import { TextCompleterAgent } from './TextCompleter'
import { ContentReviewAgent } from './ContentReview'
import { SummarizerAgent } from './Summarizer'
import { ToneAdjusterAgent } from './ToneAdjuster'
import type { AgentDefinition } from './AgentDefinition'

/**
 * All built-in agent definitions in display order.
 * Pass this to AgentRegistry.register() in bootstrapServices().
 */
export const ALL_AGENT_DEFINITIONS: AgentDefinition[] = [
  StoryWriterAgent,
  TextCompleterAgent,
  ContentReviewAgent,
  SummarizerAgent,
  ToneAdjusterAgent,
]
