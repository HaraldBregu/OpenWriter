/**
 * agents/index.ts — named agent definitions barrel.
 *
 * Definitions are plain exported constants. Registration is done explicitly
 * in bootstrapServices() via AIAgentsRegistry.register(), following the same
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
import type { AIAgentsDefinition } from '../AIAgentsDefinition'

/**
 * All built-in agent definitions in display order.
 * Pass this to AIAgentsRegistry.register() in bootstrapServices().
 */
export const ALL_AGENT_DEFINITIONS: AIAgentsDefinition[] = [
  StoryWriterAgent,
  TextCompleterAgent,
  ContentReviewAgent,
  SummarizerAgent,
  ToneAdjusterAgent,
]
