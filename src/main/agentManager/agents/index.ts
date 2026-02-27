/**
 * agents/index.ts — named agent definitions barrel.
 *
 * Definitions are plain exported constants. Registration is done explicitly
 * in bootstrapServices() via agentRegistry.register(), following the same
 * pattern as TaskHandlerRegistry — visible, ordered, and test-isolation safe.
 */

export { StoryWriterAgent } from './StoryWriter'
export { TextCompleterAgent } from './TextCompleter'
export { ContentReviewAgent } from './ContentReview'
export { SummarizerAgent } from './Summarizer'
export { ToneAdjusterAgent } from './ToneAdjuster'

import { StoryWriterAgent } from './StoryWriter'
import { TextCompleterAgent } from './TextCompleter'
import { ContentReviewAgent } from './ContentReview'
import { SummarizerAgent } from './Summarizer'
import { ToneAdjusterAgent } from './ToneAdjuster'
import type { AgentDefinition } from '../AgentDefinition'

/**
 * All built-in agent definitions in display order.
 * Pass this to agentRegistry.register() in bootstrapServices().
 */
export const ALL_AGENT_DEFINITIONS: AgentDefinition[] = [
  StoryWriterAgent,
  TextCompleterAgent,
  ContentReviewAgent,
  SummarizerAgent,
  ToneAdjusterAgent,
]
